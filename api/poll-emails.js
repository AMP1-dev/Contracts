import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nblgkcnsjziezqdiozxo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ibGdrY25zanppZXpxZGlvenhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NjgzNTgsImV4cCI6MjEwNTM0NDM1OH0.pqa4cMC1wSv-5yQltbTOkiGR33yjKBMwXugqWRxFzOQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  // Configurações CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let imapConfig = req.body?.imapConfig || {};

    // Se as credenciais não vieram no body, busca das configurações salvas no banco
    if (!imapConfig.host || !imapConfig.user || !imapConfig.pass) {
      const { data: configRow } = await supabase
        .from('projetos')
        .select('dados_extra')
        .eq('id', '__system_company_config__')
        .maybeSingle();

      if (configRow?.dados_extra) {
        const extra = configRow.dados_extra.company_config || configRow.dados_extra;
        imapConfig = {
          host: extra.imapHost || extra.smtpHost || 'imap.uni5.net',
          port: extra.imapPort || 993,
          user: extra.imapUser || extra.smtpUser || '',
          pass: extra.imapPass || extra.smtpPass || '',
          useSSL: extra.imapUseSSL !== false
        };
      }
    }

    // Se ainda não temos usuário ou senha, avisa o usuário para configurar
    if (!imapConfig.user || !imapConfig.pass) {
      return res.status(200).json({
        ok: false,
        requiresConfig: true,
        message: 'Credenciais de e-mail (IMAP) ainda não configuradas. Acesse a aba Configurações > E-mail (IMAP) para informar seu usuário e senha.'
      });
    }

    const host = String(imapConfig.host || 'mail.amp.ia.br').trim();
    const port = Number(imapConfig.port) || 993;
    const user = String(imapConfig.user).trim();
    const pass = String(imapConfig.pass);
    const useSSL = imapConfig.useSSL !== false;

    console.log(`[POLL] Conectando ao servidor IMAP: ${host}:${port} (${user})...`);

    const client = new ImapFlow({
      host,
      port,
      secure: useSSL,
      auth: { user, pass },
      logger: false,
      clientInfo: { name: 'AMP Demanda Poller', version: '1.0.0' }
    });

    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    const novosProcessados = [];

    try {
      // 1. Busca mensagens não lidas
      let uids = await client.search({ seen: false }, { uid: true });
      let isCheckingRecent = false;

      // Se não houver não lidas, busca as 5 mais recentes da caixa (para não perder nada se o usuário já abriu o e-mail no webmail)
      if (!uids || uids.length === 0) {
        console.log('[POLL] Nenhuma mensagem não lida encontrada. Verificando as 5 mensagens mais recentes da caixa...');
        const allUids = await client.search({ all: true }, { uid: true });
        uids = (allUids || []).slice(-5);
        isCheckingRecent = true;
      } else {
        uids = uids.slice(-10); // Limita às 10 mais recentes
      }

      console.log(`[POLL] ${uids.length} mensagem(ns) selecionada(s) para análise.`);

      for (const uid of uids) {
        try {
          const msgMeta = await client.fetchOne(uid, { envelope: true, size: true }, { uid: true });
          if (!msgMeta || !msgMeta.envelope) continue;

          const messageId = msgMeta.envelope.messageId || `uid-${uid}`;
          const remetente = msgMeta.envelope.from?.[0]?.address || 'desconhecido';
          const assunto = msgMeta.envelope.subject || '(sem assunto)';
          const dataEmail = msgMeta.envelope.date ? new Date(msgMeta.envelope.date).toISOString() : new Date().toISOString();

          // Idempotência: verifica se este message_id já foi salvo
          const { data: existente } = await supabase
            .from('emails_processados')
            .select('id')
            .eq('message_id', messageId)
            .maybeSingle();

          if (existente) {
            console.log(`[POLL] Mensagem já registrada anteriormente: "${assunto}" (${messageId}). Pulando.`);
            continue;
          }

          // Baixa o conteúdo completo da mensagem
          const fullMessage = await client.download(uid, undefined, { uid: true });
          const parsed = await simpleParser(fullMessage.content);

          let anexoNome = null;
          if (parsed.attachments && parsed.attachments.length > 0) {
            anexoNome = parsed.attachments.map(a => a.filename).filter(Boolean).join(', ');
          }

          // Analisa se o assunto ou corpo contém indicadores de Sebrae / OS / Contrato / RAE / CO
          const textoCompleto = `${assunto} ${parsed.text || ''}`.toLowerCase();
          const isDemanda = (
            textoCompleto.includes('sebrae') ||
            textoCompleto.includes('ordem de serviço') ||
            textoCompleto.includes('demanda') ||
            textoCompleto.includes('contrato') ||
            textoCompleto.includes('consultoria') ||
            textoCompleto.includes('foco') ||
            textoCompleto.includes('rae') ||
            textoCompleto.includes('co-') ||
            !isCheckingRecent // Se foi e-mail não lido direto, registra
          );

          if (isDemanda) {
            // Extrai dados para criação do projeto
            const raeMatch = assunto.match(/(?:nº|n°|rae|os|co)[\s:]*([0-9\/\-]+)/i);
            const codigoRae = raeMatch ? raeMatch[1] : null;

            let clienteNome = null;
            if (assunto.includes(' - ')) {
              const parts = assunto.split(' - ');
              clienteNome = parts[parts.length - 1].trim();
            }

            // Insere na tabela de emails_processados
            const { data: emailReg, error: errEmail } = await supabase
              .from('emails_processados')
              .insert([{
                message_id: messageId,
                remetente,
                assunto,
                anexo_nome: anexoNome,
                status: 'recebido',
                criado_em: dataEmail
              }])
              .select();

            // Cria automaticamente um card em projetos no Kanban
            if (clienteNome || codigoRae) {
              const projetoId = `email-${Date.now()}-${uid}`;
              await supabase.from('projetos').insert([{
                id: projetoId,
                nome_cliente: clienteNome || `Demanda via E-mail (${assunto.slice(0, 30)}...)`,
                razao_social: clienteNome || `Demanda via E-mail`,
                codigo_rae: codigoRae,
                status: 'novo_contrato',
                solucao_contratada: 'Consultoria Sebrae Capturada por E-mail',
                programa: 'Consultoria Sebrae',
                modalidade: 'Remoto',
                observacoes: `Capturado automaticamente do e-mail de ${remetente} em ${new Date().toLocaleDateString('pt-BR')}. Assunto: ${assunto}`,
                criado_em: dataEmail,
                atualizado_em: new Date().toISOString()
              }]);
            }

            novosProcessados.push({
              uid,
              remetente,
              assunto,
              anexoNome,
              status: 'capturado'
            });
            console.log(`[POLL] ✅ Novo e-mail capturado com sucesso: "${assunto}"`);
          }
        } catch (msgErr) {
          console.error(`[POLL] Erro ao processar mensagem UID ${uid}:`, msgErr);
        }
      }
    } finally {
      lock.release();
      await client.logout();
    }

    return res.status(200).json({
      ok: true,
      novosContados: novosProcessados.length,
      emailsCapturados: novosProcessados,
      message: novosProcessados.length > 0 
        ? `Sucesso! ${novosProcessados.length} nova(s) demanda(s) de e-mail capturada(s) e enviada(s) para o sistema.`
        : 'Caixa verificada com sucesso! Nenhuma nova demanda pendente no momento.'
    });

  } catch (err) {
    console.error('[POLL] Erro geral ao sincronizar:', err);
    return res.status(500).json({
      ok: false,
      error: `Erro ao conectar e sincronizar e-mails: ${err.message || String(err)}`
    });
  }
}

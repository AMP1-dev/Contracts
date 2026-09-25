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
    let extraConfig = {};

    // Busca das configurações salvas no banco
    const { data: configRow } = await supabase
      .from('projetos')
      .select('dados_extra')
      .eq('id', '__system_company_config__')
      .maybeSingle();

    if (configRow?.dados_extra) {
      extraConfig = configRow.dados_extra.company_config || configRow.dados_extra;
      if (!imapConfig.host || !imapConfig.user || !imapConfig.pass) {
        imapConfig = {
          host: extraConfig.imapHost || extraConfig.smtpHost || 'imap.uni5.net',
          port: extraConfig.imapPort || 993,
          user: extraConfig.imapUser || extraConfig.smtpUser || '',
          pass: extraConfig.imapPass || extraConfig.smtpPass || '',
          useSSL: extraConfig.imapUseSSL !== false
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
          let parsedPdfData = null;

          if (parsed.attachments && parsed.attachments.length > 0) {
            anexoNome = parsed.attachments.map(a => a.filename).filter(Boolean).join(', ');

            // Procura anexo PDF de Ordem de Serviço para extrair dados reais do cliente
            const osPdfAttachment = parsed.attachments.find(a => 
              a.filename && (a.filename.toLowerCase().endsWith('.pdf') || a.contentType === 'application/pdf') &&
              !a.filename.toLowerCase().includes('orienta') && !a.filename.toLowerCase().includes('reembolso')
            ) || parsed.attachments.find(a => a.filename && a.filename.toLowerCase().endsWith('.pdf'));

            if (osPdfAttachment && osPdfAttachment.content) {
              try {
                const { PDFParse } = await import('pdf-parse');
                const p = new PDFParse({ data: osPdfAttachment.content });
                const pdfRes = await p.getText();
                const pdfText = pdfRes?.text || '';

                if (pdfText) {
                  const osMatch = pdfText.match(/(?:N[º°]?\s*ORDEM\s*SERVIÇO|Ordem\s*de\s*Serviço\s*n[º°]?)\s*[:\s]*([0-9\/\-]+)/i);
                  const sgfMatch = pdfText.match(/CÓDIGO\s*SGF\s*[:\s]*([A-Z0-9]+)/i);
                  const gestorMatch = pdfText.match(/GESTOR\s*RESPONSÁVEL\s*[:\s]*([A-Z\s]+?)(?=\s*E-MAIL|\s*CÓDIGO|$)/i);
                  const emailGestorMatch = pdfText.match(/E-MAIL\s*[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
                  const produtoMatch = pdfText.match(/PRODUTO\s*APLICADO\s*[:\s]*([^]+?)(?=\s*OBJETO|\s*DADOS DO|$)/i);
                  const raeMatch = pdfText.match(/RAE\s*[:\s]*([0-9]+)/i);
                  const clienteMatch = pdfText.match(/CLIENTE\s*[:\s]*([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\-]+?)(?=\s*CONTATO|\s*E-MAIL|\s*VIGÊNCIA|$)/i);
                  const empresaMatch = pdfText.match(/EMPRESA\s*[:\s]*([^]+?)(?=\s*CLIENTE|\s*RAE|\s*CONTATO|$)/i);
                  const contatoMatch = pdfText.match(/CONTATO\s*[:\s]*([0-9\(\)\s\-]+)/i);
                  const emailClienteMatch = pdfText.match(/E-MAIL\s*[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
                  const valorMatch = pdfText.match(/VALOR\s*(?:TOTAL\s*DA\s*ORDEM\s*DE\s*SERVIÇO|DA\s*PRESTAÇÃO\s*DE\s*SERVIÇOS)\s*[:\s]*R\$\s*([0-9.,]+)/i);
                  const dataPrevistaMatch = pdfText.match(/DATA\s*PREVISTA\s*PARA\s*EXECUÇÃO\s*[:\s]*([0-9\/]+)/i);

                  let cleanEmailCliente = null;
                  if (emailClienteMatch && emailClienteMatch.length > 1) {
                    cleanEmailCliente = emailClienteMatch[1].replace(/^E-MAIL:\s*/i, '').trim();
                  }

                  parsedPdfData = {
                    osNumber: osMatch ? osMatch[1].trim() : null,
                    sgf: sgfMatch ? sgfMatch[1].trim() : null,
                    gestor: gestorMatch ? gestorMatch[1].trim() : null,
                    emailGestor: emailGestorMatch ? emailGestorMatch[1].trim() : null,
                    produto: produtoMatch ? produtoMatch[1].trim().replace(/\s+/g, ' ') : null,
                    rae: raeMatch ? raeMatch[1].trim() : null,
                    clienteNome: clienteMatch ? clienteMatch[1].trim() : null,
                    empresa: empresaMatch ? empresaMatch[1].trim().replace(/\s+/g, ' ') : null,
                    contato: contatoMatch ? contatoMatch[1].trim() : null,
                    emailCliente: cleanEmailCliente,
                    valor: valorMatch ? parseFloat(valorMatch[1].replace('.', '').replace(',', '.')) : 170.0,
                    dataPrevista: dataPrevistaMatch ? dataPrevistaMatch[1].trim() : null
                  };
                  console.log(`[POLL] 📄 PDF analisado com sucesso! Cliente: ${parsedPdfData.clienteNome}, RAE: ${parsedPdfData.rae}`);
                }
              } catch (pdfErr) {
                console.error('[POLL] Erro ao extrair texto do PDF:', pdfErr.message);
              }
            }
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
            const codigoRae = parsedPdfData?.rae || (raeMatch ? raeMatch[1] : null);

            let clienteNome = parsedPdfData?.clienteNome || null;
            if (!clienteNome && assunto.includes(' - ')) {
              const parts = assunto.split(' - ');
              const lastPart = parts[parts.length - 1].trim();
              if (!lastPart.toUpperCase().includes('AMP DO BRASIL') && !lastPart.toUpperCase().includes('SOLUCOES')) {
                clienteNome = lastPart;
              }
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

            // Cria automaticamente um card em projetos no Kanban com dados reais
            if (clienteNome || codigoRae) {
              const projetoId = `email-${Date.now()}-${uid}`;
              await supabase.from('projetos').insert([{
                id: projetoId,
                nome_cliente: clienteNome || `Demanda via E-mail (${assunto.slice(0, 30)}...)`,
                razao_social: parsedPdfData?.empresa || clienteNome || `Demanda via E-mail`,
                nome_fantasia: clienteNome || null,
                codigo_rae: codigoRae,
                telefone: parsedPdfData?.contato || null,
                celular: parsedPdfData?.contato || null,
                email_cliente: parsedPdfData?.emailCliente || null,
                status: 'novo_contrato',
                solucao_contratada: parsedPdfData?.produto || 'Consultoria Sebrae Capturada por E-mail',
                programa: 'Consultoria Sebrae',
                modalidade: 'À Distância (Online)',
                horas_contratadas: 1,
                horas_realizadas: 0,
                valor_consultoria: parsedPdfData?.valor || 170.00,
                data_prevista_inicio: parsedPdfData?.dataPrevista || null,
                data_prevista_fim: parsedPdfData?.dataPrevista || null,
                observacoes: `Capturado automaticamente do e-mail de ${remetente}. Assunto: ${assunto} | Gestor: ${parsedPdfData?.gestor || 'Sebrae'}`,
                dados_extra: {
                  os_number: parsedPdfData?.osNumber || null,
                  sgf: parsedPdfData?.sgf || null,
                  gestor: parsedPdfData?.gestor || null,
                  email_gestor: parsedPdfData?.emailGestor || null,
                  anexo_pdf: anexoNome
                },
                criado_em: dataEmail,
                atualizado_em: new Date().toISOString()
              }]);

              // Envia notificação imediata via Telegram ao capturar a demanda
              const telegramToken = extraConfig?.telegramBotToken;
              const telegramChat = extraConfig?.telegramChatId;
              if (telegramToken && telegramChat) {
                try {
                  const tgText = `🔔 <b>Nova Ordem de Serviço Sebrae Recebida!</b>\n\n` +
                    `📋 <b>OS:</b> ${parsedPdfData?.osNumber || codigoRae || 'N/A'}\n` +
                    `👤 <b>Cliente:</b> ${clienteNome || 'Cliente Sebrae'}\n` +
                    `🏢 <b>Empresa:</b> ${parsedPdfData?.empresa || 'MEI / Empresa'}\n` +
                    `🔢 <b>RAE:</b> ${codigoRae || 'N/A'}\n` +
                    `📞 <b>Contato:</b> ${parsedPdfData?.contato || 'N/A'}\n` +
                    `💼 <b>Solução:</b> ${parsedPdfData?.produto || 'Consultoria Sebrae'}\n` +
                    `💰 <b>Valor:</b> R$ ${(parsedPdfData?.valor || 170).toFixed(2)}\n\n` +
                    `<i>Acesse o Kanban para visualizar a demanda!</i>`;

                  await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: telegramChat,
                      text: tgText,
                      parse_mode: 'HTML'
                    })
                  });
                  console.log('[POLL] 📲 Notificação Telegram enviada com sucesso no recebimento do e-mail!');
                } catch (tErr) {
                  console.error('[POLL] Erro ao enviar notificação Telegram:', tErr.message);
                }
              }
            }

            novosProcessados.push({
              uid,
              remetente,
              assunto,
              clienteNome,
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

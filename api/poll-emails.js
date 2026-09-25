if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
    }
  };
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {};
}

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
    let lastPdfError = null;

    try {
      // 1. Busca mensagens não lidas
      let uids = await client.search({ seen: false }, { uid: true });
      let isCheckingRecent = false;

      // Se não houver não lidas ou for busca forçada/reprocessamento, busca as 30 mais recentes da caixa
      if (!uids || uids.length === 0 || req.body?.force || req.body?.reprocessMessageId) {
        console.log('[POLL] Verificando as 30 mensagens mais recentes da caixa...');
        const allUids = await client.search({ all: true }, { uid: true });
        uids = (allUids || []).slice(-30);
        isCheckingRecent = true;
      } else {
        uids = uids.slice(-20); // Limita às 20 mais recentes
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

          const isTargetReprocess = req.body?.reprocessMessageId && (
            req.body.reprocessMessageId === messageId || 
            req.body.reprocessMessageId === `uid-${uid}`
          );

          // Idempotência: verifica se este message_id já foi salvo
          const { data: existente } = await supabase
            .from('emails_processados')
            .select('id, status')
            .eq('message_id', messageId)
            .maybeSingle();

          if (existente && !req.body?.force && !isTargetReprocess) {
            console.log(`[POLL] Mensagem já registrada anteriormente: "${assunto}" (${messageId}). Pulando.`);
            continue;
          }

          const textoAssunto = `${assunto} ${remetente}`.toLowerCase();
          const isCandidate = isTargetReprocess || 
            textoAssunto.includes('ordem de serviço') ||
            textoAssunto.includes('ordem de servico') ||
            textoAssunto.includes('sebrae') ||
            textoAssunto.includes('demanda') ||
            textoAssunto.includes('contrato') ||
            textoAssunto.includes('consultoria') ||
            textoAssunto.includes('sgf') ||
            textoAssunto.includes('rae') ||
            textoAssunto.includes('091108');

          if (!isCandidate && isCheckingRecent) {
            continue;
          }

          // Baixa o conteúdo completo da mensagem apenas para candidatos
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
                const pdfjsLib = await import('pdfjs-dist/build/pdf.js');
                const data = new Uint8Array(osPdfAttachment.content);
                const loadingTask = pdfjsLib.getDocument({
                  data,
                  useSystemFonts: true,
                  disableFontFace: true
                });
                const pdfDoc = await loadingTask.promise;
                let pdfText = '';
                for (let i = 1; i <= pdfDoc.numPages; i++) {
                  const page = await pdfDoc.getPage(i);
                  const content = await page.getTextContent();
                  pdfText += content.items.map(item => item.str).join(' ') + '\n';
                }

                if (pdfText) {
                  const osMatch = pdfText.match(/(?:N[º°]?\s*ORDEM\s*SERVIÇO|Ordem\s*de\s*Serviço\s*n[º°]?)\s*[:\s]*([0-9\/\-]+)/i);
                  const sgfMatch = pdfText.match(/CÓDIGO\s*SGF\s*[:\s]*([A-Z0-9]+)/i);
                  const gestorMatch = pdfText.match(/GESTOR\s*RESPONSÁVEL\s*[:\s]*([A-Z\s]+?)(?=\s*E-MAIL|\s*CÓDIGO|$)/i);
                  const emailGestorMatch = pdfText.match(/E-MAIL\s*[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
                  const produtoMatch = pdfText.match(/PRODUTO\s*APLICADO\s*[:\s]*([^]+?)(?=\s*OBJETO|\s*DADOS DO|$)/i);
                  
                  const raeMatch = pdfText.match(/RAE\s*[:\s]*([0-9]+)/i);
                  const clienteMatch = pdfText.match(/CLIENTE\s*[:\s]*([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\-]+?)(?=\s*CONTATO|\s*E-MAIL|\s*VIGÊNCIA|$)/i);
                  const empresaFullMatch = pdfText.match(/EMPRESA\s*[:\s]*([0-9.\-\/]+)?\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\-]+?)(?=\s*CLIENTE|\s*RAE|\s*CONTATO|$)/i);
                  const cnpjMatch = pdfText.match(/EMPRESA\s*[:\s]*([0-9]{2}\.[0-9]{3}\.[0-9]{3}(?:\/[0-9]{4}-[0-9]{2})?|[0-9]{2}\.[0-9]{3}\.[0-9]{3})/i) || pdfText.match(/CNPJ\s*[:\s]*([0-9.\-\/]+)/i);
                  const contatoMatch = pdfText.match(/CONTATO\s*[:\s]*([0-9\(\)\s\-]+)/i);
                  const emailClienteMatches = pdfText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
                  const emailCliente = emailClienteMatches ? emailClienteMatches.find(e => !e.toLowerCase().includes('sebrae') && !e.toLowerCase().includes('ampliando')) : null;
                  const valorMatch = pdfText.match(/VALOR\s*(?:TOTAL\s*DA\s*ORDEM\s*DE\s*SERVIÇO|DA\s*PRESTAÇÃO\s*DE\s*SERVIÇOS)\s*[:\s]*R\$\s*([0-9.,]+)/i);
                  const dataPrevistaMatch = pdfText.match(/DATA\s*PREVISTA\s*PARA\s*EXECUÇÃO\s*[:\s]*([0-9\/]+)/i);
                  const prefMatch = pdfText.match(/Cliente deseja agendar[^.]+?\./i);
                  const prefObs = prefMatch ? prefMatch[0].replace(/\s+/g, ' ').trim() : '';

                  let rawContato = contatoMatch ? contatoMatch[1].trim() : '';
                  let formattedContato = rawContato;
                  const digits = rawContato.replace(/\D/g, '');
                  if (digits.length === 11) {
                    formattedContato = '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
                  } else if (digits.length === 10) {
                    formattedContato = '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
                  }

                  let rawCnpj = cnpjMatch ? cnpjMatch[1].trim() : null;
                  if (rawCnpj && !rawCnpj.includes('/')) {
                    rawCnpj = rawCnpj + '/0001-00';
                  }

                  const clienteNome = clienteMatch ? clienteMatch[1].trim() : null;
                  const empresaNome = empresaFullMatch ? empresaFullMatch[0].replace(/^EMPRESA\s*[:\s]*/i, '').replace(/\s+/g, ' ').trim() : (clienteNome || 'Empresa MEI');

                  parsedPdfData = {
                    osNumber: osMatch ? osMatch[1].trim() : null,
                    sgf: sgfMatch ? sgfMatch[1].trim() : null,
                    gestor: gestorMatch ? gestorMatch[1].trim() : null,
                    emailGestor: emailGestorMatch ? emailGestorMatch[1].trim() : null,
                    produto: produtoMatch ? produtoMatch[1].trim().replace(/\s+/g, ' ') : null,
                    rae: raeMatch ? raeMatch[1].trim() : null,
                    clienteNome: clienteNome,
                    empresa: empresaNome,
                    cnpj: rawCnpj,
                    contato: formattedContato || null,
                    emailCliente: emailCliente || null,
                    valor: valorMatch ? parseFloat(valorMatch[1].replace('.', '').replace(',', '.')) : 170.0,
                    dataPrevista: dataPrevistaMatch ? dataPrevistaMatch[1].trim() : null,
                    prefObs: prefObs
                  };
                  console.log(`[POLL] 📄 PDF analisado com sucesso! Cliente: ${parsedPdfData.clienteNome}, RAE: ${parsedPdfData.rae}`);
                }
              } catch (pdfErr) {
                console.error('[POLL] Erro ao extrair texto do PDF:', pdfErr);
                lastPdfError = {
                  message: pdfErr?.message || String(pdfErr),
                  stack: pdfErr?.stack || null,
                  name: pdfErr?.name || null
                };
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

            // Atualiza ou insere na tabela de emails_processados
            if (existente?.id) {
              await supabase
                .from('emails_processados')
                .update({
                  status: 'processado',
                  anexo_nome: anexoNome,
                  erro_detalhe: null
                })
                .eq('id', existente.id);
            } else {
              await supabase
                .from('emails_processados')
                .insert([{
                  message_id: messageId,
                  remetente,
                  assunto,
                  anexo_nome: anexoNome,
                  status: 'processado',
                  criado_em: dataEmail
                }]);
            }

            // Cria ou atualiza o card em projetos no Kanban com dados reais
            if (clienteNome || codigoRae) {
              let existingProj = null;
              if (codigoRae) {
                const { data: p } = await supabase
                  .from('projetos')
                  .select('id')
                  .eq('codigo_rae', codigoRae)
                  .maybeSingle();
                existingProj = p;
              }

              const projetoPayload = {
                nome_cliente: clienteNome || `Demanda via E-mail (${assunto.slice(0, 30)}...)`,
                razao_social: parsedPdfData?.empresa || clienteNome || `Demanda via E-mail`,
                nome_fantasia: clienteNome || null,
                cnpj: parsedPdfData?.cnpj || null,
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
                observacoes: parsedPdfData?.prefObs ? `OS nº ${parsedPdfData.osNumber || ''} | ${parsedPdfData.prefObs} | Gestor: ${parsedPdfData.gestor || 'Sebrae'}` : `Capturado automaticamente do e-mail de ${remetente}. Assunto: ${assunto}`,
                objetivo_atendimento: parsedPdfData?.prefObs ? `Consultoria Sebrae - ${parsedPdfData.prefObs}` : null,
                dados_extra: {
                  os_number: parsedPdfData?.osNumber || null,
                  sgf: parsedPdfData?.sgf || null,
                  gestor: parsedPdfData?.gestor || null,
                  email_gestor: parsedPdfData?.emailGestor || null,
                  anexo_pdf: anexoNome
                },
                atualizado_em: new Date().toISOString()
              };

              if (existingProj?.id) {
                await supabase.from('projetos').update(projetoPayload).eq('id', existingProj.id);
                console.log(`[POLL] Card atualizado no Kanban: ID ${existingProj.id} (RAE: ${codigoRae})`);
              } else {
                const projetoId = `email-${Date.now()}-${uid}`;
                await supabase.from('projetos').insert([{
                  id: projetoId,
                  ...projetoPayload,
                  criado_em: dataEmail
                }]);
                console.log(`[POLL] Novo card criado no Kanban: ID ${projetoId} (RAE: ${codigoRae})`);
              }

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
      lastPdfError,
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

// supabase/functions/poll-emails/index.ts
//
// Edge Function acionada por cron (ver instruções no final).
// Para cada consultor ativo:
//   1. Conecta via IMAP
//   2. Busca e-mails não vistos vindos do domínio configurado
//   3. Baixa anexos PDF
//   4. Sobe cada anexo pro Storage (bucket 'contratos-staging')
//   5. Registra o e-mail em 'emails_processados' (idempotente por message_id)
//
// Secrets necessários (supabase secrets set):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (já disponíveis por padrão)
//   IMAP_PASSWORD  -> senha do consultor (Fase 1: um único consultor)

import { createClient } from "npm:@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1";
import { simpleParser } from "npm:mailparser@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const IMAP_PASSWORD = Deno.env.get("IMAP_PASSWORD")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // proteção simples contra chamadas externas não autorizadas
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.includes(SERVICE_ROLE_KEY) && req.method !== "POST") {
    return new Response("unauthorized", { status: 401, headers: corsHeaders });
  }

  const resultados: Record<string, unknown>[] = [];

  const { data: consultores, error: errConsultores } = await supabase
    .from("consultores")
    .select("id, nome, email, imap_host, imap_usuario")
    .eq("ativo", true);

  if (errConsultores) {
    return Response.json({ error: errConsultores.message }, { status: 500, headers: corsHeaders });
  }

  for (const consultor of consultores ?? []) {
    try {
      const resultado = await processarConsultor(consultor);
      resultados.push({ consultor: consultor.email, ...resultado });
    } catch (err) {
      resultados.push({
        consultor: consultor.email,
        erro: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return Response.json({ processados: resultados }, { headers: corsHeaders });
});

async function processarConsultor(consultor: {
  id: string;
  email: string;
  imap_host: string;
  imap_usuario: string;
}) {
  const client = new ImapFlow({
    host: consultor.imap_host,
    port: 993,
    secure: true,
    auth: {
      user: consultor.imap_usuario,
      pass: IMAP_PASSWORD,
    },
    logger: false,
  });

  await client.connect();
  let novos = 0;
  let ignorados = 0;

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      // Busca UIDs de e-mails não lidos
      const uids = await client.search({ seen: false }, { uid: true });
      // Limita aos 5 mais recentes para não estourar tempo/memória (limite de CPU Deno Deploy)
      const targetUids = uids.slice(-5);

      if (targetUids.length > 0) {
        // Busca apenas cabeçalhos/tamanho primeiro (rápido, sem baixar anexos)
        const mensagensMeta = client.fetch(
          targetUids,
          { envelope: true, size: true },
          { uid: true }
        );

        const metas: any[] = [];
        for await (const msg of mensagensMeta) {
          metas.push(msg);
        }

        // Processa cada e-mail sequencialmente de forma isolada
        for (const meta of metas) {
          const messageId = meta.envelope.messageId ?? `${meta.uid}`;

          // idempotência: pula se já processado
          const { data: existente } = await supabase
            .from("emails_processados")
            .select("id")
            .eq("consultor_id", consultor.id)
            .eq("message_id", messageId)
            .maybeSingle();

          if (existente) {
            ignorados++;
            continue;
          }

          const remetenteTexto = meta.envelope.from?.map((f: any) => f.address).join(", ") ?? null;
          const assuntoTexto = meta.envelope.subject ?? null;

          // Evita processar e-mails gigantescos para não estourar o limite do Deno Deploy
          if (meta.size && meta.size > 2.5 * 1024 * 1024) {
            await supabase.from("emails_processados").insert({
              consultor_id: consultor.id,
              message_id: messageId,
              remetente: remetenteTexto,
              assunto: assuntoTexto,
              status: "erro",
              erro_detalhe: `E-mail ignorado: excede limite de tamanho (${(meta.size / 1024 / 1024).toFixed(2)}MB)`,
            });
            novos++;
            continue;
          }

          try {
            // Busca o source completo do e-mail de forma individual
            const detalhe = await client.fetchOne(
              `${meta.uid}`,
              { source: true },
              { uid: true }
            );

            if (!detalhe || !detalhe.source) {
              throw new Error("Não foi possível ler o conteúdo do e-mail");
            }

            const parsed = await simpleParser(detalhe.source);

            const pdfAttachments = (parsed.attachments ?? []).filter(
              (a) => a.contentType === "application/pdf"
            );

            let anexoOrdemServico = null;
            if (pdfAttachments.length > 0) {
              // 1. Tenta achar pelo nome do arquivo
              anexoOrdemServico = pdfAttachments.find((a) =>
                /ordem.*servi[cç]o|^\s*os[\s_-]/i.test(a.filename ?? "")
              );

              // 2. Se não achar pelo nome do arquivo, mas o assunto do e-mail indica que é uma OS/Ordem de Serviço
              if (!anexoOrdemServico) {
                const assuntoOS = /ordem.*servi[cç]o|\bos\b/i.test(parsed.subject ?? "");
                if (assuntoOS) {
                  // Pega o primeiro PDF como o anexo da OS
                  anexoOrdemServico = pdfAttachments[0];
                }
              }
            }

            let anexoStoragePath: string | null = null;
            let anexoNome: string | null = null;

            if (anexoOrdemServico) {
              const anexo = anexoOrdemServico;
              const path = `${consultor.id}/${messageId.replace(/[<>]/g, "")}/${anexo.filename ?? "documento.pdf"}`;

              const { error: uploadError } = await supabase.storage
                .from("contratos-staging")
                .upload(path, anexo.content, {
                  contentType: "application/pdf",
                  upsert: true,
                });

              if (uploadError) throw uploadError;

              anexoStoragePath = path;
              anexoNome = anexo.filename ?? "documento.pdf";
            }

            const { error: insertError } = await supabase.from("emails_processados").insert({
              consultor_id: consultor.id,
              message_id: messageId,
              remetente: parsed.from?.text ?? remetenteTexto,
              assunto: parsed.subject ?? assuntoTexto,
              status: anexoStoragePath ? "recebido" : "erro",
              erro_detalhe: anexoStoragePath
                ? null
                : "e-mail sem anexo de Ordem de Serviço reconhecível",
              anexo_storage_path: anexoStoragePath,
              anexo_nome: anexoNome,
            });

            if (insertError) {
              throw new Error(`Erro ao inserir no banco: ${insertError.message}`);
            }

            novos++;
          } catch (errInner) {
            console.error(`Erro ao processar e-mail UID ${meta.uid}:`, errInner);
            // Registra a falha no banco de dados para evitar reprocessamento infinito
            await supabase.from("emails_processados").insert({
              consultor_id: consultor.id,
              message_id: messageId,
              remetente: remetenteTexto,
              assunto: assuntoTexto,
              status: "erro",
              erro_detalhe: errInner instanceof Error ? errInner.message : String(errInner),
            });
            novos++;
          }
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return { novos, ignorados };
}

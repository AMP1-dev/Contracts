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

Deno.serve(async (req) => {
  // proteção simples contra chamadas externas não autorizadas
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.includes(SERVICE_ROLE_KEY) && req.method !== "POST") {
    return new Response("unauthorized", { status: 401 });
  }

  const resultados: Record<string, unknown>[] = [];

  const { data: consultores, error: errConsultores } = await supabase
    .from("consultores")
    .select("id, nome, email, imap_host, imap_usuario, dominio_filtro")
    .eq("ativo", true);

  if (errConsultores) {
    return Response.json({ error: errConsultores.message }, { status: 500 });
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

  return Response.json({ processados: resultados });
});

async function processarConsultor(consultor: {
  id: string;
  email: string;
  imap_host: string;
  imap_usuario: string;
  dominio_filtro: string;
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
      // busca e-mails não lidos do domínio configurado
      const mensagens = client.fetch(
        { seen: false, from: consultor.dominio_filtro },
        { envelope: true, source: true },
      );

      for await (const msg of mensagens) {
        const messageId = msg.envelope.messageId ?? `${msg.uid}`;

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

        const parsed = await simpleParser(msg.source);

        // O e-mail vem com vários anexos, mas só a "Ordem de Serviço" tem
        // os dados dos clientes que interessam ao cadastro.
        const anexoOrdemServico = (parsed.attachments ?? []).find(
          (a) =>
            a.contentType === "application/pdf" &&
            /ordem.*servi[cç]o|^\s*os[\s_-]/i.test(a.filename ?? ""),
        );

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

        await supabase.from("emails_processados").insert({
          consultor_id: consultor.id,
          message_id: messageId,
          remetente: parsed.from?.text ?? null,
          assunto: parsed.subject ?? null,
          status: anexoStoragePath ? "recebido" : "erro",
          erro_detalhe: anexoStoragePath
            ? null
            : "e-mail sem anexo de Ordem de Serviço reconhecível",
          anexo_storage_path: anexoStoragePath,
          anexo_nome: anexoNome,
        });

        novos++;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return { novos, ignorados };
}

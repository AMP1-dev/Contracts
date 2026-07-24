import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Trata requisições OPTIONS (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }  let emailProcessadoId: string | null = null;
  try {
    const body = await req.json();
    emailProcessadoId = body.emailProcessadoId;

    if (!emailProcessadoId) {
      throw new Error('ID do email_processado não fornecido.');
    }

    // Inicializa Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Busca os detalhes do e-mail e o caminho do anexo
    const { data: emailData, error: emailError } = await supabase
      .from('emails_processados')
      .select('consultor_id, anexo_storage_path')
      .eq('id', emailProcessadoId)
      .single();

    if (emailError || !emailData) {
      throw new Error('Erro ao buscar email_processado: ' + (emailError?.message || 'Não encontrado'));
    }

    if (!emailData.anexo_storage_path) {
      throw new Error('Nenhum anexo salvou para este e-mail.');
    }

    // 2. Baixa o PDF do Storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('contratos-staging')
      .download(emailData.anexo_storage_path);

    if (downloadError || !fileData) {
      throw new Error('Erro ao baixar o PDF do Storage: ' + downloadError?.message);
    }

    // Converte o arquivo baixado (Blob) para Base64 de forma segura em pedaços (evita stack overflow)
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.byteLength; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64Pdf = btoa(binary);

    // 3. Chama a API do Gemini
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('Chave da API do Gemini não configurada no Supabase Vault.');
    }

    const promptText = `
Você é um assistente de extração de dados especializado em ler contratos e Ordens de Serviço (PDFs).
Seu objetivo é ler o PDF anexado e extrair os seguintes campos no formato JSON estruturado.
Se um campo não existir ou não for encontrado no documento, retorne null para ele.
Não retorne nada além do JSON puro (sem marcações markdown como \`\`\`json).

Campos desejados no JSON:
- "codigo_rae": (string) O código RAE, geralmente no formato RAE-YYYY-XXXX.
- "nome_cliente": (string) Nome completo ou Razão Social principal do cliente.
- "razao_social": (string) Razão social do cliente.
- "nome_fantasia": (string) Nome fantasia do cliente.
- "cnpj": (string) CNPJ do cliente.
- "cpf": (string) CPF do cliente (se houver).
- "telefone": (string) Telefone fixo.
- "celular": (string) Celular.
- "email_cliente": (string) E-mail do cliente.
- "municipio": (string) Município / Cidade.
- "estado": (string) Sigla do Estado (UF).
- "endereco": (string) Endereço completo.
- "programa": (string) Nome do programa (ex: Sebrae Mais, Brasil Mais, etc).
- "solucao_contratada": (string) Nome do serviço ou solução contratada.
- "objetivo_atendimento": (string) Descrição ou objetivo do atendimento.
- "horas_contratadas": (number) Apenas o número de horas totais contratadas.
- "data_prevista_inicio": (string) Data no formato YYYY-MM-DD.
- "data_prevista_fim": (string) Data no formato YYYY-MM-DD.
- "modalidade": (string) Ex: Presencial, Online, Híbrido.
- "valor_consultoria": (number) Valor total monetário. Retorne apenas o número (ex: 5000.50).
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: base64Pdf
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    if (!geminiResponse.ok) {
      const errTxt = await geminiResponse.text();
      throw new Error(`Erro na API do Gemini: ${geminiResponse.status} - ${errTxt}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error('O Gemini não retornou nenhum texto.');
    }

    let extractedData;
    try {
      extractedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Resposta crua que falhou o parse:", responseText);
      throw new Error('O Gemini não retornou um JSON válido.');
    }

    const novoProjeto = {
      ...extractedData,
      consultor_id: emailData.consultor_id,
      status: 'novo_contrato',
    };

    const { error: insertError } = await supabase
      .from('projetos')
      .insert(novoProjeto);

    if (insertError) {
      throw new Error('Erro ao inserir o projeto no banco: ' + insertError.message);
    }

    // 5. Atualiza o status do e-mail para processado
    await supabase
      .from('emails_processados')
      .update({ status: 'processado', erro_detalhe: null })
      .eq('id', emailProcessadoId);

    return new Response(JSON.stringify({ success: true, data: novoProjeto }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error);
    
    // Tenta atualizar o status para erro se houver um ID
    if (emailProcessadoId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('emails_processados')
          .update({ status: 'erro', erro_detalhe: error.message })
          .eq('id', emailProcessadoId);
      } catch (e) {
        console.error("Erro ao atualizar status para erro no banco:", e);
      }
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

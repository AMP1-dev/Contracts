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
Você é um assistente de extração de dados de altíssima precisão especializado em ler Ordens de Serviço (OS/RAE) do SEBRAE em PDF.
Seu objetivo é ler o PDF anexado, localizar as tags e rótulos de cada campo e extrair os dados estruturados em JSON.

REGRAS DE LEITURA E TAGS:
- "codigo_rae": Procure por "Ordem de Serviço", "OS nº", "RAE nº", "Nº da OS" ou códigos como "07873" / "39090075".
- "valor_consultoria": Procure por tags de valor como "Valor Total", "Valor da OS", "Valor R$", "Valor do Atendimento", "Valor Consultoria" ou cifras R$. Extraia o valor numérico total (ex: 350.00 ou 250.00). Retorne apenas um número float/int.
- "programa": Procure pelo Produto Aplicado ou código SGF, ex: "39090075 ABRIR SGF 2026 | PADRÃO | 110" ou "SGF 2026".
- "solucao_contratada": Procure pelo título/objeto da contratação, ex: "Faça a gestão financeira e tenha controle do seu dinheiro".
- "modalidade": Identifique o formato de execução: "Remoto", "Presencial", "Online" ou "A Distância".
- "nome_cliente" e "razao_social": Nome do cliente/empresa atendida (ex: "Ericka Clemente dos Santos Nunes").
- "cnpj" e "cpf": Procure por CNPJ (ex: 66.212.730/0001-64) e CPF (ex: 364.678.198-02).
- "telefone" / "celular": Procure por telefones ou celulares do cliente.
- "email_cliente": E-mail do cliente.
- "municipio" e "estado": Cidade e UF do cliente.
- "horas_contratadas": Carga horária (ex: 1, 2, 4, 20).
- "data_prevista_inicio": Data agendada do atendimento (formato YYYY-MM-DD).

IMPORTANTE: Se o PDF contiver MÚLTIPLOS clientes ou demandas (ex: 10 empresas em um único lote), retorne SEMPRE uma ARRAY de objetos JSON, onde cada objeto representa 1 cliente/demanda individual.
Não retorne nada além do JSON puro.
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

    // Se for array (múltiplos clientes) ou objeto único, trata como lista para criar 1 card por cliente
    const items = Array.isArray(extractedData) ? extractedData : [extractedData];
    const novosProjetos = items.map(item => ({
      ...item,
      consultor_id: emailData.consultor_id,
      status: 'novo_contrato',
    }));

    const { error: insertError } = await supabase
      .from('projetos')
      .insert(novosProjetos);

    if (insertError) {
      throw new Error('Erro ao inserir os projetos no banco: ' + insertError.message);
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

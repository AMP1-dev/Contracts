/**
 * Integração Oficial com a API GraphQL da Autentique
 * Endpoint: https://api.autentique.com.br/v2/graphql
 */

const AUTENTIQUE_GRAPHQL_URL = 'https://api.autentique.com.br/v2/graphql';

export interface AutentiqueSignerInput {
  name: string;
  email?: string;
  phone?: string;
  action?: 'SIGN' | 'APPROVE' | 'ACKNOWLEDGE';
}

export interface CreateAutentiqueDocParams {
  token: string;
  sandbox?: boolean;
  name: string;
  signerName: string;
  signerEmail?: string;
  signerPhone?: string;
  message?: string;
}

export interface AutentiqueResponse {
  success: boolean;
  documentId?: string;
  signUrl?: string;
  status?: string;
  error?: string;
}

/**
 * Testa a validade do Token consultando os dados da organização
 */
export async function testAutentiqueConnection(token: string): Promise<{ ok: boolean; message: string }> {
  if (!token || !token.trim()) {
    return { ok: false, message: 'Token de API da Autentique não foi fornecido.' };
  }

  const query = `
    query {
      viewer {
        id
        name
        email
      }
    }
  `;

  try {
    const res = await fetch(AUTENTIQUE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();
    if (data.errors && data.errors.length > 0) {
      return { ok: false, message: data.errors[0].message || 'Erro de autenticação na Autentique.' };
    }

    if (data.data?.viewer?.name) {
      return {
        ok: true,
        message: `Conectado com sucesso à organização de: ${data.data.viewer.name} (${data.data.viewer.email})`,
      };
    }

    return { ok: true, message: 'Token validado com sucesso na Autentique!' };
  } catch (err: any) {
    return { ok: false, message: `Falha de conexão com a API da Autentique: ${err.message || err}` };
  }
}

/**
 * Cria e dispara um documento para assinatura na Autentique
 */
export async function createAutentiqueDocument(params: CreateAutentiqueDocParams): Promise<AutentiqueResponse> {
  const { token, sandbox = true, name, signerName, signerEmail, signerPhone, message } = params;

  if (!token) {
    return { success: false, error: 'Token de API da Autentique não configurado nas Configurações.' };
  }

  // Prepara o mutation do GraphQL da Autentique
  const mutation = `
    mutation CreateDocumentMutation(
      \$document: DocumentInput!
      \$signers: [SignerInput!]!
    ) {
      createDocument(
        sandbox: ${sandbox ? 'true' : 'false'}
        document: \$document
        signers: \$signers
      ) {
        id
        name
        created_at
        signatures {
          public_id
          name
          email
          link {
            short_link
          }
        }
      }
    }
  `;

  // Limpa o telefone para garantir formato internacional E.164 (+55119...)
  let cleanPhone = signerPhone ? signerPhone.replace(/\D/g, '') : '';
  if (cleanPhone.length > 0 && !cleanPhone.startsWith('55')) {
    cleanPhone = `55${cleanPhone}`;
  }

  const signers: any[] = [
    {
      name: signerName || 'Cliente Sebrae',
      email: signerEmail || undefined,
      phone: cleanPhone ? `+${cleanPhone}` : undefined,
      action: 'SIGN',
    },
  ];

  const variables = {
    document: {
      name: name || 'Relatório de Prestação de Serviço - SOMA SEBRAE',
      message: message || 'Olá! Segue o Relatório de Prestação de Serviço da Consultoria Sebrae para sua assinatura eletrônica.',
    },
    signers,
  };

  try {
    const res = await fetch(AUTENTIQUE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const data = await res.json();
    if (data.errors && data.errors.length > 0) {
      return {
        success: false,
        error: data.errors.map((e: any) => e.message).join('; '),
      };
    }

    const doc = data.data?.createDocument;
    const firstSignature = doc?.signatures?.[0];
    const signUrl = firstSignature?.link?.short_link || undefined;

    return {
      success: true,
      documentId: doc?.id,
      signUrl,
      status: 'pendente',
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Erro ao enviar documento para Autentique: ${err.message || err}`,
    };
  }
}

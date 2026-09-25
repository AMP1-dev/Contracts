import { ImapFlow } from 'imapflow';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { host, port, user, pass, useSSL } = req.body || {};

  if (!host || !user || !pass) {
    return res.status(400).json({
      ok: false,
      error: 'Host, usuário e senha são obrigatórios para testar a conexão IMAP.'
    });
  }

  const client = new ImapFlow({
    host: String(host).trim(),
    port: Number(port) || 993,
    secure: useSSL !== false,
    auth: {
      user: String(user).trim(),
      pass: String(pass)
    },
    logger: false,
    clientInfo: {
      name: 'AMP CRM Demanda',
      version: '1.0.0'
    }
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    const status = await client.status('INBOX', { messages: true, unseen: true });
    lock.release();
    await client.logout();

    return res.status(200).json({
      ok: true,
      message: `Conexão IMAP bem-sucedida! Caixa de entrada conectada (${status.messages || 0} mensagens no total, ${status.unseen || 0} não lidas).`,
      status
    });
  } catch (err) {
    try { await client.logout(); } catch (e) {}
    return res.status(200).json({
      ok: false,
      error: `Falha na autenticação IMAP: ${err.message || String(err)}`
    });
  }
}

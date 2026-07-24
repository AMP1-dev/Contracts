/**
 * Sends a message notification via Telegram Bot API
 */
export async function sendTelegramNotification(
  message: string,
  botToken?: string,
  chatId?: string
): Promise<{ ok: boolean; description?: string }> {
  const token = (botToken && botToken.trim()) || '8881587002:AAE1BoSfGMSV4n96A1ISyNVscJJ-v0Ca8zo';
  const targetChat = (chatId && chatId.trim()) || '';

  if (!targetChat) {
    console.warn('Telegram chatId not configured');
    return { ok: false, description: 'Chat ID não configurado.' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: targetChat,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error('Telegram API Response Error:', data);
      return { ok: false, description: data.description || 'Erro na API do Telegram.' };
    }
    return { ok: true };
  } catch (error: any) {
    console.error('Error sending Telegram notification:', error);
    return { ok: false, description: error.message || String(error) };
  }
}

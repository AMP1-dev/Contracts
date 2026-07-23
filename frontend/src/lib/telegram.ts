/**
 * Sends a message notification via Telegram Bot API
 */
export async function sendTelegramNotification(
  message: string,
  botToken?: string,
  chatId?: string
): Promise<boolean> {
  const token = botToken || '7123456789:AAFx...';
  const targetChat = chatId || '';

  if (!token || !targetChat) {
    console.warn('Telegram token or chatId not configured');
    return false;
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
    return data.ok === true;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
}

export const TELEGRAM_BOT_TOKEN = '8727799033:AAHWPlXCgFgI55QpQjO6lxyCBcDB4LKx0EY';
export const TELEGRAM_CHAT_IDS: string[] = ['823526633', '917939980'];

export type FeedbackType = 'idea' | 'bug' | 'review' | 'question';

export interface FeedbackData {
  type: FeedbackType;
  message: string;
  email?: string;
}

const typeMap: Record<FeedbackType, string> = {
  idea: '💡 Ідея / Пропозиція',
  bug: '🐛 Помилка / Баг',
  review: '⭐ Відгук',
  question: '❓ Запитання'
};

export const sendFeedbackToTelegram = async (data: FeedbackData): Promise<boolean> => {
  if (!TELEGRAM_CHAT_IDS || TELEGRAM_CHAT_IDS.length === 0) {
    console.error("Telegram Chat IDs are not configured.");
    return false;
  }

  const text = `
📩 *Нове повідомлення з додатку ROVA!*

*Тип:* ${typeMap[data.type]}
*Email користувача:* ${data.email || 'Не вказано'}

*Текст повідомлення:*
${data.message}
  `.trim();

  try {
    const promises = TELEGRAM_CHAT_IDS.map(chatId => 
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown',
        }),
      })
    );

    const results = await Promise.all(promises);
    return results.some(r => r.ok); 
  } catch (error) {
    console.error('Error sending telegram message:', error);
    return false;
  }
};

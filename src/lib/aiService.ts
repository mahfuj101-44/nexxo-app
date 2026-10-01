// Client-side AI Service calling server-side /api/ai endpoints
// Ensures GEMINI_API_KEY is NEVER exposed to the browser

export interface AiChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export async function askNexxoAi(message: string, history: AiChatMessage[] = []): Promise<string> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reach AI Assistant.');
  }

  return data.reply;
}

export async function translateMessage(text: string, targetLanguage: string): Promise<string> {
  const res = await fetch('/api/ai/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLanguage }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to translate message.');
  }

  return data.translatedText;
}

export async function getSmartReplies(
  contextMessages: { senderName?: string; text: string }[]
): Promise<string[]> {
  try {
    const res = await fetch('/api/ai/smart-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextMessages }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.replies) ? data.replies : [];
  } catch {
    return [];
  }
}

export async function summarizeContent(
  title: string,
  messages: { senderName?: string; text: string }[] | string
): Promise<string> {
  const res = await fetch('/api/ai/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, messages }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to generate summary.');
  }

  return data.summary;
}

export const chatWithAi = askNexxoAi;

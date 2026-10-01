import type { Plugin, ViteDevServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

function parseRequestBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export function nexxoAiPlugin(): Plugin {
  return {
    name: 'nexxo-ai-api-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '';

        if (!url.startsWith('/api/ai/')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json');

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          res.statusCode = 503;
          res.end(
            JSON.stringify({
              error: 'GEMINI_API_KEY is not configured in the environment. Please add it to your project Settings / Secrets.',
            })
          );
          return;
        }

        const ai = new GoogleGenAI({ apiKey });

        try {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          const body = await parseRequestBody(req);

          // 1. AI Assistant Chat
          if (url === '/api/ai/chat') {
            const { message, history } = body;
            if (!message) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Message is required' }));
              return;
            }

            const promptHistory = Array.isArray(history)
              ? history
                  .slice(-8)
                  .map((h: any) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
                  .join('\n')
              : '';

            const systemInstruction = `You are the NEXXO AI Assistant, an intelligent, helpful, polite, and concise companion integrated into the NEXXO real-time communication platform.
Assist users with productivity, writing, summarization, ideas, and tech questions. Keep responses well-formatted and direct.`;

            const fullPrompt = `${systemInstruction}\n\n${promptHistory ? `Previous Context:\n${promptHistory}\n\n` : ''}User: ${message}\nAssistant:`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: fullPrompt,
            });

            const replyText = response.text || 'I could not generate a response.';
            res.statusCode = 200;
            res.end(JSON.stringify({ reply: replyText }));
            return;
          }

          // 2. Message Translation
          if (url === '/api/ai/translate') {
            const { text, targetLanguage } = body;
            if (!text || !targetLanguage) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Text and targetLanguage are required' }));
              return;
            }

            const prompt = `You are a professional multilingual translator for the NEXXO messaging platform.
Translate the following message into ${targetLanguage}.
Preserve tone, emojis, line breaks, and meaning accurately.
Return ONLY the final translated text without commentary, quotes, or preambles.

Message to translate:
"${text}"`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
            });

            res.statusCode = 200;
            res.end(
              JSON.stringify({
                translatedText: response.text?.trim() || text,
                originalText: text,
                targetLanguage,
              })
            );
            return;
          }

          // 3. Smart Replies
          if (url === '/api/ai/smart-replies') {
            const { contextMessages } = body;
            const messagesStr = Array.isArray(contextMessages)
              ? contextMessages
                  .slice(-5)
                  .map((m: any) => `${m.senderName || 'Sender'}: ${m.text}`)
                  .join('\n')
              : '';

            const prompt = `Given the recent conversation messages below, generate 3 distinct, natural, conversational quick response options (maximum 6 words each) that the user might want to tap to reply instantly.
Output format: Return ONLY a valid JSON array of 3 strings, e.g. ["Sounds great!", "I'll look into it.", "Can we talk later?"]. No markdown fences.

Conversation:
${messagesStr}`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
            });

            let replies: string[] = [];
            try {
              const clean = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '[]';
              replies = JSON.parse(clean);
            } catch {
              replies = ['Sounds good!', 'Understood, thanks.', 'Let me check.'];
            }

            res.statusCode = 200;
            res.end(JSON.stringify({ replies: Array.isArray(replies) ? replies.slice(0, 3) : [] }));
            return;
          }

          // 4. Summarize
          if (url === '/api/ai/summarize') {
            const { title, messages } = body;
            const context = Array.isArray(messages)
              ? messages
                  .map((m: any) => `[${m.senderName || 'Participant'}]: ${m.text || ''}`)
                  .join('\n')
              : typeof messages === 'string'
              ? messages
              : '';

            const prompt = `Provide a concise, highly organized summary of the following conversation or announcements for "${title || 'NEXXO Conversation'}".
Include:
- Key topics discussed
- Decisions made
- Next action items (if any)
Keep it brief, professional, and formatted in clean markdown bullet points.

Content:
${context}`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
            });

            res.statusCode = 200;
            res.end(JSON.stringify({ summary: response.text?.trim() || 'No summary available.' }));
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'AI endpoint not found' }));
        } catch (err: any) {
          console.error('AI API Error:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message || 'Internal AI service error' }));
        }
      });
    },
  };
}

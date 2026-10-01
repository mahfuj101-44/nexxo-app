import React, { useState } from 'react';
import { Bot, X, Send, Sparkles, Copy, Check, RotateCcw } from 'lucide-react';
import { chatWithAi } from '../../lib/aiService';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your NEXXO Intelligent Assistant powered by Gemini 2.5. How can I assist your communications, message drafting, or questions today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setInput('');
    const newHistory: ChatTurn[] = [...messages, { role: 'user', content: text }];
    setMessages(newHistory);
    setLoading(true);

    try {
      const history = messages.slice(1).map((m) => ({
        role: m.role,
        text: m.content,
      }));
      const response = await chatWithAi(text, history);

      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I encountered an error communicating with the AI service. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const quickPrompts = [
    'Help me draft a professional message',
    'Summarize this discussion point',
    'Check my message tone',
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">NEXXO AI Assistant</h3>
            <p className="text-[11px] text-indigo-400 font-mono">Gemini 2.5 Flash Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setMessages([
                {
                  role: 'assistant',
                  content: 'Chat reset. How can I assist you now?',
                },
              ])
            }
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Reset Chat"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`relative max-w-[85%] rounded-2xl p-3 leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60'
              }`}
            >
              {m.content}

              {m.role === 'assistant' && idx > 0 && (
                <button
                  onClick={() => handleCopy(m.content, idx)}
                  className="mt-2 flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  {copiedIdx === idx ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedIdx === idx ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-indigo-400 text-xs py-2">
            <Sparkles className="h-3.5 w-3.5 animate-spin" />
            <span>AI is thinking...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="p-2 border-t border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-indigo-600 text-[11px] text-slate-300 hover:text-white transition-colors flex-shrink-0 cursor-pointer border border-slate-700 whitespace-nowrap"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI anything..."
          className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

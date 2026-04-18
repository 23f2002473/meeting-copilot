'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2, Brain, User, Bot, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  groqApiKey: string;
  model: string;
}

const STARTERS = [
  'What decisions were made in my last meeting?',
  'Who was assigned the backend task?',
  'Summarize the deployment discussion',
  'What are the open questions from this week?',
];

async function* readSSE(res: Response): AsyncGenerator<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const token: string = JSON.parse(data).choices?.[0]?.delta?.content ?? '';
        if (token) yield token;
      } catch {}
    }
  }
}

export default function MemoryAssistant({ groqApiKey, model }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const send = async (question: string) => {
    if (!question.trim() || isStreaming) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingText('');

    try {
      const res = await fetch('/api/memory/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, groqApiKey, model }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Query failed');
      }

      let accumulated = '';
      for await (const chunk of readSSE(res)) {
        accumulated += chunk;
        setStreamingText(accumulated);
      }

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: accumulated },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingText('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1e2130]">
        <div className="flex items-center gap-2 mb-0.5">
          <Brain className="w-4 h-4 text-[#5865f2]" />
          <h2 className="text-sm font-semibold text-[#e8eaf0]">Memory Assistant</h2>
        </div>
        <p className="text-xs text-[#6b7280]">
          Ask anything about your past meetings — decisions, tasks, topics, people
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && !isStreaming ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#5865f2]/10 border border-[#5865f2]/20 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-[#5865f2]" />
              </div>
              <p className="text-sm font-medium text-[#e8eaf0] mb-1">Your meeting memory</p>
              <p className="text-xs text-[#6b7280] max-w-xs">
                Ask questions about your past meetings. Your recordings are stored as searchable memories.
              </p>
            </div>

            {/* Starter prompts */}
            <div className="space-y-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl border border-[#1e2130] hover:border-[#5865f2]/30 bg-[#12141a] hover:bg-[#5865f2]/5 text-xs text-[#9ba3b8] hover:text-[#e8eaf0] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className={clsx('flex gap-2.5 animate-fade-in', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
              >
                <div className={clsx('shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5', msg.role === 'user' ? 'bg-[#5865f2]/20' : 'bg-[#1a1d2e]')}>
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-[#5865f2]" /> : <Brain className="w-3.5 h-3.5 text-[#9ba3b8]" />}
                </div>
                <div className={clsx('max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed', msg.role === 'user' ? 'bg-[#5865f2] text-white rounded-tr-sm' : 'bg-[#1a1d2e] text-[#e8eaf0] border border-[#1e2130] rounded-tl-sm')}>
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
              </div>
            ))}

            {/* Streaming */}
            {isStreaming && (
              <div className="flex gap-2.5 animate-fade-in">
                <div className="shrink-0 w-6 h-6 rounded-full bg-[#1a1d2e] flex items-center justify-center mt-0.5">
                  <Brain className="w-3.5 h-3.5 text-[#9ba3b8]" />
                </div>
                <div className="max-w-[85%] px-3 py-2.5 rounded-2xl rounded-tl-sm text-sm bg-[#1a1d2e] border border-[#1e2130] text-[#e8eaf0]">
                  {streamingText ? (
                    <span className="whitespace-pre-wrap streaming-cursor">{streamingText}</span>
                  ) : (
                    <div className="flex items-center gap-1 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4b5263] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4b5263] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4b5263] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-[#1e2130]">
        <div className="flex items-end gap-2 bg-[#12141a] border border-[#1e2130] rounded-xl px-3 py-2 focus-within:border-[#5865f2]/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKey}
            placeholder="Ask about your meetings..."
            disabled={isStreaming}
            rows={1}
            className="flex-1 bg-transparent text-sm text-[#e8eaf0] placeholder-[#4b5263] focus:outline-none min-h-[24px] max-h-[120px] py-0.5"
            style={{ height: '24px' }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isStreaming}
            className={clsx('shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all', input.trim() && !isStreaming ? 'bg-[#5865f2] text-white hover:bg-[#4752c4]' : 'bg-[#1a1d2e] text-[#4b5263] cursor-not-allowed')}
          >
            {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[10px] text-[#4b5263] mt-1.5 px-1">Enter to send · uses vector search across all your meetings</p>
      </div>
    </div>
  );
}

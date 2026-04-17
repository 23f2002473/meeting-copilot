'use client';

import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { ChatMessage } from '@/lib/types';
import { formatTimestamp, SUGGESTION_META } from '@/lib/utils';
import clsx from 'clsx';

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  onSend: (message: string) => void;
}

function MessageBubble({
  message,
  isStreaming,
  streamingContent,
}: {
  message: ChatMessage;
  isStreaming: boolean;
  streamingContent?: string;
}) {
  const isUser = message.role === 'user';
  const content = isStreaming && streamingContent ? streamingContent : message.content;

  return (
    <div
      className={clsx(
        'flex gap-2.5 animate-fade-in',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5',
          isUser ? 'bg-[#5865f2]/20' : 'bg-[#1a1d2e]'
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-[#5865f2]" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-[#9ba3b8]" />
        )}
      </div>

      {/* Bubble */}
      <div className={clsx('flex flex-col max-w-[85%]', isUser && 'items-end')}>
        <div
          className={clsx(
            'px-3 py-2.5 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-[#5865f2] text-white rounded-tr-sm'
              : 'bg-[#1a1d2e] text-[#e8eaf0] border border-[#1e2130] rounded-tl-sm'
          )}
        >
          {isStreaming ? (
            <span className="streaming-cursor whitespace-pre-wrap">{content}</span>
          ) : (
            <span className="whitespace-pre-wrap">{content}</span>
          )}
        </div>
        <span className="text-[10px] text-[#4b5263] mt-1 px-1">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

export default function ChatPanel({
  messages,
  isStreaming,
  streamingContent,
  onSend,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    onSend(text);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Find the last assistant message index for streaming indicator
  const lastAssistantIdx = messages.reduce(
    (idx, m, i) => (m.role === 'assistant' ? i : idx),
    -1
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1e2130]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
          Chat
        </h2>
        <p className="text-[10px] text-[#4b5263] mt-0.5">
          Click a suggestion or type a question
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-full border border-[#1e2130] bg-[#1a1d2e] flex items-center justify-center mb-4">
              <Bot className="w-5 h-5 text-[#4b5263]" />
            </div>
            <p className="text-sm text-[#4b5263] max-w-[200px]">
              Click any suggestion card or type a question to start
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && i === lastAssistantIdx}
              streamingContent={
                isStreaming && i === lastAssistantIdx ? streamingContent : undefined
              }
            />
          ))
        )}

        {/* Streaming indicator when no assistant message yet */}
        {isStreaming && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-2.5 animate-fade-in">
            <div className="shrink-0 w-6 h-6 rounded-full bg-[#1a1d2e] flex items-center justify-center mt-0.5">
              <Bot className="w-3.5 h-3.5 text-[#9ba3b8]" />
            </div>
            <div className="bg-[#1a1d2e] border border-[#1e2130] rounded-2xl rounded-tl-sm px-3 py-2.5">
              {streamingContent ? (
                <span className="text-sm text-[#e8eaf0] whitespace-pre-wrap streaming-cursor">
                  {streamingContent}
                </span>
              ) : (
                <div className="flex items-center gap-1.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4b5263] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4b5263] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4b5263] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#1e2130]">
        <div className="flex items-end gap-2 bg-[#12141a] border border-[#1e2130] rounded-xl px-3 py-2 focus-within:border-[#5865f2]/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about the conversation..."
            disabled={isStreaming}
            rows={1}
            className="flex-1 bg-transparent text-sm text-[#e8eaf0] placeholder-[#4b5263] focus:outline-none min-h-[24px] max-h-[120px] py-0.5"
            style={{ height: '24px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className={clsx(
              'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all',
              input.trim() && !isStreaming
                ? 'bg-[#5865f2] text-white hover:bg-[#4752c4]'
                : 'bg-[#1a1d2e] text-[#4b5263] cursor-not-allowed'
            )}
          >
            {isStreaming ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-[#4b5263] mt-1.5 px-1">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

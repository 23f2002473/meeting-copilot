'use client';

import { useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { TranscriptChunk } from '@/lib/types';
import { formatTimestamp } from '@/lib/utils';
import clsx from 'clsx';

interface Props {
  chunks: TranscriptChunk[];
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  onToggleMic: () => void;
  hasApiKey: boolean;
}

export default function TranscriptPanel({
  chunks,
  isRecording,
  isTranscribing,
  error,
  onToggleMic,
  hasApiKey,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest transcript
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chunks]);

  const fullText = chunks.map((c) => c.text).join(' ');
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2130]">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
            Transcript
          </h2>
          {chunks.length > 0 && (
            <p className="text-[10px] text-[#4b5263] mt-0.5">
              {wordCount.toLocaleString()} words · {chunks.length} chunks
            </p>
          )}
        </div>

        {/* Mic toggle button */}
        <button
          onClick={onToggleMic}
          disabled={!hasApiKey}
          title={!hasApiKey ? 'Add Groq API key in Settings first' : undefined}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
            isRecording
              ? 'bg-red-500/15 text-red-400 border border-red-500/30 recording-pulse hover:bg-red-500/25'
              : 'bg-[#1a1d2e] text-[#9ba3b8] border border-[#1e2130] hover:border-[#5865f2] hover:text-[#e8eaf0]',
            !hasApiKey && 'opacity-40 cursor-not-allowed'
          )}
        >
          {isRecording ? (
            <>
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <MicOff className="w-3.5 h-3.5" />
              <span className="text-xs">Stop</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" />
              <span className="text-xs">Start</span>
            </>
          )}
        </button>
      </div>

      {/* Status bar */}
      {(isTranscribing || error) && (
        <div
          className={clsx(
            'flex items-center gap-2 px-4 py-2 text-xs border-b',
            error
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-[#5865f2]/10 border-[#5865f2]/20 text-[#9ba3b8]'
          )}
        >
          {error ? (
            <>
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{error}</span>
            </>
          ) : (
            <>
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              <span>Transcribing audio...</span>
            </>
          )}
        </div>
      )}

      {/* Transcript content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {chunks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div
              className={clsx(
                'w-12 h-12 rounded-full border-2 flex items-center justify-center mb-4',
                isRecording
                  ? 'border-red-500/40 bg-red-500/10'
                  : 'border-[#1e2130] bg-[#1a1d2e]'
              )}
            >
              <Mic
                className={clsx(
                  'w-5 h-5',
                  isRecording ? 'text-red-400' : 'text-[#4b5263]'
                )}
              />
            </div>
            <p className="text-sm text-[#4b5263]">
              {isRecording
                ? 'Listening... transcript appears every 30s'
                : hasApiKey
                ? 'Click Start to begin recording'
                : 'Add your Groq API key in Settings to begin'}
            </p>
          </div>
        ) : (
          chunks.map((chunk, i) => (
            <div key={chunk.id} className="animate-fade-in">
              <span className="text-[10px] text-[#4b5263] block mb-0.5">
                {formatTimestamp(chunk.timestamp)}
              </span>
              <p
                className={clsx(
                  'text-sm leading-relaxed',
                  i === chunks.length - 1
                    ? 'text-[#e8eaf0]'
                    : 'text-[#9ba3b8]'
                )}
              >
                {chunk.text}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

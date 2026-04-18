'use client';

import { RefreshCw, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { SuggestionBatch, Suggestion } from '@/lib/types';
import { formatTime, SUGGESTION_META } from '@/lib/utils';
import clsx from 'clsx';
import { useState } from 'react';

interface Props {
  batches: SuggestionBatch[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSuggestionClick: (suggestion: Suggestion) => void;
  hasTranscript: boolean;
}

function SuggestionCard({
  suggestion,
  onClick,
  isNew,
}: {
  suggestion: Suggestion;
  onClick: () => void;
  isNew: boolean;
}) {
  const meta = SUGGESTION_META[suggestion.type];

  return (
    <button
      onClick={onClick}
      className={clsx(
        'suggestion-card w-full text-left p-3.5 rounded-xl border transition-all duration-200',
        'hover:shadow-lg focus:outline-none focus:ring-1 focus:ring-[#5865f2]/50',
        meta.bg,
        isNew && 'animate-slide-down'
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={clsx(
            'shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold mt-0.5',
            meta.color,
            'bg-current/10'
          )}
          style={{ backgroundColor: 'currentColor', opacity: 1 }}
        >
          <span
            className={clsx('text-xs font-bold', meta.color)}
            style={{ mixBlendMode: 'normal' }}
          >
            {meta.icon}
          </span>
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={clsx('text-[10px] font-semibold uppercase tracking-wider', meta.color)}>
              {meta.label}
            </span>
          </div>
          <p className="text-sm text-[#e8eaf0] leading-snug">{suggestion.preview}</p>
          <p className="text-[10px] text-[#6b7280] mt-1.5">Click for detailed answer →</p>
        </div>
      </div>
    </button>
  );
}

function BatchGroup({
  batch,
  isLatest,
  onSuggestionClick,
}: {
  batch: SuggestionBatch;
  isLatest: boolean;
  onSuggestionClick: (s: Suggestion) => void;
}) {
  const [collapsed, setCollapsed] = useState(!isLatest);

  return (
    <div className={clsx('rounded-xl overflow-hidden', isLatest ? 'border border-[#2d3250]' : 'border border-[#1a1d2e]')}>
      {/* Batch header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={clsx(
          'w-full flex items-center justify-between px-3 py-2 text-left transition-colors',
          isLatest
            ? 'bg-[#1a1d2e] hover:bg-[#1e2235]'
            : 'bg-[#12141a] hover:bg-[#14161e]'
        )}
      >
        <div className="flex items-center gap-2">
          {isLatest && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#5865f2] animate-pulse" />
          )}
          <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider">
            {isLatest ? 'Latest' : formatTime(batch.timestamp)}
          </span>
          {isLatest && (
            <span className="text-[10px] text-[#4b5263]">{formatTime(batch.timestamp)}</span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="w-3 h-3 text-[#4b5263]" />
        ) : (
          <ChevronUp className="w-3 h-3 text-[#4b5263]" />
        )}
      </button>

      {/* Suggestions */}
      {!collapsed && (
        <div className="p-2 space-y-2 bg-[#0e1016]">
          {batch.suggestions.map((s, i) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              onClick={() => onSuggestionClick(s)}
              isNew={isLatest}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SuggestionsPanel({
  batches,
  isLoading,
  error,
  onRefresh,
  onSuggestionClick,
  hasTranscript,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2130]">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
            Live Suggestions
          </h2>
          {batches.length > 0 && (
            <p className="text-[10px] text-[#4b5263] mt-0.5">
              {batches.length} batches · {batches.reduce((n, b) => n + b.suggestions.length, 0)} total
            </p>
          )}
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading || !hasTranscript}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
            isLoading || !hasTranscript
              ? 'opacity-40 cursor-not-allowed border-[#1e2130] text-[#4b5263]'
              : 'border-[#5865f2]/40 text-[#5865f2] hover:bg-[#5865f2]/10 hover:border-[#5865f2]'
          )}
        >
          <RefreshCw className={clsx('w-3 h-3', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Content */}
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border-b border-red-500/20 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 text-[#5865f2] animate-spin" />
                <p className="text-sm text-[#6b7280]">Analyzing transcript...</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full border border-[#1e2130] bg-[#1a1d2e] flex items-center justify-center mb-4">
                  <span className="text-2xl">💡</span>
                </div>
                <p className="text-sm text-[#4b5263] max-w-[220px]">
                  {hasTranscript
                    ? 'Click Refresh to generate suggestions'
                    : 'Suggestions appear as you speak. Start recording first.'}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Loading overlay for latest batch */}
            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#5865f2]/10 border border-[#5865f2]/20 animate-fade-in">
                <Loader2 className="w-3.5 h-3.5 text-[#5865f2] animate-spin" />
                <span className="text-xs text-[#9ba3b8]">Generating new suggestions...</span>
              </div>
            )}

            {batches.map((batch, i) => (
              <BatchGroup
                key={batch.id}
                batch={batch}
                isLatest={i === 0}
                onSuggestionClick={onSuggestionClick}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

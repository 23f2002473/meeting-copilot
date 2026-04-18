'use client';

import { useState, useRef, useEffect } from 'react';
import { FileText, Loader2, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { SuggestionBatch } from '@/lib/types';
import clsx from 'clsx';

interface Props {
  transcript: string;
  suggestionBatches: SuggestionBatch[];
  apiKey: string;
  model: string;
  onStream: (stream: Response) => Promise<string>;
}

/** Minimal markdown → HTML renderer for the sections we emit */
function renderMarkdown(text: string): string {
  return (
    text
      // ## Heading
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      // **bold**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // - bullet
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Wrap consecutive <li> in <ul>
      .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
      // <hr>
      .replace(/^---$/gm, '<hr>')
      // Blank lines → paragraph breaks
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(?!<[hul]|<hr)(.+)$/gm, '<p>$1</p>')
      // Collapse empty <p></p>
      .replace(/<p><\/p>/g, '')
  );
}

export default function MinutesPanel({
  transcript,
  suggestionBatches,
  apiKey,
  model,
}: Props) {
  const [minutes, setMinutes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll while streaming
  useEffect(() => {
    if (isGenerating && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [minutes, isGenerating]);

  const generate = async () => {
    if (!apiKey) {
      setError('Add your Groq API key in Settings first.');
      return;
    }
    if (!transcript.trim()) {
      setError('No transcript yet — start recording first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setMinutes('');

    try {
      const res = await fetch('/api/minutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-groq-key': apiKey,
        },
        body: JSON.stringify({
          transcript,
          suggestionBatches: suggestionBatches.map((b) => ({
            timestamp: b.timestamp,
            suggestions: b.suggestions.map((s) => ({
              type: s.type,
              preview: s.preview,
            })),
          })),
          model,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate minutes');
      }

      // Read SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const token: string = parsed.choices?.[0]?.delta?.content ?? '';
              if (token) {
                accumulated += token;
                setMinutes(accumulated);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(minutes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasContent = minutes.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2130]">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
            Minutes of Meeting
          </h2>
          <p className="text-[10px] text-[#4b5263] mt-0.5">
            AI-generated from transcript + suggestions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasContent && (
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#9ba3b8] hover:text-[#e8eaf0] border border-[#1e2130] hover:border-[#2d3250] rounded-lg transition-colors"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}

          <button
            onClick={generate}
            disabled={isGenerating}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
              isGenerating
                ? 'opacity-60 cursor-not-allowed border-[#1e2130] text-[#4b5263]'
                : hasContent
                ? 'border-[#2d3250] text-[#9ba3b8] hover:text-[#e8eaf0] hover:border-[#3d4270]'
                : 'border-[#5865f2]/40 text-[#5865f2] hover:bg-[#5865f2]/10 hover:border-[#5865f2]'
            )}
          >
            {isGenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : hasContent ? (
              <RefreshCw className="w-3 h-3" />
            ) : (
              <FileText className="w-3 h-3" />
            )}
            {isGenerating ? 'Generating…' : hasContent ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-4 py-4">
        {!hasContent && !isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-full border border-[#1e2130] bg-[#1a1d2e] flex items-center justify-center mb-4">
              <FileText className="w-5 h-5 text-[#4b5263]" />
            </div>
            <p className="text-sm text-[#4b5263] max-w-[200px]">
              Click Generate to produce structured meeting minutes from your transcript
            </p>
          </div>
        ) : (
          <div
            className={clsx(
              'minutes-content text-sm text-[#e8eaf0] leading-relaxed',
              isGenerating && 'streaming-cursor'
            )}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(minutes) }}
          />
        )}
      </div>
    </div>
  );
}

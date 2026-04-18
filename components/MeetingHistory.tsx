'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, FileText, Loader2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface MeetingRecord {
  id: string;
  title: string;
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'ended' | 'processing';
  word_count: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(start: string, end: string | null) {
  if (!end) return 'Ongoing';
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ended: 'bg-[#1a1d2e] text-[#6b7280] border-[#1e2130]',
};

export default function MeetingHistory() {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/meetings');
      if (!res.ok) throw new Error('Failed to load meetings');
      const data = await res.json();
      setMeetings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Group meetings by date
  const grouped: Record<string, MeetingRecord[]> = {};
  for (const m of meetings) {
    const date = formatDate(m.started_at);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(m);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2130]">
        <div>
          <h2 className="text-sm font-semibold text-[#e8eaf0]">Meeting History</h2>
          <p className="text-xs text-[#6b7280] mt-0.5">{meetings.length} sessions recorded</p>
        </div>
        <button onClick={load} disabled={isLoading} className="p-1.5 text-[#6b7280] hover:text-[#e8eaf0] rounded-lg hover:bg-[#1a1d2e] transition-colors disabled:opacity-40">
          <RefreshCw className={clsx('w-3.5 h-3.5', isLoading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-[#5865f2] animate-spin" />
          </div>
        ) : error ? (
          <div className="text-xs text-red-400 px-2 py-3">{error}</div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full border border-[#1e2130] bg-[#1a1d2e] flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5 text-[#4b5263]" />
            </div>
            <p className="text-sm text-[#4b5263]">No meetings yet</p>
            <p className="text-xs text-[#4b5263] mt-1">Start recording to save meetings</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dayMeetings]) => (
            <div key={date} className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4b5263] px-2 mb-1.5">{date}</p>
              <div className="space-y-1.5">
                {dayMeetings.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-[#1e2130] bg-[#12141a] hover:border-[#2d3250] transition-colors cursor-default"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs font-medium text-[#e8eaf0] leading-tight">{m.title}</p>
                      <span className={clsx('shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border font-medium', STATUS_STYLE[m.status])}>
                        {m.status === 'processing' ? 'Indexing…' : m.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[#6b7280]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(m.started_at, m.ended_at)}
                      </span>
                      {m.word_count > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {m.word_count.toLocaleString()} words
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

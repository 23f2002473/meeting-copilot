'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Mic, Brain, LogIn, Plus, Clock, FileText,
  BarChart2, ChevronRight, Loader2, LogOut
} from 'lucide-react';
import { signOut } from 'next-auth/react';
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
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(start: string, end: string | null) {
  if (!end) return '—';
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const STATUS_BADGE: Record<string, string> = {
  active:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  processing: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
  ended:      'bg-[#1a1d2e]     text-[#6b7280]  border-[#1e2130]',
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [meetings, setMeetings]   = useState<MeetingRecord[]>([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (session?.user) {
      setLoading(true);
      fetch('/api/meetings')
        .then(r => r.json())
        .then(data => setMeetings(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [session]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalMeetings  = meetings.filter(m => m.status === 'ended').length;
  const totalWords     = meetings.reduce((s, m) => s + (m.word_count || 0), 0);
  const totalMins      = meetings.reduce((s, m) => {
    if (!m.ended_at) return s;
    return s + Math.round(
      (new Date(m.ended_at).getTime() - new Date(m.started_at).getTime()) / 60000
    );
  }, 0);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0b0f]">
        <Loader2 className="w-6 h-6 text-[#5865f2] animate-spin" />
      </div>
    );
  }

  // ── Not signed in — Landing page ─────────────────────────────────────────
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex flex-col">
        {/* Nav */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e2130]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5865f2] flex items-center justify-center text-base">🧠</div>
            <span className="text-base font-semibold text-[#e8eaf0]">MindCopilot</span>
          </div>
          <button
            onClick={() => signIn('google')}
            className="flex items-center gap-2 px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-medium rounded-xl transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign in with Google
          </button>
        </header>

        {/* Hero */}
        <div className="flex flex-col items-center justify-center flex-1 text-center px-4 py-20">
          <div className="w-20 h-20 rounded-3xl bg-[#5865f2]/15 border border-[#5865f2]/25 flex items-center justify-center mb-8 text-4xl">
            🧠
          </div>
          <h1 className="text-4xl font-bold text-[#e8eaf0] mb-4 leading-tight">
            Your AI Meeting Copilot
          </h1>
          <p className="text-lg text-[#6b7280] max-w-xl mb-10 leading-relaxed">
            Real-time transcription, live suggestions, and a personal memory that
            remembers every decision, action item, and discussion — forever.
          </p>
          <button
            onClick={() => signIn('google')}
            className="flex items-center gap-2.5 px-6 py-3 bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold rounded-xl transition-colors text-sm shadow-lg shadow-[#5865f2]/20"
          >
            <LogIn className="w-4 h-4" />
            Get started with Google
          </button>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-2xl w-full">
            {[
              { icon: '🎙️', title: 'Live Transcription', desc: 'Whisper Large V3 captures every word in real time' },
              { icon: '💡', title: 'Smart Suggestions', desc: '3 contextual cards every 30s — questions, insights, fact-checks' },
              { icon: '🔍', title: 'Meeting Memory', desc: 'Ask questions about any past meeting using semantic search' },
            ].map(f => (
              <div key={f.title} className="p-5 rounded-2xl border border-[#1e2130] bg-[#12141a] text-left">
                <div className="text-2xl mb-3">{f.icon}</div>
                <p className="text-sm font-semibold text-[#e8eaf0] mb-1">{f.title}</p>
                <p className="text-xs text-[#6b7280] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Signed in — Dashboard ─────────────────────────────────────────────────
  const user = session.user as { id: string; name?: string; email?: string; image?: string };

  return (
    <div className="min-h-screen bg-[#0a0b0f] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-[#1e2130] bg-[#0e1016] sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#5865f2] flex items-center justify-center text-base">🧠</div>
          <span className="text-base font-semibold text-[#e8eaf0]">MindCopilot</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/memory"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9ba3b8] hover:text-[#e8eaf0] border border-[#1e2130] hover:border-[#2d3250] rounded-lg transition-colors"
          >
            <Brain className="w-3.5 h-3.5" />
            Memory
          </Link>
          {user.image && (
            <Image src={user.image} alt="" width={28} height={28} className="rounded-full ring-1 ring-[#2d3250]" />
          )}
          <span className="text-xs text-[#9ba3b8] hidden sm:block">{user.name}</span>
          <button onClick={() => signOut()} className="p-1.5 text-[#6b7280] hover:text-[#e8eaf0] rounded-lg transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#e8eaf0] mb-1">
            Welcome back, {user.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-[#6b7280]">Ready to start your next meeting?</p>
        </div>

        {/* CTA */}
        <Link
          href="/meeting"
          className="flex items-center justify-between px-6 py-5 rounded-2xl bg-[#5865f2] hover:bg-[#4752c4] transition-all shadow-lg shadow-[#5865f2]/20 mb-8 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">Start New Meeting</p>
              <p className="text-xs text-white/60 mt-0.5">Transcription + live suggestions + saved to memory</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: BarChart2, label: 'Meetings recorded', value: totalMeetings },
            { icon: Clock,     label: 'Total hours',       value: totalMins >= 60 ? `${(totalMins/60).toFixed(1)}h` : `${totalMins}m` },
            { icon: FileText,  label: 'Words transcribed', value: totalWords > 1000 ? `${(totalWords/1000).toFixed(1)}k` : totalWords },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl border border-[#1e2130] bg-[#12141a]">
              <s.icon className="w-4 h-4 text-[#5865f2] mb-2" />
              <p className="text-xl font-bold text-[#e8eaf0]">{s.value || '—'}</p>
              <p className="text-[11px] text-[#6b7280] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Memory shortcut */}
        <Link
          href="/memory"
          className="flex items-center justify-between px-5 py-4 rounded-2xl border border-[#1e2130] bg-[#12141a] hover:border-[#5865f2]/30 hover:bg-[#5865f2]/5 transition-all mb-8 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5865f2]/10 border border-[#5865f2]/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#5865f2]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#e8eaf0]">Ask your Meeting Memory</p>
              <p className="text-xs text-[#6b7280] mt-0.5">"What decisions were made last week?" · "Who owns the backend task?"</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#4b5263] group-hover:text-[#5865f2] transition-colors" />
        </Link>

        {/* Recent meetings */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3">Recent Meetings</h2>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-[#5865f2] animate-spin" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-[#1e2130] rounded-2xl text-center">
              <Mic className="w-8 h-8 text-[#2d3250] mb-3" />
              <p className="text-sm text-[#4b5263]">No meetings yet</p>
              <p className="text-xs text-[#4b5263] mt-1">Start your first meeting above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {meetings.slice(0, 10).map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-[#1e2130] bg-[#12141a] hover:border-[#2d3250] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#1a1d2e] flex items-center justify-center shrink-0">
                      <Mic className="w-3.5 h-3.5 text-[#6b7280]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-[#e8eaf0] truncate">{m.title}</p>
                      <p className="text-[11px] text-[#6b7280] mt-0.5">
                        {formatDate(m.started_at)} · {formatTime(m.started_at)} · {formatDuration(m.started_at, m.ended_at)}
                        {m.word_count > 0 && ` · ${m.word_count.toLocaleString()} words`}
                      </p>
                    </div>
                  </div>
                  <span className={clsx('shrink-0 ml-4 text-[10px] px-2 py-0.5 rounded-md border font-medium', STATUS_BADGE[m.status])}>
                    {m.status === 'processing' ? 'Indexing…' : m.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useSession, signIn } from 'next-auth/react';
import { Brain, LogIn, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import MeetingHistory from '@/components/MeetingHistory';
import MemoryAssistant from '@/components/MemoryAssistant';
import { loadSettings } from '@/lib/client-settings';

export default function MemoryPage() {
  const { data: session, status } = useSession();
  const settings = loadSettings();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0b0f]">
        <div className="w-6 h-6 border-2 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0b0f] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-[#5865f2]/10 border border-[#5865f2]/20 flex items-center justify-center mb-6">
          <Brain className="w-7 h-7 text-[#5865f2]" />
        </div>
        <h1 className="text-xl font-semibold text-[#e8eaf0] mb-2">Meeting Memory</h1>
        <p className="text-sm text-[#6b7280] max-w-sm mb-6">
          Sign in with Google to access your personal meeting memory — search decisions, action items, and discussions from past meetings.
        </p>
        <button
          onClick={() => signIn('google')}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <LogIn className="w-4 h-4" />
          Sign in with Google
        </button>
        <Link href="/" className="mt-4 text-xs text-[#6b7280] hover:text-[#9ba3b8] flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          Back to meeting room
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0b0f] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e2130] bg-[#0e1016] shrink-0">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-1.5 text-[#6b7280] hover:text-[#e8eaf0] transition-colors text-xs mr-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
          <div className="w-7 h-7 rounded-lg bg-[#5865f2] flex items-center justify-center text-sm">
            🧠
          </div>
          <div>
            <span className="text-sm font-semibold text-[#e8eaf0]">Meeting Memory</span>
            <span className="text-xs text-[#4b5263] ml-2">
              {session.user.name ?? session.user.email}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9ba3b8] hover:text-[#e8eaf0] border border-[#1e2130] hover:border-[#2d3250] rounded-lg transition-colors"
          >
            New Meeting
          </Link>
        </div>
      </header>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — meeting history */}
        <div className="w-[320px] shrink-0 border-r border-[#1e2130] flex flex-col overflow-hidden bg-[#0e1016]">
          <MeetingHistory />
        </div>

        {/* Right — memory assistant */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0b0f]">
          <MemoryAssistant
            groqApiKey={settings.groqApiKey}
            model={settings.chatModel}
          />
        </div>
      </div>
    </div>
  );
}

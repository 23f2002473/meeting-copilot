'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#6b7280]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name ?? ''}
            width={24}
            height={24}
            className="rounded-full ring-1 ring-[#2d3250]"
          />
        )}
        <span className="text-xs text-[#9ba3b8] hidden sm:block max-w-[120px] truncate">
          {session.user.name ?? session.user.email}
        </span>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#6b7280] hover:text-[#e8eaf0] border border-[#1e2130] hover:border-[#2d3250] rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#5865f2] hover:bg-[#4752c4] rounded-lg transition-colors"
    >
      <LogIn className="w-3.5 h-3.5" />
      Sign in with Google
    </button>
  );
}

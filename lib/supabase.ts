import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Server-side client with full privileges (API routes only) */
export function getServerSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/** Public client (browser-safe, respects RLS) */
export function getBrowserSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

export type Meeting = {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  title: string;
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'ended' | 'processing';
  full_transcript: string;
  suggestions_json: unknown[];
  chat_json: unknown[];
  word_count: number;
  minutes_text: string;
};

export type MeetingChunk = {
  id: string;
  meeting_id: string;
  user_id: string;
  content: string;
  chunk_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  similarity?: number;
};

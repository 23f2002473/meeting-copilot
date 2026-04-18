import { getServerSession } from 'next-auth';
import { getServerSupabase } from '@/lib/supabase';

/** GET /api/debug/memory — shows what's actually in the DB for this user */
export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = session.user as { id: string; email?: string };
  const supabase = getServerSupabase();

  // Check meetings
  const { data: meetings, error: mErr } = await supabase
    .from('meetings')
    .select('id, title, status, word_count, started_at, ended_at')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(10);

  // Check chunks
  const { data: chunks, error: cErr } = await supabase
    .from('meeting_chunks')
    .select('id, meeting_id, chunk_type, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  // Count chunks
  const { count } = await supabase
    .from('meeting_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return Response.json({
    user: { id: user.id, email: user.email },
    meetings: { count: meetings?.length ?? 0, error: mErr?.message, data: meetings },
    chunks: {
      total: count ?? 0,
      error: cErr?.message,
      recent: chunks?.map(c => ({
        id: c.id,
        meeting_id: c.meeting_id,
        type: c.chunk_type,
        preview: c.content?.slice(0, 80),
      })),
    },
  });
}

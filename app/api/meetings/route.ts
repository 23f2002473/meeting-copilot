import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase';

/** POST — create a new meeting session */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = session.user as { id: string; email?: string; name?: string };
  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      user_id: user.id,
      user_email: user.email ?? null,
      user_name: user.name ?? null,
      title: `Meeting — ${new Date().toLocaleDateString()}`,
      status: 'active',
    })
    .select('id, title, started_at')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

/** GET — list all meetings for the logged-in user */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = session.user as { id: string };
  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('meetings')
    .select('id, title, started_at, ended_at, status, word_count')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

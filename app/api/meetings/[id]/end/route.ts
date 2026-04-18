import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getServerSupabase } from '@/lib/supabase';
import { processMeetingIntoMemory } from '@/lib/meeting-processor';

export const maxDuration = 300; // 5 min — embedding generation takes time

interface EndBody {
  fullTranscript: string;
  suggestionsJson: unknown[];
  chatJson: unknown[];
  groqApiKey: string;
  model: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = session.user as { id: string; name?: string };
  const meetingId = params.id;
  const body: EndBody = await req.json();
  const { fullTranscript, suggestionsJson, chatJson, groqApiKey, model } = body;

  const supabase = getServerSupabase();

  // Verify ownership
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, title, started_at')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single();

  if (!meeting) {
    return Response.json({ error: 'Meeting not found' }, { status: 404 });
  }

  // Mark as processing and save raw data
  await supabase.from('meetings').update({
    status: 'processing',
    full_transcript: fullTranscript,
    suggestions_json: suggestionsJson,
    chat_json: chatJson,
    word_count: fullTranscript.split(/\s+/).filter(Boolean).length,
  }).eq('id', meetingId);

  // Run the full processing pipeline (chunk → embed → store)
  try {
    await processMeetingIntoMemory({
      meetingId,
      userId: user.id,
      meetingTitle: meeting.title,
      meetingDate: meeting.started_at,
      fullTranscript,
      groqApiKey,
      model,
    });
  } catch (err) {
    console.error('Meeting processing error:', err);
    // Still mark as ended even if embedding failed
    await supabase.from('meetings').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', meetingId);
    return Response.json({ error: 'Processing failed', meetingId }, { status: 500 });
  }

  return Response.json({ success: true, meetingId });
}

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase';

export const maxDuration = 60;

interface EndBody {
  fullTranscript: string;
  suggestionsJson: unknown[];
  chatJson: unknown[];
  groqApiKey: string;
  model: string;
}

/** Split text into ~400-word chunks with 50-word overlap */
function chunkText(text: string, wordsPerChunk = 400, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start += wordsPerChunk - overlap;
  }
  return chunks;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
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

  const wordCount = fullTranscript.split(/\s+/).filter(Boolean).length;

  // Save raw meeting data
  await supabase.from('meetings').update({
    status: 'processing',
    full_transcript: fullTranscript,
    suggestions_json: suggestionsJson,
    chat_json: chatJson,
    word_count: wordCount,
  }).eq('id', meetingId);

  // ── Step 1: Insert transcript chunks (fast, no external calls) ─────────────
  if (fullTranscript.trim()) {
    const meta = {
      meeting_title: meeting.title ?? 'Untitled Meeting',
      meeting_date: meeting.started_at,
    };

    const textChunks = chunkText(fullTranscript).map(c => ({
      meeting_id: meetingId,
      user_id: user.id,
      content: c,
      chunk_type: 'transcript',
      metadata: meta,
    }));

    if (textChunks.length > 0) {
      const { error: insertError } = await supabase
        .from('meeting_chunks')
        .insert(textChunks);

      if (insertError) {
        console.error('Chunk insert error:', insertError.message, insertError.details);
        // Don't fail the whole request — still mark meeting as ended
      }
    }
  }

  // Mark meeting as ended
  await supabase
    .from('meetings')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', meetingId);

  // ── Step 2: Try structured extraction (best-effort, don't block) ───────────
  // Fire-and-forget: if Groq is slow or fails, the transcript chunks are already saved
  if (fullTranscript.trim() && groqApiKey && model) {
    extractAndStoreStructured(
      fullTranscript,
      groqApiKey,
      model,
      meetingId,
      user.id,
      { meeting_title: meeting.title ?? 'Untitled Meeting', meeting_date: meeting.started_at }
    ).catch(err => console.error('Structured extraction failed (non-critical):', err));
  }

  return Response.json({ success: true, meetingId, wordCount });
}

async function extractAndStoreStructured(
  transcript: string,
  apiKey: string,
  model: string,
  meetingId: string,
  userId: string,
  meta: Record<string, string>
) {
  const supabase = getServerSupabase();

  const prompt = `Extract information from this meeting transcript. Be specific and only include what was explicitly stated.

TRANSCRIPT:
${transcript.slice(0, 10000)}

Return ONLY valid JSON — no other text:
{
  "decisions": ["..."],
  "action_items": ["Person: task description"],
  "key_insights": ["important fact or point made"],
  "open_questions": ["questions raised but not resolved"]
}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) return;

  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? '{}';
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  const rows: object[] = [];
  const add = (items: string[], type: string, prefix: string) => {
    for (const item of items ?? []) {
      if (item?.trim()) {
        rows.push({
          meeting_id: meetingId,
          user_id: userId,
          content: `${prefix}: ${item}`,
          chunk_type: type,
          metadata: meta,
        });
      }
    }
  };

  add(parsed.decisions, 'decision', 'Decision');
  add(parsed.action_items, 'action_item', 'Action item');
  add(parsed.key_insights, 'key_insight', 'Key insight');
  add(parsed.open_questions, 'open_question', 'Open question');

  if (rows.length > 0) {
    await supabase.from('meeting_chunks').insert(rows);
  }
}

/**
 * Post-meeting processing pipeline.
 * Chunks transcript, extracts structured info via Groq, stores in Supabase.
 * No local ML model — works within Vercel serverless limits.
 */

import { getServerSupabase } from './supabase';

interface ProcessMeetingParams {
  meetingId: string;
  userId: string;
  meetingTitle: string;
  meetingDate: string;
  fullTranscript: string;
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

export async function processMeetingIntoMemory(params: ProcessMeetingParams) {
  const { meetingId, userId, meetingTitle, meetingDate, fullTranscript, groqApiKey, model } = params;

  if (!fullTranscript.trim()) {
    // Still mark meeting as ended even with no transcript
    const supabase = getServerSupabase();
    await supabase.from('meetings').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', meetingId);
    return;
  }

  const supabase = getServerSupabase();
  const meta = { meeting_title: meetingTitle, meeting_date: meetingDate };

  // ── Step 1: Transcript chunks ──────────────────────────────────────────────
  const transcriptChunks = chunkText(fullTranscript).map(c => ({
    meeting_id: meetingId,
    user_id: userId,
    content: c,
    chunk_type: 'transcript',
    metadata: meta,
  }));

  // ── Step 2: Structured extraction via Groq ─────────────────────────────────
  const structured = await extractStructured(fullTranscript, groqApiKey, model, meta, meetingId, userId);

  // ── Step 3: Insert all chunks ──────────────────────────────────────────────
  const allChunks = [...transcriptChunks, ...structured];
  if (allChunks.length > 0) {
    const { error } = await supabase.from('meeting_chunks').insert(allChunks);
    if (error) console.error('Chunk insert error:', error.message);
  }

  // ── Step 4: Mark ended ─────────────────────────────────────────────────────
  await supabase
    .from('meetings')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', meetingId);
}

async function extractStructured(
  transcript: string,
  apiKey: string,
  model: string,
  meta: Record<string, string>,
  meetingId: string,
  userId: string,
): Promise<object[]> {
  const prompt = `Extract information from this meeting transcript. Be specific and only include what was explicitly stated.

TRANSCRIPT:
${transcript.slice(0, 12000)}

Return ONLY valid JSON — no other text:
{
  "decisions": ["..."],
  "action_items": ["Person: task description"],
  "key_insights": ["important fact or point made"],
  "open_questions": ["questions raised but not resolved"]
}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 1500 }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content ?? '{}';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const rows: object[] = [];
    const add = (items: string[], type: string, prefix: string) => {
      for (const item of items ?? []) {
        if (item?.trim()) rows.push({ meeting_id: meetingId, user_id: userId, content: `${prefix}: ${item}`, chunk_type: type, metadata: meta });
      }
    };

    add(parsed.decisions,       'decision',      'Decision');
    add(parsed.action_items,    'action_item',   'Action item');
    add(parsed.key_insights,    'key_insight',   'Key insight');
    add(parsed.open_questions,  'open_question', 'Open question');

    return rows;
  } catch {
    return [];
  }
}

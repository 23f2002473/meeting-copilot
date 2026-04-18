/**
 * Post-meeting processing pipeline.
 * Called when a user ends a meeting session.
 *
 * Pipeline:
 * 1. Chunk the full transcript into ~400-word segments
 * 2. Use Groq to extract decisions, action items, and key insights as structured text
 * 3. Generate embeddings for all chunks via transformers.js
 * 4. Upsert everything into Supabase meeting_chunks for RAG retrieval
 */

import { getServerSupabase } from './supabase';
import { embed, chunkText } from './embeddings';

interface ProcessMeetingParams {
  meetingId: string;
  userId: string;
  meetingTitle: string;
  meetingDate: string;
  fullTranscript: string;
  groqApiKey: string;
  model: string;
}

export async function processMeetingIntoMemory(params: ProcessMeetingParams) {
  const { meetingId, userId, meetingTitle, meetingDate, fullTranscript, groqApiKey, model } = params;

  if (!fullTranscript.trim()) return;

  const supabase = getServerSupabase();
  const chunkMeta = { meeting_title: meetingTitle, meeting_date: meetingDate, meeting_id: meetingId };

  // ── Step 1: Transcript chunks ──────────────────────────────────────────────
  const transcriptChunks = chunkText(fullTranscript, 400, 50);

  // ── Step 2: Extract structured insights via Groq ───────────────────────────
  const structuredChunks = await extractStructuredChunks(fullTranscript, groqApiKey, model);

  // ── Step 3: Build all chunk records ───────────────────────────────────────
  const allChunks: Array<{
    content: string;
    chunk_type: string;
  }> = [
    ...transcriptChunks.map((c) => ({ content: c, chunk_type: 'transcript' })),
    ...structuredChunks,
  ];

  // ── Step 4: Generate embeddings + upsert ──────────────────────────────────
  // Process in batches of 5 to avoid memory spikes
  const BATCH = 5;
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const batch = allChunks.slice(i, i + BATCH);
    const embeddings = await Promise.all(batch.map((c) => embed(c.content)));

    const rows = batch.map((c, idx) => ({
      meeting_id: meetingId,
      user_id: userId,
      content: c.content,
      chunk_type: c.chunk_type,
      embedding: `[${embeddings[idx].join(',')}]`,
      metadata: chunkMeta,
    }));

    await supabase.from('meeting_chunks').insert(rows);
  }

  // ── Step 5: Mark meeting as ended ─────────────────────────────────────────
  await supabase
    .from('meetings')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', meetingId);
}

/** Use Groq to extract decisions, action items, and key insights as plain text chunks. */
async function extractStructuredChunks(
  transcript: string,
  apiKey: string,
  model: string
): Promise<Array<{ content: string; chunk_type: string }>> {
  if (!transcript.trim() || transcript.length < 200) return [];

  const prompt = `Analyze this meeting transcript and extract the following. Be specific — only include items explicitly stated, do not invent.

TRANSCRIPT:
${transcript.slice(0, 12000)}

Return a JSON object with these fields (each is an array of strings):
{
  "decisions": ["..."],        // Explicit decisions or conclusions reached
  "action_items": ["..."],     // Tasks assigned or next steps committed to (format: "Person: task")
  "key_insights": ["..."],     // Important facts, numbers, or points made
  "open_questions": ["..."]    // Questions raised but not answered
}

Output ONLY the JSON, no other text.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content ?? '{}';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const chunks: Array<{ content: string; chunk_type: string }> = [];

    for (const decision of (parsed.decisions ?? []) as string[]) {
      if (decision.trim()) chunks.push({ content: `Decision: ${decision}`, chunk_type: 'decision' });
    }
    for (const item of (parsed.action_items ?? []) as string[]) {
      if (item.trim()) chunks.push({ content: `Action item: ${item}`, chunk_type: 'action_item' });
    }
    for (const insight of (parsed.key_insights ?? []) as string[]) {
      if (insight.trim()) chunks.push({ content: `Key insight: ${insight}`, chunk_type: 'key_insight' });
    }
    for (const q of (parsed.open_questions ?? []) as string[]) {
      if (q.trim()) chunks.push({ content: `Open question: ${q}`, chunk_type: 'open_question' });
    }

    return chunks;
  } catch {
    return [];
  }
}

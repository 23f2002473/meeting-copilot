import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getServerSupabase } from '@/lib/supabase';
import { embed } from '@/lib/embeddings';

export const maxDuration = 60;

interface QueryBody {
  question: string;
  groqApiKey: string;
  model: string;
}

const MEMORY_SYSTEM_PROMPT = `You are a personal meeting memory assistant. You have access to relevant excerpts from the user's past meetings, retrieved by semantic similarity to their question.

Your job is to give accurate, grounded answers based ONLY on what appears in the provided meeting excerpts.

Rules:
- Always specify WHICH meeting the information came from (title + date)
- Be specific — quote or paraphrase exact statements from the excerpts
- If a question isn't answered by the excerpts, say clearly: "I couldn't find this in your meeting history"
- For action items, always include the assigned person if mentioned
- Format decisions, action items, and open questions as bullet lists for clarity
- Be concise and direct — no fluff`;

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = session.user as { id: string };
  const body: QueryBody = await req.json();
  const { question, groqApiKey, model } = body;

  // ── Step 1: Generate embedding for the query ───────────────────────────────
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embed(question);
  } catch (err) {
    console.error('Embedding error:', err);
    // Fallback to full-text search if embedding fails
    return fallbackTextSearch(question, user.id, groqApiKey, model, req);
  }

  // ── Step 2: Vector similarity search in Supabase ──────────────────────────
  const supabase = getServerSupabase();

  const { data: vectorResults, error } = await supabase.rpc('match_meeting_chunks', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_user_id: user.id,
    match_count: 8,
    match_threshold: 0.25,
  });

  // ── Step 3: Full-text search fallback / supplement ────────────────────────
  let textResults: Array<{ content: string; chunk_type: string; metadata: Record<string, unknown> }> = [];
  if (!vectorResults?.length) {
    const { data } = await supabase
      .from('meeting_chunks')
      .select('content, chunk_type, metadata')
      .eq('user_id', user.id)
      .textSearch('content', question.split(' ').slice(0, 5).join(' | '), { type: 'websearch' })
      .limit(6);
    textResults = data ?? [];
  }

  const chunks = vectorResults?.length ? vectorResults : textResults;

  if (!chunks || chunks.length === 0) {
    return streamAnswer(
      "I couldn't find any relevant information in your meeting history for that question. Try recording and ending a meeting first so it gets processed into your memory.",
      groqApiKey,
      model,
      []
    );
  }

  // ── Step 4: Build context for Groq ────────────────────────────────────────
  const context = chunks
    .map((c: { content: string; chunk_type: string; metadata: Record<string, unknown>; similarity?: number }, i: number) => {
      const meta = c.metadata as { meeting_title?: string; meeting_date?: string };
      const dateStr = meta.meeting_date
        ? new Date(meta.meeting_date).toLocaleDateString()
        : 'unknown date';
      return `[Excerpt ${i + 1} — ${meta.meeting_title ?? 'Untitled'} (${dateStr}), type: ${c.chunk_type}]\n${c.content}`;
    })
    .join('\n\n');

  return streamAnswer(question, groqApiKey, model, chunks, context);
}

async function streamAnswer(
  question: string,
  apiKey: string,
  model: string,
  _chunks: unknown[],
  context?: string
) {
  const userContent = context
    ? `RELEVANT MEETING EXCERPTS:\n\n${context}\n\n---\nUSER QUESTION: ${question}`
    : question;

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: MEMORY_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 1024,
      stream: true,
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.json();
    return Response.json({ error: err?.error?.message }, { status: groqRes.status });
  }

  return new Response(groqRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

async function fallbackTextSearch(
  question: string,
  userId: string,
  apiKey: string,
  model: string,
  _req: NextRequest
) {
  const supabase = getServerSupabase();
  const keywords = question.split(/\s+/).slice(0, 6).join(' | ');

  const { data } = await supabase
    .from('meeting_chunks')
    .select('content, chunk_type, metadata')
    .eq('user_id', userId)
    .textSearch('content', keywords, { type: 'websearch' })
    .limit(6);

  return streamAnswer(question, apiKey, model, data ?? [], data?.map((c: { content: string; chunk_type: string; metadata: Record<string, unknown> }, i: number) => {
    const meta = c.metadata as { meeting_title?: string; meeting_date?: string };
    return `[Excerpt ${i + 1} — ${meta.meeting_title ?? 'Untitled'}]\n${c.content}`;
  }).join('\n\n'));
}

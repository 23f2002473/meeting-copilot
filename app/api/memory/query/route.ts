import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getServerSupabase } from '@/lib/supabase';

export const maxDuration = 60;

interface QueryBody {
  question: string;
  groqApiKey: string;
  model: string;
}

const MEMORY_SYSTEM_PROMPT = `You are a personal meeting memory assistant. You have access to relevant excerpts from the user's past meetings.

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

  const supabase = getServerSupabase();

  // ── Full-text search via PostgreSQL tsvector ───────────────────────────────
  // Try websearch first (supports AND/OR/phrase), fall back to keyword OR search
  const keywords = question.split(/\s+/).filter(Boolean).slice(0, 8).join(' | ');

  let chunks: Array<{ content: string; chunk_type: string; metadata: Record<string, unknown> }> = [];

  // Try websearch_to_tsquery format first
  const { data: ftsData, error: ftsError } = await supabase
    .from('meeting_chunks')
    .select('content, chunk_type, metadata')
    .eq('user_id', user.id)
    .textSearch('content', keywords, { type: 'websearch' })
    .order('created_at', { ascending: false })
    .limit(10);

  if (!ftsError && ftsData && ftsData.length > 0) {
    chunks = ftsData;
  } else {
    // Fallback: get the most recent chunks from recent meetings
    const { data: recentData } = await supabase
      .from('meeting_chunks')
      .select('content, chunk_type, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12);
    chunks = recentData ?? [];
  }

  if (chunks.length === 0) {
    return streamAnswer(
      "I couldn't find any relevant information in your meeting history for that question. Try recording and ending a meeting first so it gets processed into your memory.",
      groqApiKey,
      model,
      []
    );
  }

  // ── Build context for Groq ────────────────────────────────────────────────
  const context = chunks
    .map((c, i) => {
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

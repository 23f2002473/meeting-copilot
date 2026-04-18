import { NextRequest } from 'next/server';

export const maxDuration = 60;

interface MinutesBody {
  transcript: string;
  suggestionBatches: Array<{
    timestamp: string;
    suggestions: Array<{ type: string; preview: string }>;
  }>;
  model: string;
}

const MINUTES_SYSTEM_PROMPT = `You are an expert meeting secretary. Given a meeting transcript and the AI suggestions that were surfaced during the meeting, produce clean, professional Minutes of Meeting.

Structure your output in this exact format using markdown:

## Meeting Summary
2-3 sentence executive summary of what the meeting was about.

## Key Discussion Points
Bullet list of the main topics discussed, with brief context.

## Decisions Made
Bullet list of any decisions, conclusions, or agreements reached. If none explicitly stated, write "No explicit decisions recorded."

## Action Items
Bullet list of tasks, follow-ups, or next steps mentioned. Format: **Owner (if named):** Task description. If none, write "No action items explicitly mentioned."

## Open Questions
Bullet list of questions raised that were not answered, or topics needing follow-up.

## Key Insights Surfaced
Bullet list drawing from the AI suggestions that were most relevant, rephrased as meeting insights.

---
Be specific — reference actual names, numbers, and topics from the transcript. Do not pad with generic filler.`;

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-groq-key');
  if (!apiKey) {
    return Response.json({ error: 'Missing Groq API key' }, { status: 401 });
  }

  const body: MinutesBody = await req.json();
  const { transcript, suggestionBatches, model } = body;

  if (!transcript?.trim()) {
    return Response.json({ error: 'No transcript to summarize' }, { status: 400 });
  }

  const suggestionContext =
    suggestionBatches.length > 0
      ? suggestionBatches
          .flatMap((b) => b.suggestions)
          .map((s) => `- [${s.type}] ${s.preview}`)
          .join('\n')
      : 'No suggestions recorded.';

  const userPrompt = `## MEETING TRANSCRIPT\n${transcript}\n\n## AI SUGGESTIONS SURFACED DURING MEETING\n${suggestionContext}\n\n## TASK\nGenerate professional Minutes of Meeting based on the above.`;

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: MINUTES_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.json();
    return Response.json(
      { error: err?.error?.message || 'Minutes generation failed' },
      { status: groqRes.status }
    );
  }

  return new Response(groqRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

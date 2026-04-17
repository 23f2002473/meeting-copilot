import { NextRequest } from 'next/server';

export const maxDuration = 30;

interface SuggestBody {
  recentTranscript: string;
  fullTranscript: string;
  previousSuggestions: string;
  systemPrompt: string;
  model: string;
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-groq-key');
  if (!apiKey) {
    return Response.json({ error: 'Missing Groq API key' }, { status: 401 });
  }

  const body: SuggestBody = await req.json();
  const {
    recentTranscript,
    fullTranscript,
    previousSuggestions,
    systemPrompt,
    model,
  } = body;

  const userPrompt = buildSuggestionUserPrompt({
    recentTranscript,
    fullTranscript,
    previousSuggestions,
  });

  const groqRes = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.75,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
    }
  );

  const data = await groqRes.json();

  if (!groqRes.ok) {
    const msg = data?.error?.message || 'Suggestion generation failed';
    return Response.json({ error: msg }, { status: groqRes.status });
  }

  const rawContent: string = data.choices?.[0]?.message?.content ?? '{}';
  return Response.json({ raw: rawContent });
}

function buildSuggestionUserPrompt({
  recentTranscript,
  fullTranscript,
  previousSuggestions,
}: {
  recentTranscript: string;
  fullTranscript: string;
  previousSuggestions: string;
}): string {
  const sections: string[] = [];

  sections.push(
    `## RECENT TRANSCRIPT (last ~3 minutes — highest priority)\n${recentTranscript || '[No transcript yet]'}`
  );

  if (fullTranscript && fullTranscript.length > recentTranscript.length) {
    sections.push(
      `## FULL TRANSCRIPT CONTEXT (for deeper understanding)\n${fullTranscript}`
    );
  }

  if (previousSuggestions) {
    sections.push(
      `## PREVIOUS SUGGESTIONS (DO NOT REPEAT THESE)\n${previousSuggestions}`
    );
  }

  sections.push(
    `## TASK\nGenerate exactly 3 fresh, specific, diverse suggestions based on what was JUST discussed. Use the recent transcript as your primary signal.`
  );

  return sections.join('\n\n');
}

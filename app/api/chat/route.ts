import { NextRequest } from 'next/server';

export const maxDuration = 60;

interface ChatBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  transcript: string;
  systemPrompt: string;
  model: string;
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-groq-key');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Missing Groq API key' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body: ChatBody = await req.json();
  const { messages, transcript, systemPrompt, model } = body;

  const systemWithContext = buildSystemWithContext(systemPrompt, transcript);

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
          { role: 'system', content: systemWithContext },
          ...messages,
        ],
        temperature: 0.6,
        max_tokens: 1024,
        stream: true,
      }),
    }
  );

  if (!groqRes.ok) {
    const err = await groqRes.json();
    return new Response(
      JSON.stringify({ error: err?.error?.message || 'Chat failed' }),
      { status: groqRes.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Stream SSE directly to client
  return new Response(groqRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function buildSystemWithContext(systemPrompt: string, transcript: string): string {
  if (!transcript) return systemPrompt;
  return `${systemPrompt}

━━━ MEETING TRANSCRIPT (your grounding context) ━━━
${transcript}
━━━ END TRANSCRIPT ━━━

Use the transcript above to give specific, grounded answers. Reference what was actually said.`;
}

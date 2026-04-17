import { NextRequest } from 'next/server';

export const maxDuration = 60; // seconds

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-groq-key');
  if (!apiKey) {
    return Response.json({ error: 'Missing Groq API key' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const audioFile = formData.get('file') as File | null;
  const model = (formData.get('model') as string) || 'whisper-large-v3';

  if (!audioFile || audioFile.size === 0) {
    return Response.json({ error: 'No audio file provided' }, { status: 400 });
  }

  const groqForm = new FormData();
  groqForm.append('file', audioFile, 'audio.webm');
  groqForm.append('model', model);
  groqForm.append('response_format', 'json');
  groqForm.append('language', 'en');

  const groqRes = await fetch(
    'https://api.groq.com/openai/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    }
  );

  const data = await groqRes.json();

  if (!groqRes.ok) {
    const msg = data?.error?.message || 'Transcription failed';
    return Response.json({ error: msg }, { status: groqRes.status });
  }

  return Response.json({ text: (data.text as string).trim() });
}

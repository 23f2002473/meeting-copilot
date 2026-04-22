# MindCopilot — Real-time Meeting Assistant

A web app that listens to live audio from your mic, transcribes it with Groq Whisper, and continuously surfaces 3 intelligent suggestions based on what's being said. Click a suggestion to get a detailed, grounded answer in the chat panel.

## Features

- **Live transcription** — Groq Whisper Large V3, chunked every 30s
- **Smart suggestions** — 3 contextual cards every refresh cycle: questions, insights, fact-checks, talking points, or answers
- **Streaming chat** — click any suggestion or type a question; gets full transcript context
- **Export** — full session JSON: transcript + suggestion batches + chat history with timestamps
- **Settings panel** — configure API key, models, prompts, context windows, refresh interval

## Models

| Purpose | Model |
|---------|-------|
| Transcription | `whisper-large-v3` |
| Suggestions + Chat | `llama-3.3-70b-versatile` (configurable) |

## Quickstart

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Settings → Add API Key**, paste your Groq key, then click **Start** to begin recording.

## Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Or connect the repo in [vercel.com](https://vercel.com) and it deploys automatically.
## LINK
- **[https://meeting-copilot-ruddy.vercel.app/](https://meeting-copilot-ruddy.vercel.app/)

## Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --build --prod
```

## Architecture

```
Browser                     Next.js API Routes         Groq
──────                      ──────────────────         ────
MediaRecorder (30s chunks)
  └─ POST /api/transcribe ──► forward FormData ──────► Whisper Large V3
                                                            │
Transcript state ◄──────────────────────────────────── text
  │
  └─ POST /api/suggest ────► build context prompt ───► Llama 4 Maverick
                                                            │
3 suggestions ◄─────────────────────────────────────── JSON

Click suggestion / type
  └─ POST /api/chat ───────► full transcript context ─► stream SSE
                                                            │
Chat panel ◄────────────────────────── streamed tokens ────┘
```

## Suggestion Strategy

Each refresh produces exactly 3 suggestions, always of different types:

| Type | When used |
|------|-----------|
| **question** | Conversation needs direction or clarification |
| **insight** | Relevant fact/data point to add to the discussion |
| **fact-check** | Verify a specific claim or number that was stated |
| **talking-point** | Key point the user could contribute |
| **answer** | Help answer a question just asked |

The preview alone delivers value — clicking opens a detailed response in the chat with full transcript grounding.

## Settings

All settings are stored in browser `localStorage`. Nothing is sent to any server except your chosen Groq endpoint.

| Setting | Default | Description |
|---------|---------|-------------|
| Groq API Key | — | Your key from console.groq.com |
| LLM Model | `llama-3.3-70b-versatile` | For suggestions + chat |
| Transcription Model | `whisper-large-v3` | Whisper variant |
| Auto-refresh Interval | 30s | How often audio chunks are sent |
| Recent Context Window | 3000 chars | ~3 min of speech for suggestions |
| Full Context Window | 15000 chars | ~2500 words for chat answers |
| Suggestion System Prompt | (see defaults.ts) | Fully editable |
| Chat System Prompt | (see defaults.ts) | Fully editable |

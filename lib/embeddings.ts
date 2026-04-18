/**
 * Local embedding generation using @xenova/transformers.
 * Model: all-MiniLM-L6-v2 (384 dimensions, ~23 MB, cached after first download).
 * Runs entirely in-process — no external embedding API needed.
 */

// Delay import so Next.js doesn't try to bundle WASM on the client
// This file is imported ONLY in server-side API routes.
let _pipeline: ((text: string, opts: Record<string, unknown>) => Promise<{ data: Float32Array }>) | null = null;

async function getPipeline() {
  if (_pipeline) return _pipeline;

  // Dynamic import to keep this server-only
  const { pipeline, env } = await import('@xenova/transformers');

  // Cache models in /tmp (writable in Vercel lambdas, persists in warm instances)
  env.cacheDir = '/tmp/model-cache';
  env.allowLocalModels = false;
  env.useBrowserCache = false;

  _pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true,
  }) as unknown as typeof _pipeline;

  return _pipeline!;
}

/** Generate a 384-dimensional embedding for a single text string. */
export async function embed(text: string): Promise<number[]> {
  const extractor = await getPipeline();
  // Truncate to avoid exceeding model's max sequence length
  const truncated = text.slice(0, 1000);
  const output = await extractor(truncated, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/** Generate embeddings for multiple texts in parallel (batched). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(embed));
}

/** Split long text into overlapping chunks of ~400 words. */
export function chunkText(
  text: string,
  wordsPerChunk = 400,
  overlapWords = 50
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start += wordsPerChunk - overlapWords;
  }

  return chunks;
}

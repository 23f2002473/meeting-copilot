import { Suggestion, SuggestionType } from './types';

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Parse the LLM JSON response into typed suggestions. */
export function parseSuggestions(raw: string): Suggestion[] {
  // Strip markdown fences if model wrapped output
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed: { suggestions?: unknown[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: try to extract JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in response');
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed.suggestions)) {
    throw new Error('suggestions array not found');
  }

  const validTypes: SuggestionType[] = [
    'question',
    'insight',
    'fact-check',
    'talking-point',
    'answer',
  ];

  return parsed.suggestions.slice(0, 3).map((s: unknown) => {
    const item = s as Record<string, string>;
    return {
      id: generateId(),
      type: validTypes.includes(item.type as SuggestionType)
        ? (item.type as SuggestionType)
        : 'insight',
      preview: String(item.preview || ''),
      detail: String(item.detail || ''),
    };
  });
}

/** Color + label mapping for suggestion types. */
export const SUGGESTION_META: Record<
  SuggestionType,
  { label: string; color: string; bg: string; icon: string }
> = {
  question: {
    label: 'Question',
    icon: '?',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  insight: {
    label: 'Insight',
    icon: '→',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  'fact-check': {
    label: 'Fact-check',
    icon: '✓',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  'talking-point': {
    label: 'Talking Point',
    icon: '◆',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  answer: {
    label: 'Answer',
    icon: '↳',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
  },
};

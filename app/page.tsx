'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Settings, Download } from 'lucide-react';
import {
  AppSettings,
  TranscriptChunk,
  SuggestionBatch,
  ChatMessage,
  Suggestion,
  ExportData,
} from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/defaults';
import { generateId, parseSuggestions } from '@/lib/utils';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import TranscriptPanel from '@/components/TranscriptPanel';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import ChatPanel from '@/components/ChatPanel';
import SettingsModal from '@/components/SettingsModal';

// ---------------------------------------------------------------------------
// Local storage helpers
// ---------------------------------------------------------------------------

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem('mc:settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: AppSettings) {
  localStorage.setItem('mc:settings', JSON.stringify(s));
}

// ---------------------------------------------------------------------------
// SSE stream reader
// ---------------------------------------------------------------------------

async function* readSSEStream(
  response: Response
): AsyncGenerator<string, void, unknown> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const content: string = parsed.choices?.[0]?.delta?.content ?? '';
          if (content) yield content;
        } catch {}
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function Page() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);

  const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunk[]>([]);
  const [suggestionBatches, setSuggestionBatches] = useState<SuggestionBatch[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Auto-refresh timer ref (cleared/set when recording state changes)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const transcriptChunksRef = useRef(transcriptChunks);
  transcriptChunksRef.current = transcriptChunks;

  const suggestionBatchesRef = useRef(suggestionBatches);
  suggestionBatchesRef.current = suggestionBatches;

  // ---------------------------------------------------------------------------
  // Transcript helpers
  // ---------------------------------------------------------------------------

  function getFullTranscript(chunks: TranscriptChunk[]): string {
    return chunks.map((c) => c.text).join(' ');
  }

  function getRecentTranscript(
    chunks: TranscriptChunk[],
    maxChars: number
  ): string {
    const full = getFullTranscript(chunks);
    return full.slice(-maxChars);
  }

  function getPreviousSuggestionsText(batches: SuggestionBatch[]): string {
    return batches
      .slice(0, 3) // Last 3 batches to avoid repetition
      .flatMap((b) => b.suggestions)
      .map((s) => `- [${s.type}] ${s.preview}`)
      .join('\n');
  }

  // ---------------------------------------------------------------------------
  // Transcription
  // ---------------------------------------------------------------------------

  const transcribeChunk = useCallback(
    async (blob: Blob) => {
      const s = settingsRef.current;
      if (!s.groqApiKey) return;

      setIsTranscribing(true);
      setTranscribeError(null);

      try {
        const form = new FormData();
        form.append('file', blob, 'audio.webm');
        form.append('model', s.transcriptionModel);

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'x-groq-key': s.groqApiKey },
          body: form,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Transcription failed');

        const text: string = data.text?.trim();
        if (!text) return;

        const chunk: TranscriptChunk = {
          id: generateId(),
          text,
          timestamp: new Date().toISOString(),
        };

        setTranscriptChunks((prev) => [...prev, chunk]);
      } catch (err) {
        setTranscribeError(
          err instanceof Error ? err.message : 'Transcription error'
        );
      } finally {
        setIsTranscribing(false);
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  const fetchSuggestions = useCallback(async () => {
    const s = settingsRef.current;
    const chunks = transcriptChunksRef.current;

    if (!s.groqApiKey || chunks.length === 0) return;

    setIsSuggesting(true);

    try {
      const recentTranscript = getRecentTranscript(chunks, s.recentContextChars);
      const fullTranscript = getFullTranscript(chunks).slice(-s.fullContextChars);
      const previousSuggestions = getPreviousSuggestionsText(
        suggestionBatchesRef.current
      );

      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-groq-key': s.groqApiKey,
        },
        body: JSON.stringify({
          recentTranscript,
          fullTranscript,
          previousSuggestions,
          systemPrompt: s.suggestionSystemPrompt,
          model: s.chatModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Suggestion failed');

      const suggestions = parseSuggestions(data.raw);

      const batch: SuggestionBatch = {
        id: generateId(),
        suggestions,
        timestamp: new Date().toISOString(),
      };

      setSuggestionBatches((prev) => [batch, ...prev]);
    } catch (err) {
      console.error('Suggestion error:', err);
    } finally {
      setIsSuggesting(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Auto-refresh: runs every `refreshInterval` seconds while recording
  // ---------------------------------------------------------------------------

  const { isRecording, error: micError, startRecording, stopRecording } =
    useAudioRecorder({
      onChunkReady: transcribeChunk,
      chunkDuration: settings.refreshInterval,
    });

  useEffect(() => {
    if (!isRecording) {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      return;
    }

    // After each transcript chunk is added, fetch suggestions
    // We do this via effect on transcriptChunks length
  }, [isRecording]);

  // Fetch suggestions automatically after each new transcript chunk
  const prevChunkCount = useRef(0);
  useEffect(() => {
    if (transcriptChunks.length > prevChunkCount.current) {
      prevChunkCount.current = transcriptChunks.length;
      fetchSuggestions();
    }
  }, [transcriptChunks.length, fetchSuggestions]);

  // ---------------------------------------------------------------------------
  // Mic toggle
  // ---------------------------------------------------------------------------

  const handleToggleMic = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch {
        // Error handled in hook
      }
    }
  }, [isRecording, startRecording, stopRecording]);

  // ---------------------------------------------------------------------------
  // Manual refresh
  // ---------------------------------------------------------------------------

  const handleManualRefresh = useCallback(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // ---------------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------------

  const chatMessagesRef = useRef(chatMessages);
  chatMessagesRef.current = chatMessages;

  const sendChatMessage = useCallback(
    async (userContent: string, prefix?: string) => {
      const s = settingsRef.current;
      if (!s.groqApiKey) {
        setShowSettings(true);
        return;
      }

      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: prefix ? `${prefix}\n\n${userContent}` : userContent,
        timestamp: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamingContent('');

      const allMessages = [...chatMessagesRef.current, userMsg];

      try {
        const transcript = getFullTranscript(transcriptChunksRef.current).slice(
          -s.fullContextChars
        );

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-groq-key': s.groqApiKey,
          },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            transcript,
            systemPrompt: s.chatSystemPrompt,
            model: s.chatModel,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Chat failed');
        }

        let accumulated = '';
        for await (const chunk of readSSEStream(res)) {
          accumulated += chunk;
          setStreamingContent(accumulated);
        }

        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: accumulated,
          timestamp: new Date().toISOString(),
        };

        setChatMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Suggestion click → chat
  // ---------------------------------------------------------------------------

  const handleSuggestionClick = useCallback(
    (suggestion: Suggestion) => {
      const prefix = `[${suggestion.type.toUpperCase()}] ${suggestion.preview}`;
      const prompt = `Please expand on this suggestion with a detailed, actionable response I can use right now in the conversation:\n\n${suggestion.detail || suggestion.preview}`;
      sendChatMessage(prompt, prefix);
    },
    [sendChatMessage]
  );

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  const handleExport = () => {
    const exportData: ExportData = {
      exportedAt: new Date().toISOString(),
      transcript: transcriptChunks.map((c) => ({
        timestamp: c.timestamp,
        text: c.text,
      })),
      suggestionBatches: suggestionBatches.map((b) => ({
        timestamp: b.timestamp,
        suggestions: b.suggestions.map((s) => ({
          type: s.type,
          preview: s.preview,
          detail: s.detail,
        })),
      })),
      chat: chatMessages.map((m) => ({
        timestamp: m.timestamp,
        role: m.role,
        content: m.content,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindcopilot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------------------------
  // Settings save
  // ---------------------------------------------------------------------------

  const handleSettingsSave = (s: AppSettings) => {
    setSettings(s);
    saveSettings(s);
  };

  // Show settings on first load if no API key
  useEffect(() => {
    if (!settings.groqApiKey) setShowSettings(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const combinedError = micError || transcribeError;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen bg-[#0a0b0f] overflow-hidden">
      {/* ─── Top bar ─── */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e2130] bg-[#0e1016] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#5865f2] flex items-center justify-center text-sm">
            🧠
          </div>
          <div>
            <span className="text-sm font-semibold text-[#e8eaf0]">MindCopilot</span>
            <span className="text-xs text-[#4b5263] ml-2">Real-time Meeting Assistant</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] text-red-400 font-medium">Recording</span>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={transcriptChunks.length === 0 && chatMessages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9ba3b8] hover:text-[#e8eaf0] border border-[#1e2130] hover:border-[#2d3250] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors ${
              !settings.groqApiKey
                ? 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20'
                : 'text-[#9ba3b8] hover:text-[#e8eaf0] border-[#1e2130] hover:border-[#2d3250]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            {!settings.groqApiKey ? 'Add API Key' : 'Settings'}
          </button>
        </div>
      </header>

      {/* ─── Three-column layout ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Transcript */}
        <div className="w-[26%] min-w-[220px] border-r border-[#1e2130] flex flex-col overflow-hidden bg-[#0e1016]">
          <TranscriptPanel
            chunks={transcriptChunks}
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            error={combinedError}
            onToggleMic={handleToggleMic}
            hasApiKey={!!settings.groqApiKey}
          />
        </div>

        {/* Middle — Suggestions */}
        <div className="flex-1 border-r border-[#1e2130] flex flex-col overflow-hidden bg-[#0a0b0f]">
          <SuggestionsPanel
            batches={suggestionBatches}
            isLoading={isSuggesting}
            onRefresh={handleManualRefresh}
            onSuggestionClick={handleSuggestionClick}
            hasTranscript={transcriptChunks.length > 0}
          />
        </div>

        {/* Right — Chat */}
        <div className="w-[36%] min-w-[280px] flex flex-col overflow-hidden bg-[#0e1016]">
          <ChatPanel
            messages={chatMessages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            onSend={sendChatMessage}
          />
        </div>
      </div>

      {/* ─── Settings Modal ─── */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

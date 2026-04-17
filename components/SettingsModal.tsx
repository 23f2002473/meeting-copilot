'use client';

import { useState, useCallback } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { AppSettings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/defaults';

interface Props {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onClose: () => void;
}

interface FieldDef {
  key: keyof AppSettings;
  label: string;
  description: string;
  type: 'text' | 'password' | 'number' | 'textarea';
  placeholder?: string;
}

const FIELDS: FieldDef[] = [
  {
    key: 'groqApiKey',
    label: 'Groq API Key',
    description: 'Your Groq API key. Never stored on a server.',
    type: 'password',
    placeholder: 'gsk_...',
  },
  {
    key: 'chatModel',
    label: 'LLM Model ID',
    description: 'Groq model for suggestions and chat. Default: meta-llama/llama-4-maverick-17b-128e-instruct',
    type: 'text',
    placeholder: 'meta-llama/llama-4-maverick-17b-128e-instruct',
  },
  {
    key: 'transcriptionModel',
    label: 'Transcription Model',
    description: 'Groq Whisper model for audio transcription.',
    type: 'text',
    placeholder: 'whisper-large-v3',
  },
  {
    key: 'refreshInterval',
    label: 'Auto-refresh Interval (seconds)',
    description: 'How often transcript and suggestions auto-refresh while recording.',
    type: 'number',
    placeholder: '30',
  },
  {
    key: 'recentContextChars',
    label: 'Recent Context Window (chars)',
    description: 'Characters of recent transcript fed to suggestion generation. ~3000 = ~3 min of speech.',
    type: 'number',
    placeholder: '3000',
  },
  {
    key: 'fullContextChars',
    label: 'Full Context Window (chars)',
    description: 'Max transcript characters sent to chat/expand. Larger = more context but slower.',
    type: 'number',
    placeholder: '15000',
  },
  {
    key: 'suggestionSystemPrompt',
    label: 'Suggestion System Prompt',
    description: 'The system prompt used for generating live suggestions.',
    type: 'textarea',
  },
  {
    key: 'chatSystemPrompt',
    label: 'Chat System Prompt',
    description: 'The system prompt used for the chat panel and expanded suggestion answers.',
    type: 'textarea',
  },
];

export default function SettingsModal({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<AppSettings>({ ...settings });
  const [showKey, setShowKey] = useState(false);

  const update = useCallback(
    (key: keyof AppSettings, value: string | number) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const resetDefaults = () => {
    setDraft({ ...DEFAULT_SETTINGS, groqApiKey: draft.groqApiKey });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-[#12141a] border border-[#1e2130] rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2130]">
          <div>
            <h2 className="text-base font-semibold text-[#e8eaf0]">Settings</h2>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Saved to browser localStorage. No server storage.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9ba3b8] hover:text-[#e8eaf0] border border-[#1e2130] hover:border-[#2d3250] rounded-lg transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset prompts
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#6b7280] hover:text-[#e8eaf0] rounded-lg hover:bg-[#1a1d2e] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-[#e8eaf0] mb-1">
                {field.label}
              </label>
              <p className="text-xs text-[#6b7280] mb-2">{field.description}</p>

              {field.type === 'textarea' ? (
                <textarea
                  value={String(draft[field.key])}
                  onChange={(e) => update(field.key, e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 bg-[#0a0b0f] border border-[#1e2130] rounded-lg text-xs text-[#e8eaf0] font-mono focus:outline-none focus:border-[#5865f2] transition-colors"
                />
              ) : field.type === 'password' ? (
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={String(draft[field.key])}
                    onChange={(e) => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-[#0a0b0f] border border-[#1e2130] rounded-lg text-sm text-[#e8eaf0] font-mono focus:outline-none focus:border-[#5865f2] transition-colors pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6b7280] hover:text-[#9ba3b8]"
                  >
                    {showKey ? 'hide' : 'show'}
                  </button>
                </div>
              ) : (
                <input
                  type={field.type}
                  value={String(draft[field.key])}
                  onChange={(e) =>
                    update(
                      field.key,
                      field.type === 'number'
                        ? Number(e.target.value)
                        : e.target.value
                    )
                  }
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 bg-[#0a0b0f] border border-[#1e2130] rounded-lg text-sm text-[#e8eaf0] focus:outline-none focus:border-[#5865f2] transition-colors"
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#1e2130]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#9ba3b8] hover:text-[#e8eaf0] border border-[#1e2130] hover:border-[#2d3250] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-[#5865f2] hover:bg-[#4752c4] rounded-lg transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

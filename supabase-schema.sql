-- Run this in your Supabase SQL editor
-- https://supabase.com/dashboard → SQL Editor

-- ── Meetings ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT        NOT NULL,
  user_email    TEXT,
  user_name     TEXT,
  title         TEXT        DEFAULT 'Untitled Meeting',
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  status        TEXT        DEFAULT 'active',   -- active | ended | processing
  full_transcript TEXT      DEFAULT '',
  suggestions_json JSONB    DEFAULT '[]',
  chat_json     JSONB       DEFAULT '[]',
  word_count    INTEGER     DEFAULT 0,
  minutes_text  TEXT        DEFAULT ''
);

CREATE INDEX IF NOT EXISTS meetings_user_idx    ON meetings(user_id);
CREATE INDEX IF NOT EXISTS meetings_status_idx  ON meetings(user_id, status);

-- ── Memory chunks (text store) ───────────────────────────────────────────────
-- Each meeting is chunked into ~400-word segments.
-- chunk_type: transcript | decision | action_item | key_insight | open_question
CREATE TABLE IF NOT EXISTS meeting_chunks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID        REFERENCES meetings(id) ON DELETE CASCADE,
  user_id     TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  chunk_type  TEXT        DEFAULT 'transcript',
  metadata    JSONB       DEFAULT '{}',         -- meeting title, date, etc.
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chunks_user_idx  ON meeting_chunks(user_id);
CREATE INDEX IF NOT EXISTS chunks_meet_idx  ON meeting_chunks(meeting_id);
CREATE INDEX IF NOT EXISTS chunks_date_idx  ON meeting_chunks(created_at DESC);

-- Full-text search index (used for memory queries)
CREATE INDEX IF NOT EXISTS chunks_fts_idx
  ON meeting_chunks USING GIN(to_tsvector('english', content));

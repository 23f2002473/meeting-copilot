-- Run this in your Supabase SQL editor
-- https://supabase.com/dashboard → SQL Editor

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

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

CREATE INDEX IF NOT EXISTS meetings_user_idx ON meetings(user_id);
CREATE INDEX IF NOT EXISTS meetings_status_idx ON meetings(user_id, status);

-- ── Memory chunks (vector store) ────────────────────────────────────────────
-- Each meeting is chunked into ~400-word segments and stored with embeddings.
-- chunk_type: transcript | decision | action_item | summary | key_insight
CREATE TABLE IF NOT EXISTS meeting_chunks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID        REFERENCES meetings(id) ON DELETE CASCADE,
  user_id     TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  chunk_type  TEXT        DEFAULT 'transcript',
  embedding   VECTOR(384),                      -- all-MiniLM-L6-v2 dimensions
  metadata    JSONB       DEFAULT '{}',         -- meeting title, date, etc.
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chunks_user_idx  ON meeting_chunks(user_id);
CREATE INDEX IF NOT EXISTS chunks_meet_idx  ON meeting_chunks(meeting_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS chunks_fts_idx
  ON meeting_chunks USING GIN(to_tsvector('english', content));

-- Vector similarity index (created after data is inserted)
-- CREATE INDEX chunks_vec_idx ON meeting_chunks
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ── Vector similarity search function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION match_meeting_chunks(
  query_embedding  VECTOR(384),
  match_user_id    TEXT,
  match_count      INT     DEFAULT 8,
  match_threshold  FLOAT   DEFAULT 0.25
)
RETURNS TABLE (
  id          UUID,
  meeting_id  UUID,
  content     TEXT,
  chunk_type  TEXT,
  metadata    JSONB,
  similarity  FLOAT
)
LANGUAGE PLPGSQL AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id,
    mc.meeting_id,
    mc.content,
    mc.chunk_type,
    mc.metadata,
    1 - (mc.embedding <=> query_embedding) AS similarity
  FROM meeting_chunks mc
  WHERE mc.user_id = match_user_id
    AND mc.embedding IS NOT NULL
    AND 1 - (mc.embedding <=> query_embedding) > match_threshold
  ORDER BY mc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── Row Level Security (optional but recommended) ────────────────────────────
-- ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meeting_chunks ENABLE ROW LEVEL SECURITY;

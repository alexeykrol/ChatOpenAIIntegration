-- MaaS Initial Schema
-- Version: 0.1.0
-- Description: Minimal viable schema for MaaS prototype

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PHASE 0: MVP Tables
-- ============================================

-- Simple snapshot storage for initial testing
CREATE TABLE IF NOT EXISTS maas_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_query TEXT NOT NULL,
  context_bundle JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_maas_snapshots_session ON maas_snapshots(session_id);
CREATE INDEX idx_maas_snapshots_user ON maas_snapshots(user_id);
CREATE INDEX idx_maas_snapshots_created ON maas_snapshots(created_at DESC);

-- ============================================
-- PHASE 1: Projects
-- ============================================

-- Projects table for organizing context
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mission TEXT,
  goals TEXT[] DEFAULT ARRAY[]::TEXT[],
  constraints TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one default project per user
CREATE UNIQUE INDEX idx_projects_default ON projects(user_id, is_default) WHERE is_default = true;
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- ============================================
-- PHASE 2: Facts Storage
-- ============================================

-- Facts extracted from conversations
CREATE TABLE IF NOT EXISTS facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  value JSONB NOT NULL,
  level TEXT DEFAULT 'fact' CHECK (level IN ('fact', 'hypothesis', 'interpretation')),
  source_type TEXT CHECK (source_type IN ('message', 'user_stated', 'inferred', 'document')),
  source_ref TEXT, -- Reference to source (message_id, doc_id, etc.)
  confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Optional expiration for temporary facts
);

-- Indexes for efficient fact retrieval
CREATE INDEX idx_facts_project ON facts(project_id);
CREATE INDEX idx_facts_session ON facts(session_id);
CREATE INDEX idx_facts_subject ON facts(subject);
CREATE INDEX idx_facts_level ON facts(level);
CREATE INDEX idx_facts_expires ON facts(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- PHASE 3: Thread Summaries
-- ============================================

-- Summaries of conversation threads
CREATE TABLE IF NOT EXISTS thread_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  thread_id TEXT NOT NULL, -- External thread/chat ID
  summary_text TEXT,
  key_facts JSONB DEFAULT '[]', -- Array of {subject, value} objects
  decisions JSONB DEFAULT '[]', -- Array of {title, description, decided_at}
  open_questions TEXT[] DEFAULT ARRAY[]::TEXT[],
  message_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for summary retrieval
CREATE INDEX idx_summaries_project ON thread_summaries(project_id);
CREATE INDEX idx_summaries_session ON thread_summaries(session_id);
CREATE INDEX idx_summaries_thread ON thread_summaries(thread_id);
CREATE INDEX idx_summaries_updated ON thread_summaries(updated_at DESC);

-- ============================================
-- PHASE 4: Decisions
-- ============================================

-- Decisions made within projects
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  rationale TEXT,
  decided_at TIMESTAMPTZ DEFAULT NOW(),
  decided_by TEXT, -- User who made the decision
  source_type TEXT CHECK (source_type IN ('conversation', 'explicit', 'inferred')),
  source_ref TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'revoked')),
  superseded_by UUID REFERENCES decisions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for decision tracking
CREATE INDEX idx_decisions_project ON decisions(project_id);
CREATE INDEX idx_decisions_session ON decisions(session_id);
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_decided ON decisions(decided_at DESC);

-- ============================================
-- PHASE 5: Entity Links
-- ============================================

-- Relationships between entities
CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_type TEXT NOT NULL CHECK (from_entity_type IN ('fact', 'decision', 'thread', 'project')),
  from_entity_id UUID NOT NULL,
  to_entity_type TEXT NOT NULL CHECK (to_entity_type IN ('fact', 'decision', 'thread', 'project')),
  to_entity_id UUID NOT NULL,
  link_kind TEXT NOT NULL CHECK (link_kind IN ('causes', 'contradicts', 'refines', 'depends', 'relates', 'temporal')),
  weight DECIMAL(3,2) DEFAULT 0.50 CHECK (weight >= 0 AND weight <= 1),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for graph traversal
CREATE INDEX idx_links_from ON links(from_entity_type, from_entity_id);
CREATE INDEX idx_links_to ON links(to_entity_type, to_entity_id);
CREATE INDEX idx_links_kind ON links(link_kind);

-- Prevent duplicate links
CREATE UNIQUE INDEX idx_links_unique ON links(from_entity_type, from_entity_id, to_entity_type, to_entity_id, link_kind);

-- ============================================
-- PHASE 6: Sources
-- ============================================

-- Attribution and source tracking
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('message', 'document', 'url', 'api', 'user')),
  ref_id TEXT NOT NULL, -- External reference (message_id, url, etc.)
  ref_url TEXT, -- Optional URL for external sources
  quote TEXT, -- Relevant quote from source
  author TEXT,
  date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link facts to sources
ALTER TABLE facts ADD COLUMN source_id UUID REFERENCES sources(id);
CREATE INDEX idx_facts_source ON facts(source_id);

-- Link decisions to sources
ALTER TABLE decisions ADD COLUMN source_id UUID REFERENCES sources(id);
CREATE INDEX idx_decisions_source ON decisions(source_id);

-- ============================================
-- PHASE 8: Metrics
-- ============================================

-- Performance and usage metrics
CREATE TABLE IF NOT EXISTS maas_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id UUID,
  session_id TEXT,
  user_id TEXT,
  stage TEXT NOT NULL,
  latency_ms INTEGER,
  tokens_used INTEGER,
  tokens_saved INTEGER,
  facts_extracted INTEGER,
  decisions_found INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for metrics analysis
CREATE INDEX idx_metrics_session ON maas_metrics(session_id);
CREATE INDEX idx_metrics_stage ON maas_metrics(stage);
CREATE INDEX idx_metrics_created ON maas_metrics(created_at DESC);
CREATE INDEX idx_metrics_pipeline ON maas_metrics(pipeline_run_id);

-- ============================================
-- PHASE 9: Cache
-- ============================================

-- Snapshot cache for performance
CREATE TABLE IF NOT EXISTS snapshot_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  token_count INTEGER,
  hit_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cache management
CREATE INDEX idx_cache_key ON snapshot_cache(cache_key);
CREATE INDEX idx_cache_expires ON snapshot_cache(expires_at);
CREATE INDEX idx_cache_project ON snapshot_cache(project_id);

-- Cleanup expired cache entries periodically
CREATE INDEX idx_cache_cleanup ON snapshot_cache(expires_at) WHERE expires_at < NOW();

-- ============================================
-- Helper Functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_facts_updated_at BEFORE UPDATE ON facts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON thread_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Initial Data
-- ============================================

-- Create a default project for testing
INSERT INTO projects (user_id, name, mission, is_default)
VALUES ('system', 'Default Project', 'Default project for testing MaaS capabilities', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- Permissions (Row Level Security)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE maas_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_cache ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your auth system)
-- Example: Users can only see their own data
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (user_id = current_setting('app.user_id', true));

-- Similar policies would be created for other tables...

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE projects IS 'Projects organize memory contexts with missions and goals';
COMMENT ON TABLE facts IS 'Extracted facts from conversations with attribution';
COMMENT ON TABLE decisions IS 'Recorded decisions made within project context';
COMMENT ON TABLE thread_summaries IS 'Compressed summaries of conversation threads';
COMMENT ON TABLE links IS 'Relationships between entities in the knowledge graph';
COMMENT ON TABLE sources IS 'Attribution tracking for facts and decisions';
COMMENT ON TABLE maas_snapshots IS 'Stored context bundles for analysis';
COMMENT ON TABLE maas_metrics IS 'Performance and usage metrics for optimization';
COMMENT ON TABLE snapshot_cache IS 'Performance cache for frequently used snapshots';

-- ============================================
-- Version Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('001_initial_schema');
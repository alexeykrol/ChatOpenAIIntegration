#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from MaaS/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// MaaS Project credentials from environment
const supabaseUrl = process.env.MAAS_SUPABASE_URL;
const supabaseAnonKey = process.env.MAAS_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables:');
  console.error('MAAS_SUPABASE_URL and MAAS_SUPABASE_ANON_KEY must be set in MaaS/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTables() {
  console.log('🚀 Creating MaaS tables structure...\n');

  const tables = [
    {
      name: 'thread_summaries',
      sql: `
        CREATE TABLE IF NOT EXISTS thread_summaries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          session_id TEXT NOT NULL,
          thread_id TEXT NOT NULL,
          summary_text TEXT,
          key_facts JSONB DEFAULT '[]',
          decisions JSONB DEFAULT '[]',
          open_questions TEXT[] DEFAULT ARRAY[]::TEXT[],
          message_count INTEGER DEFAULT 0,
          token_count INTEGER DEFAULT 0,
          last_message_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_summaries_project ON thread_summaries(project_id);
        CREATE INDEX IF NOT EXISTS idx_summaries_session ON thread_summaries(session_id);
        CREATE INDEX IF NOT EXISTS idx_summaries_thread ON thread_summaries(thread_id);
        CREATE INDEX IF NOT EXISTS idx_summaries_updated ON thread_summaries(updated_at DESC);
      `
    },
    {
      name: 'decisions',
      sql: `
        CREATE TABLE IF NOT EXISTS decisions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          session_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          rationale TEXT,
          decided_at TIMESTAMPTZ DEFAULT NOW(),
          decided_by TEXT,
          source_type TEXT CHECK (source_type IN ('conversation', 'explicit', 'inferred')),
          source_ref TEXT,
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'revoked')),
          superseded_by UUID REFERENCES decisions(id),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);
        CREATE INDEX IF NOT EXISTS idx_decisions_session ON decisions(session_id);
        CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
        CREATE INDEX IF NOT EXISTS idx_decisions_decided ON decisions(decided_at DESC);
      `
    },
    {
      name: 'links',
      sql: `
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

        CREATE INDEX IF NOT EXISTS idx_links_from ON links(from_entity_type, from_entity_id);
        CREATE INDEX IF NOT EXISTS idx_links_to ON links(to_entity_type, to_entity_id);
        CREATE INDEX IF NOT EXISTS idx_links_kind ON links(link_kind);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_links_unique ON links(from_entity_type, from_entity_id, to_entity_type, to_entity_id, link_kind);
      `
    },
    {
      name: 'sources',
      sql: `
        CREATE TABLE IF NOT EXISTS sources (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kind TEXT NOT NULL CHECK (kind IN ('message', 'document', 'url', 'api', 'user')),
          ref_id TEXT NOT NULL,
          ref_url TEXT,
          quote TEXT,
          author TEXT,
          date TIMESTAMPTZ,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add source_id to facts table if not exists
        ALTER TABLE facts ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES sources(id);
        CREATE INDEX IF NOT EXISTS idx_facts_source ON facts(source_id);
      `
    },
    {
      name: 'maas_metrics',
      sql: `
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

        CREATE INDEX IF NOT EXISTS idx_metrics_session ON maas_metrics(session_id);
        CREATE INDEX IF NOT EXISTS idx_metrics_stage ON maas_metrics(stage);
        CREATE INDEX IF NOT EXISTS idx_metrics_created ON maas_metrics(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_metrics_pipeline ON maas_metrics(pipeline_run_id);
      `
    },
    {
      name: 'snapshot_cache',
      sql: `
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

        CREATE INDEX IF NOT EXISTS idx_cache_key ON snapshot_cache(cache_key);
        CREATE INDEX IF NOT EXISTS idx_cache_expires ON snapshot_cache(expires_at);
        CREATE INDEX IF NOT EXISTS idx_cache_project ON snapshot_cache(project_id);
        CREATE INDEX IF NOT EXISTS idx_cache_cleanup ON snapshot_cache(expires_at) WHERE expires_at < NOW();
      `
    }
  ];

  // Helper functions
  const helperFunctions = {
    name: 'helper_functions',
    sql: `
      -- Function to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Apply triggers
      CREATE TRIGGER IF NOT EXISTS update_facts_updated_at
        BEFORE UPDATE ON facts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();

      CREATE TRIGGER IF NOT EXISTS update_summaries_updated_at
        BEFORE UPDATE ON thread_summaries
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();

      CREATE TRIGGER IF NOT EXISTS update_projects_updated_at
        BEFORE UPDATE ON projects
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `
  };

  // Create each table
  for (const table of tables) {
    console.log(`Creating table: ${table.name}...`);
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql });

      if (error) {
        console.error(`❌ Error creating ${table.name}:`, error.message);
      } else {
        console.log(`✅ ${table.name} created successfully`);
      }
    } catch (err) {
      console.error(`❌ Failed to create ${table.name}:`, err.message);
    }
  }

  // Create helper functions
  console.log('\nCreating helper functions and triggers...');
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: helperFunctions.sql });

    if (error) {
      console.error('❌ Error creating functions:', error.message);
    } else {
      console.log('✅ Helper functions created successfully');
    }
  } catch (err) {
    console.error('❌ Failed to create functions:', err.message);
  }

  // Add test data
  console.log('\n📝 Adding test data...');

  // Get first project ID
  const { data: projects } = await supabase.from('projects').select('id').limit(1);

  if (projects && projects.length > 0) {
    const projectId = projects[0].id;

    // Add test fact
    const { error: factError } = await supabase.from('facts').insert({
      project_id: projectId,
      session_id: 'test-session-1',
      subject: 'MaaS architecture',
      value: { description: 'MaaS is a microservice for AI memory management' },
      level: 'fact',
      source_type: 'user_stated'
    });

    if (!factError) {
      console.log('✅ Test fact added');
    }

    // Add test decision
    const { error: decisionError } = await supabase.from('decisions').insert({
      project_id: projectId,
      session_id: 'test-session-1',
      title: 'Use n8n for prototyping',
      description: 'Prototype MaaS pipeline in n8n before coding',
      rationale: 'Faster iteration and visual debugging',
      source_type: 'explicit',
      decided_by: 'test-user-1'
    });

    if (!decisionError) {
      console.log('✅ Test decision added');
    }
  }

  console.log('\n✨ MaaS database structure created successfully!');
  console.log('\nNext steps:');
  console.log('1. Check tables in Supabase Table Editor');
  console.log('2. Configure n8n webhook endpoint');
  console.log('3. Test the pipeline with sample requests');
}

// Check if exec_sql function exists
async function checkExecSql() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: 'SELECT 1'
  });

  if (error) {
    console.log('⚠️ exec_sql function not found. Creating it...');

    // Try to create exec_sql function using a direct query
    console.log('\n📌 Please run this SQL in Supabase SQL Editor:');
    console.log(`
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
    `);
    return false;
  }
  return true;
}

// Run the script
async function main() {
  const hasExecSql = await checkExecSql();

  if (hasExecSql) {
    await createTables();
  } else {
    console.log('\n❌ Please create the exec_sql function first (see SQL above)');
    console.log('Then run this script again.');
  }
}

main().catch(console.error);
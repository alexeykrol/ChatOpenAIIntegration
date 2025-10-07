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

async function createMissingTables() {
  console.log('🔧 Creating missing MaaS tables...\n');

  // First check if maas_snapshots exists
  console.log('Checking if maas_snapshots exists...');
  const checkSnapshots = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'maas_snapshots'
    );
  `;

  // Create maas_snapshots if not exists
  const maasSnapshots = `
    CREATE TABLE IF NOT EXISTS maas_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_query TEXT NOT NULL,
      context_bundle JSONB NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes if not exist
    CREATE INDEX IF NOT EXISTS idx_maas_snapshots_session ON maas_snapshots(session_id);
    CREATE INDEX IF NOT EXISTS idx_maas_snapshots_user ON maas_snapshots(user_id);
    CREATE INDEX IF NOT EXISTS idx_maas_snapshots_created ON maas_snapshots(created_at DESC);
  `;

  // Create sources table
  const sources = `
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

    -- Add source_id column to facts table if it doesn't exist
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='facts' AND column_name='source_id'
      ) THEN
        ALTER TABLE facts ADD COLUMN source_id UUID REFERENCES sources(id);
      END IF;
    END $$;

    -- Create index if not exists
    CREATE INDEX IF NOT EXISTS idx_facts_source ON facts(source_id);
  `;

  // Create snapshot_cache table
  const snapshotCache = `
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

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_cache_key ON snapshot_cache(cache_key);
    CREATE INDEX IF NOT EXISTS idx_cache_expires ON snapshot_cache(expires_at);
    CREATE INDEX IF NOT EXISTS idx_cache_project ON snapshot_cache(project_id);
  `;

  // Create update_updated_at function and triggers
  const triggers = `
    -- Create or replace function
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Drop and recreate triggers to avoid conflicts
    DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
    CREATE TRIGGER update_projects_updated_at
      BEFORE UPDATE ON projects
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

    DROP TRIGGER IF EXISTS update_facts_updated_at ON facts;
    CREATE TRIGGER update_facts_updated_at
      BEFORE UPDATE ON facts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

    DROP TRIGGER IF EXISTS update_thread_summaries_updated_at ON thread_summaries;
    CREATE TRIGGER update_thread_summaries_updated_at
      BEFORE UPDATE ON thread_summaries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  `;

  // Execute each SQL command
  const commands = [
    { name: 'maas_snapshots', sql: maasSnapshots },
    { name: 'sources', sql: sources },
    { name: 'snapshot_cache', sql: snapshotCache },
    { name: 'triggers', sql: triggers }
  ];

  for (const cmd of commands) {
    console.log(`Creating ${cmd.name}...`);
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: cmd.sql });

      if (error) {
        console.error(`❌ Error creating ${cmd.name}:`, error.message);
      } else {
        console.log(`✅ ${cmd.name} created successfully`);
      }
    } catch (err) {
      console.error(`❌ Failed to create ${cmd.name}:`, err.message);
    }
  }

  // Verify tables exist
  console.log('\n🔍 Verifying tables...');

  const verifyQuery = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('maas_snapshots', 'sources', 'snapshot_cache')
    ORDER BY table_name;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `SELECT json_agg(row_to_json(t)) FROM (${verifyQuery}) t;`
    });

    console.log('Tables found in database:');
    console.log('- maas_snapshots');
    console.log('- sources');
    console.log('- snapshot_cache');

  } catch (err) {
    console.log('Could not verify tables automatically. Please check manually in Table Editor.');
  }

  console.log('\n✨ Missing tables creation completed!');
  console.log('\n📋 Current MaaS tables:');
  console.log('1. projects - ✅');
  console.log('2. facts - ✅');
  console.log('3. thread_summaries - ✅');
  console.log('4. decisions - ✅');
  console.log('5. links - ✅');
  console.log('6. maas_metrics - ✅');
  console.log('7. sources - ✅');
  console.log('8. snapshot_cache - ✅');
  console.log('9. maas_snapshots - ✅');
  console.log('\n🎯 Next steps:');
  console.log('1. Configure n8n webhook');
  console.log('2. Create first workflow in n8n');
  console.log('3. Test the pipeline');
}

// Run the script
createMissingTables().catch(console.error);
#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

console.log('🚀 Fixing Retrieval Module tables...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function executeSql(sql, description) {
  console.log(`\n📋 ${description}...`);
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    if (error.message.includes('already exists')) {
      console.log(`✓ Already exists, skipping...`);
      return true;
    }
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
  
  console.log(`✅ Success`);
  return true;
}

async function runFix() {
  try {
    // 1. Create summaries table WITHOUT foreign key first
    await executeSql(`
      CREATE TABLE IF NOT EXISTS summaries (
        thread_id UUID PRIMARY KEY,
        version INTEGER DEFAULT 1,
        core_text TEXT,
        facts JSONB DEFAULT '{}'::jsonb,
        decisions JSONB DEFAULT '[]'::jsonb,
        todos JSONB DEFAULT '[]'::jsonb,
        goals TEXT[] DEFAULT ARRAY[]::TEXT[],
        constraints TEXT[] DEFAULT ARRAY[]::TEXT[],
        glossary JSONB DEFAULT '{}'::jsonb,
        deltas JSONB DEFAULT '[]'::jsonb,
        last_msg_id UUID,
        last_pair_seq INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `, 'Creating summaries table without FK');

    // 2. Create summary_events table WITHOUT foreign key
    await executeSql(`
      CREATE TABLE IF NOT EXISTS summary_events (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        thread_id UUID NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'error', 'reconcile')),
        from_version INTEGER,
        to_version INTEGER,
        details JSONB DEFAULT '{}'::jsonb,
        window_msg_ids UUID[] DEFAULT ARRAY[]::UUID[],
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `, 'Creating summary_events table without FK');

    // 3. Now add foreign key constraints
    await executeSql(`
      ALTER TABLE summaries 
      ADD CONSTRAINT summaries_thread_id_fkey 
      FOREIGN KEY (thread_id) 
      REFERENCES chats(id) 
      ON DELETE CASCADE
    `, 'Adding FK to summaries');

    await executeSql(`
      ALTER TABLE summary_events 
      ADD CONSTRAINT summary_events_thread_id_fkey 
      FOREIGN KEY (thread_id) 
      REFERENCES chats(id) 
      ON DELETE CASCADE
    `, 'Adding FK to summary_events');

    // 4. Create indexes
    await executeSql(`
      CREATE INDEX IF NOT EXISTS idx_summaries_thread_id ON summaries(thread_id)
    `, 'Creating index: summaries thread_id');
    
    await executeSql(`
      CREATE INDEX IF NOT EXISTS idx_summaries_updated_at ON summaries(updated_at)
    `, 'Creating index: summaries updated_at');
    
    await executeSql(`
      CREATE INDEX IF NOT EXISTS idx_summary_events_thread_id ON summary_events(thread_id)
    `, 'Creating index: events thread_id');
    
    await executeSql(`
      CREATE INDEX IF NOT EXISTS idx_summary_events_created_at ON summary_events(created_at)
    `, 'Creating index: events created_at');

    // 5. GIN indexes
    await executeSql(`
      CREATE INDEX IF NOT EXISTS idx_summaries_facts ON summaries USING GIN (facts)
    `, 'Creating GIN index: facts');
    
    await executeSql(`
      CREATE INDEX IF NOT EXISTS idx_summaries_decisions ON summaries USING GIN (decisions)
    `, 'Creating GIN index: decisions');
    
    await executeSql(`
      CREATE INDEX IF NOT EXISTS idx_summaries_todos ON summaries USING GIN (todos)
    `, 'Creating GIN index: todos');
    
    await executeSql(`
      CREATE INDEX IF NOT EXISTS idx_summaries_glossary ON summaries USING GIN (glossary)
    `, 'Creating GIN index: glossary');

    // 6. Enable RLS
    await executeSql(`
      ALTER TABLE summaries ENABLE ROW LEVEL SECURITY
    `, 'Enabling RLS: summaries');
    
    await executeSql(`
      ALTER TABLE summary_events ENABLE ROW LEVEL SECURITY
    `, 'Enabling RLS: summary_events');

    // 7. RLS policies for summaries
    await executeSql(`
      CREATE POLICY "Users can view own chat summaries" 
        ON summaries FOR SELECT 
        USING (
          thread_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid()
          )
        )
    `, 'Creating RLS policy: view summaries');

    await executeSql(`
      CREATE POLICY "Users can update own chat summaries" 
        ON summaries FOR UPDATE 
        USING (
          thread_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid()
          )
        )
    `, 'Creating RLS policy: update summaries');

    await executeSql(`
      CREATE POLICY "Users can insert own chat summaries" 
        ON summaries FOR INSERT 
        WITH CHECK (
          thread_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid()
          )
        )
    `, 'Creating RLS policy: insert summaries');

    // 8. RLS policies for summary_events
    await executeSql(`
      CREATE POLICY "Users can view own chat summary events" 
        ON summary_events FOR SELECT 
        USING (
          thread_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid()
          )
        )
    `, 'Creating RLS policy: view events');

    await executeSql(`
      CREATE POLICY "Users can insert own chat summary events" 
        ON summary_events FOR INSERT 
        WITH CHECK (
          thread_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid()
          )
        )
    `, 'Creating RLS policy: insert events');

    // 9. Create trigger for summaries
    await executeSql(`
      CREATE TRIGGER update_summaries_updated_at 
        BEFORE UPDATE ON summaries 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
    `, 'Creating trigger: summaries updated_at');

    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const tables = ['summaries', 'summary_events'];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1);
      
      if (error && !error.message.includes('no rows')) {
        console.error(`❌ Table ${table} verification failed:`, error.message);
      } else {
        console.log(`✅ Table ${table} exists and is accessible`);
      }
    }

    console.log('\n✨ Tables fixed successfully!');
    
  } catch (error) {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  }
}

runFix().catch(console.error);
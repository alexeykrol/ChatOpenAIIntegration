#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

console.log('🚀 Starting Retrieval Module migration...');

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

async function runMigration() {
  try {
    // 1. Create memory_settings table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS memory_settings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        use_summarization BOOLEAN DEFAULT false,
        summarization_model TEXT DEFAULT 'gpt-3.5-turbo',
        summarization_prompt_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `, 'Creating memory_settings table');

    // 2. Create summary_prompts table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS summary_prompts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        model TEXT DEFAULT 'gpt-3.5-turbo',
        temperature DECIMAL(2,1) DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 2000,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `, 'Creating summary_prompts table');

    // 3. Create summaries table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS summaries (
        thread_id UUID PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
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
    `, 'Creating summaries table');

    // 4. Create summary_events table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS summary_events (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        thread_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'error', 'reconcile')),
        from_version INTEGER,
        to_version INTEGER,
        details JSONB DEFAULT '{}'::jsonb,
        window_msg_ids UUID[] DEFAULT ARRAY[]::UUID[],
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `, 'Creating summary_events table');

    // 5. Add foreign key for memory_settings
    await executeSql(`
      ALTER TABLE memory_settings 
        ADD CONSTRAINT fk_memory_settings_prompt 
        FOREIGN KEY (summarization_prompt_id) 
        REFERENCES summary_prompts(id) 
        ON DELETE SET NULL
    `, 'Adding foreign key constraint');

    // 6. Create indexes
    await executeSql(`
      CREATE INDEX IF NOT EXISTS idx_summaries_thread_id ON summaries(thread_id);
      CREATE INDEX IF NOT EXISTS idx_summaries_updated_at ON summaries(updated_at);
      CREATE INDEX IF NOT EXISTS idx_summary_events_thread_id ON summary_events(thread_id);
      CREATE INDEX IF NOT EXISTS idx_summary_events_created_at ON summary_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_memory_settings_user_id ON memory_settings(user_id)
    `, 'Creating indexes');

    // 7. GIN indexes for JSONB
    await executeSql(`
      CREATE INDEX IF NOT EXISTS idx_summaries_facts ON summaries USING GIN (facts);
      CREATE INDEX IF NOT EXISTS idx_summaries_decisions ON summaries USING GIN (decisions);
      CREATE INDEX IF NOT EXISTS idx_summaries_todos ON summaries USING GIN (todos);
      CREATE INDEX IF NOT EXISTS idx_summaries_glossary ON summaries USING GIN (glossary)
    `, 'Creating GIN indexes');

    // 8. Enable RLS
    await executeSql(`
      ALTER TABLE memory_settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE summary_prompts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
      ALTER TABLE summary_events ENABLE ROW LEVEL SECURITY
    `, 'Enabling RLS');

    // 9. Create RLS policies for memory_settings
    await executeSql(`
      CREATE POLICY "Users can view own memory settings" 
        ON memory_settings FOR SELECT 
        USING (auth.uid() = user_id)
    `, 'Creating RLS policy: view memory settings');

    await executeSql(`
      CREATE POLICY "Users can update own memory settings" 
        ON memory_settings FOR UPDATE 
        USING (auth.uid() = user_id)
    `, 'Creating RLS policy: update memory settings');

    await executeSql(`
      CREATE POLICY "Users can insert own memory settings" 
        ON memory_settings FOR INSERT 
        WITH CHECK (auth.uid() = user_id)
    `, 'Creating RLS policy: insert memory settings');

    // 10. RLS for summary_prompts
    await executeSql(`
      CREATE POLICY "Authenticated users can view summary prompts" 
        ON summary_prompts FOR SELECT 
        USING (auth.role() = 'authenticated')
    `, 'Creating RLS policy: view prompts');

    // 11. RLS for summaries
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

    // 12. RLS for summary_events
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

    // 13. Insert default summarization prompt
    const defaultPrompt = `You are a precise summarization assistant. Given a conversation pair (user question and assistant response), extract and update the following structured information:

1. SUMMARY: A brief overview of what was discussed (max 200 chars)
2. KEY_POINTS: Main points from this exchange
3. FACTS: Important facts mentioned (as key-value pairs)
4. DECISIONS: Any decisions made
5. TODOS: Action items mentioned
6. GOALS: Stated objectives or goals
7. CONSTRAINTS: Mentioned limitations or requirements
8. GLOSSARY: Technical terms or important concepts defined

Return the result as valid JSON with these exact keys. Be concise and only include information explicitly stated in the conversation.`;

    await executeSql(`
      INSERT INTO summary_prompts (name, prompt, model, temperature, is_active)
      VALUES (
        'Default Summarization Prompt',
        '${defaultPrompt.replace(/'/g, "''")}',
        'gpt-3.5-turbo',
        0.7,
        true
      ) ON CONFLICT DO NOTHING
    `, 'Inserting default prompt');

    // 14. Create update trigger function
    await executeSql(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `, 'Creating update trigger function');

    // 15. Create triggers
    await executeSql(`
      CREATE TRIGGER update_memory_settings_updated_at 
        BEFORE UPDATE ON memory_settings 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
    `, 'Creating trigger: memory_settings');

    await executeSql(`
      CREATE TRIGGER update_summary_prompts_updated_at 
        BEFORE UPDATE ON summary_prompts 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
    `, 'Creating trigger: summary_prompts');

    await executeSql(`
      CREATE TRIGGER update_summaries_updated_at 
        BEFORE UPDATE ON summaries 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
    `, 'Creating trigger: summaries');

    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const tables = ['memory_settings', 'summary_prompts', 'summaries', 'summary_events'];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1);
      
      if (error && !error.message.includes('no rows')) {
        console.error(`❌ Table ${table} verification failed:`, error.message);
      } else {
        console.log(`✅ Table ${table} exists and is accessible`);
      }
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update TypeScript types in src/lib/supabase.ts');
    console.log('2. Create API route for summarization');
    console.log('3. Update DATABASE_CHANGELOG.md');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration().catch(console.error);
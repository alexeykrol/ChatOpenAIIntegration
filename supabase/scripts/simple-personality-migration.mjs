#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const commands = [
  {
    name: 'Add summarization_enabled column',
    sql: "ALTER TABLE personalities ADD COLUMN IF NOT EXISTS summarization_enabled BOOLEAN DEFAULT false;"
  },
  {
    name: 'Add summarization_model column', 
    sql: "ALTER TABLE personalities ADD COLUMN IF NOT EXISTS summarization_model TEXT DEFAULT 'gpt-3.5-turbo';"
  },
  {
    name: 'Add summarization_prompt column',
    sql: `ALTER TABLE personalities ADD COLUMN IF NOT EXISTS summarization_prompt TEXT DEFAULT 'You are a helpful assistant that creates concise summaries of conversations. 

Focus on:
- Key facts and decisions made
- Important context and background information
- Action items and todos mentioned
- Goals and constraints discussed
- Technical details and specifications

Keep summaries accurate and concise while preserving essential information.';`
  },
  {
    name: 'Create index for summarization_enabled',
    sql: "CREATE INDEX IF NOT EXISTS idx_personalities_summarization_enabled ON personalities(user_id, summarization_enabled) WHERE summarization_enabled = true;"
  },
  {
    name: 'Enable summarization for existing personalities with memory',
    sql: "UPDATE personalities SET summarization_enabled = true WHERE has_memory = true;"
  }
];

async function runSimpleMigration() {
  console.log('🚀 Running simple personality summarization migration...\n');
  
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    console.log(`[${i + 1}/${commands.length}] ${cmd.name}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: cmd.sql });
      
      if (error) {
        if (error.message.includes('already exists')) {
          console.log('✓ Already exists, skipping...');
        } else {
          console.error('❌ Error:', error.message);
          throw error;
        }
      } else {
        console.log('✅ Success');
      }
    } catch (err) {
      console.error('❌ Failed:', err.message);
      throw err;
    }
  }
  
  // Verify the migration
  console.log('\n🔍 Verifying migration...');
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'personalities' 
          AND column_name IN ('summarization_enabled', 'summarization_model', 'summarization_prompt');`
  });
  
  if (error) {
    console.error('❌ Verification failed:', error.message);
  } else {
    console.log(`✅ Found ${data.length} new columns in personalities table`);
    data.forEach(row => console.log(`   - ${row.column_name}`));
  }
  
  console.log('\n✨ Migration completed successfully!');
}

runSimpleMigration().catch(console.error);
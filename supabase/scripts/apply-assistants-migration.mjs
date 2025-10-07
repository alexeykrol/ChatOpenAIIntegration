import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyAssistantsMigration() {
  try {
    console.log('🤖 Applying Assistants migration...');
    
    // 1. Add OpenAI Assistant fields to personalities
    console.log('1️⃣ Adding Assistant fields to personalities table...');
    
    const queries = [
      'ALTER TABLE personalities ADD COLUMN IF NOT EXISTS openai_assistant_id text',
      'ALTER TABLE personalities ADD COLUMN IF NOT EXISTS openai_file_id text'
    ];
    
    for (const query of queries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error && !error.message.includes('already exists')) {
        console.log(`Query failed: ${query}`);
        console.log('Error:', error.message);
      } else {
        console.log(`✅ ${query.split(' ')[5]} column added`);
      }
    }
    
    // 2. Add OpenAI Thread ID to chats
    console.log('2️⃣ Adding Thread ID to chats table...');
    
    const threadQuery = 'ALTER TABLE chats ADD COLUMN IF NOT EXISTS openai_thread_id text';
    const { error: threadError } = await supabase.rpc('exec_sql', { sql: threadQuery });
    if (threadError && !threadError.message.includes('already exists')) {
      console.log('Thread ID error:', threadError.message);
    } else {
      console.log('✅ openai_thread_id column added');
    }
    
    // 3. Create indexes
    console.log('3️⃣ Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS personalities_assistant_id_idx ON personalities(openai_assistant_id)',
      'CREATE INDEX IF NOT EXISTS chats_thread_id_idx ON chats(openai_thread_id)'
    ];
    
    for (const indexQuery of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexQuery });
      if (indexError) {
        console.log('Index error:', indexError.message);
      } else {
        console.log('✅ Index created');
      }
    }
    
    console.log('🎉 Assistants migration completed successfully!');
    
    // Verify
    console.log('🔍 Verifying migration...');
    const { data: testData, error: testError } = await supabase
      .from('personalities')
      .select('openai_assistant_id, openai_file_id')
      .limit(1);
    
    if (testError) {
      console.log('Verification error:', testError.message);
    } else {
      console.log('✅ Migration verified - Assistant fields accessible');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
}

applyAssistantsMigration();
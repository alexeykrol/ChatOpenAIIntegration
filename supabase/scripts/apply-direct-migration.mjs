import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Используем переменные окружения
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyDirectMigration() {
  try {
    console.log('📊 Applying RAG migration directly...');
    
    // 1. Добавляем новые поля в таблицу personalities
    console.log('1️⃣ Adding new columns to personalities table...');
    
    const alterPersonalities = `
      ALTER TABLE personalities 
      ADD COLUMN IF NOT EXISTS file_name text,
      ADD COLUMN IF NOT EXISTS file_instruction text,
      ADD COLUMN IF NOT EXISTS file_content text,
      ADD COLUMN IF NOT EXISTS uploaded_at timestamptz,
      ADD COLUMN IF NOT EXISTS chunk_size integer DEFAULT 800,
      ADD COLUMN IF NOT EXISTS top_chunks integer DEFAULT 3,
      ADD COLUMN IF NOT EXISTS embedding_model text DEFAULT 'text-embedding-3-small',
      ADD COLUMN IF NOT EXISTS openai_file_id text;
    `;
    
    const { error: alterError } = await supabase.rpc('exec_sql', { sql: alterPersonalities });
    if (alterError) {
      console.log('Trying alternative approach for ALTER TABLE...');
      // Пробуем через прямые запросы
      const queries = [
        'ALTER TABLE personalities ADD COLUMN IF NOT EXISTS file_name text',
        'ALTER TABLE personalities ADD COLUMN IF NOT EXISTS file_instruction text',
        'ALTER TABLE personalities ADD COLUMN IF NOT EXISTS file_content text',
        'ALTER TABLE personalities ADD COLUMN IF NOT EXISTS uploaded_at timestamptz',
        'ALTER TABLE personalities ADD COLUMN IF NOT EXISTS chunk_size integer DEFAULT 800',
        'ALTER TABLE personalities ADD COLUMN IF NOT EXISTS top_chunks integer DEFAULT 3',
        "ALTER TABLE personalities ADD COLUMN IF NOT EXISTS embedding_model text DEFAULT 'text-embedding-3-small'",
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
    } else {
      console.log('✅ Personalities table columns added');
    }
    
    // 2. Создаем таблицу personality_embeddings
    console.log('2️⃣ Creating personality_embeddings table...');
    
    const createEmbeddings = `
      CREATE TABLE IF NOT EXISTS personality_embeddings (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        personality_id uuid REFERENCES personalities(id) ON DELETE CASCADE,
        chunk_text text NOT NULL,
        chunk_index integer NOT NULL,
        embedding text,
        created_at timestamptz DEFAULT now()
      );
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createEmbeddings });
    if (createError) {
      console.log('Create table error:', createError.message);
    } else {
      console.log('✅ personality_embeddings table created');
    }
    
    // 3. Создаем индекс
    console.log('3️⃣ Creating index...');
    
    const createIndex = `
      CREATE INDEX IF NOT EXISTS personality_embeddings_personality_id_idx 
      ON personality_embeddings(personality_id);
    `;
    
    const { error: indexError } = await supabase.rpc('exec_sql', { sql: createIndex });
    if (indexError) {
      console.log('Index error:', indexError.message);
    } else {
      console.log('✅ Index created');
    }
    
    // 4. Включаем RLS
    console.log('4️⃣ Enabling RLS...');
    
    const enableRLS = 'ALTER TABLE personality_embeddings ENABLE ROW LEVEL SECURITY';
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: enableRLS });
    if (rlsError) {
      console.log('RLS error:', rlsError.message);
    } else {
      console.log('✅ RLS enabled');
    }
    
    // 5. Создаем политики RLS
    console.log('5️⃣ Creating RLS policies...');
    
    const policies = [
      `CREATE POLICY "Users can view their own personality embeddings" ON personality_embeddings
       FOR SELECT USING (
         EXISTS (
           SELECT 1 FROM personalities 
           WHERE personalities.id = personality_embeddings.personality_id 
           AND personalities.user_id = auth.uid()
         )
       )`,
      
      `CREATE POLICY "Users can insert embeddings for their own personalities" ON personality_embeddings
       FOR INSERT WITH CHECK (
         EXISTS (
           SELECT 1 FROM personalities 
           WHERE personalities.id = personality_embeddings.personality_id 
           AND personalities.user_id = auth.uid()
         )
       )`,
       
      `CREATE POLICY "Users can update embeddings for their own personalities" ON personality_embeddings
       FOR UPDATE USING (
         EXISTS (
           SELECT 1 FROM personalities 
           WHERE personalities.id = personality_embeddings.personality_id 
           AND personalities.user_id = auth.uid()
         )
       )`,
       
      `CREATE POLICY "Users can delete embeddings for their own personalities" ON personality_embeddings
       FOR DELETE USING (
         EXISTS (
           SELECT 1 FROM personalities 
           WHERE personalities.id = personality_embeddings.personality_id 
           AND personalities.user_id = auth.uid()
         )
       )`
    ];
    
    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('exec_sql', { sql: policy });
      if (policyError && !policyError.message.includes('already exists')) {
        console.log('Policy error:', policyError.message);
      } else {
        console.log('✅ Policy created');
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    
    // Проверяем результат
    console.log('🔍 Verifying migration...');
    const { data: testData, error: testError } = await supabase
      .from('personalities')
      .select('file_name, chunk_size')
      .limit(1);
    
    if (testError) {
      console.log('Verification error:', testError.message);
    } else {
      console.log('✅ Migration verified - new columns accessible');
      console.log('Sample data structure:', testData?.[0] || 'No data yet');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
}

applyDirectMigration();
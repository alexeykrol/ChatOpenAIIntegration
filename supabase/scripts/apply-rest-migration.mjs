import { createClient } from '@supabase/supabase-js';

// Используем переменные окружения
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMigrationStatus() {
  try {
    console.log('🔍 Checking current table structure...');
    
    // Проверяем текущую структуру таблицы
    const { data, error } = await supabase
      .from('personalities')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error accessing personalities table:', error.message);
      return;
    }
    
    console.log('✅ API connection verified');
    console.log('Current personalities count:', data.length);
    
    if (data.length > 0) {
      console.log('Current columns:', Object.keys(data[0]));
      
      // Проверим, есть ли уже наши поля
      if (data[0].hasOwnProperty('file_name')) {
        console.log('✅ Migration already applied - RAG fields exist');
        
        // Проверим таблицу embeddings
        const { data: embData, error: embError } = await supabase
          .from('personality_embeddings')
          .select('*')
          .limit(1);
          
        if (embError) {
          console.log('❌ personality_embeddings table missing:', embError.message);
        } else {
          console.log('✅ personality_embeddings table exists');
          console.log('Migration is complete and ready to use!');
        }
        return;
      }
    } else {
      console.log('No data in personalities table yet');
    }
    
    console.log('');
    console.log('🚨 Migration не применена');
    console.log('');
    console.log('Для применения миграции выполните следующие шаги:');
    console.log('1. Откройте https://supabase.com/dashboard');
    console.log(`2. Выберите проект: ${supabaseUrl.split('//')[1].split('.')[0]}`);
    console.log('3. Перейдите в SQL Editor');
    console.log('4. Скопируйте содержимое из simple-migration.sql и выполните его');
    console.log('');
    console.log('Содержимое миграции:');
    console.log('---');
    console.log(`-- Add file and RAG configuration fields to personalities table
ALTER TABLE personalities 
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS file_instruction text,
ADD COLUMN IF NOT EXISTS file_content text,
ADD COLUMN IF NOT EXISTS uploaded_at timestamptz,
ADD COLUMN IF NOT EXISTS chunk_size integer DEFAULT 800,
ADD COLUMN IF NOT EXISTS top_chunks integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS embedding_model text DEFAULT 'text-embedding-3-small',
ADD COLUMN IF NOT EXISTS openai_file_id text;

-- Create personality_embeddings table for vector storage
CREATE TABLE IF NOT EXISTS personality_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  personality_id uuid REFERENCES personalities(id) ON DELETE CASCADE,
  chunk_text text NOT NULL,
  chunk_index integer NOT NULL,
  embedding text, -- JSON array of numbers as text
  created_at timestamptz DEFAULT now()
);

-- Create basic index for personality lookups
CREATE INDEX IF NOT EXISTS personality_embeddings_personality_id_idx ON personality_embeddings(personality_id);

-- RLS policies for personality_embeddings
ALTER TABLE personality_embeddings ENABLE ROW LEVEL SECURITY;

-- Users can only access embeddings for their own personalities
CREATE POLICY "Users can view their own personality embeddings" ON personality_embeddings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM personalities 
    WHERE personalities.id = personality_embeddings.personality_id 
    AND personalities.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert embeddings for their own personalities" ON personality_embeddings
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM personalities 
    WHERE personalities.id = personality_embeddings.personality_id 
    AND personalities.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update embeddings for their own personalities" ON personality_embeddings
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM personalities 
    WHERE personalities.id = personality_embeddings.personality_id 
    AND personalities.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete embeddings for their own personalities" ON personality_embeddings
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM personalities 
    WHERE personalities.id = personality_embeddings.personality_id 
    AND personalities.user_id = auth.uid()
  )
);`);
    console.log('---');
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkMigrationStatus();
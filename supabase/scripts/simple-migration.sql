-- Simple RAG migration without vector extension dependencies

-- Add file and RAG configuration fields to personalities table
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
-- Using text for embeddings temporarily (can be parsed as JSON)
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
);
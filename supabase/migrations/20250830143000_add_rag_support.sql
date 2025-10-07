/*
  # Add RAG support to personalities

  1. Schema Changes
    - Add file-related fields to `personalities` table
    - Add configurable RAG parameters
    - Create `personality_embeddings` table for vector storage

  2. New Fields in personalities:
    - file_name: Original filename
    - file_instruction: User instructions for file usage
    - file_content: Backup of file content
    - uploaded_at: File upload timestamp
    - chunk_size: Configurable chunk size (default: 800)
    - top_chunks: Number of relevant chunks to retrieve (default: 3)
    - embedding_model: OpenAI embedding model (default: text-embedding-3-small)
    - openai_file_id: OpenAI file ID if using their file storage

  3. New Table: personality_embeddings
    - Stores text chunks and their vector embeddings
    - Linked to personalities for efficient retrieval
*/

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
CREATE TABLE IF NOT EXISTS personality_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  personality_id uuid REFERENCES personalities(id) ON DELETE CASCADE,
  chunk_text text NOT NULL,
  chunk_index integer NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small produces 1536 dimensions
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient similarity search
CREATE INDEX IF NOT EXISTS personality_embeddings_personality_id_idx ON personality_embeddings(personality_id);
CREATE INDEX IF NOT EXISTS personality_embeddings_embedding_idx ON personality_embeddings USING ivfflat (embedding vector_cosine_ops);

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
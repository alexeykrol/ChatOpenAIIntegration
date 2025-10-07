/*
  # Add Assistants API support

  1. Schema Changes
    - Add openai_assistant_id to personalities table
    - Add openai_thread_id to chats table
    - Remove RAG-related fields (they're not needed with Assistants API)

  2. Migration approach:
    - Add new fields
    - Keep old RAG fields for now (for gradual migration)
    - Will remove them in a later migration
*/

-- Add OpenAI Assistant ID to personalities
ALTER TABLE personalities 
ADD COLUMN IF NOT EXISTS openai_assistant_id text,
ADD COLUMN IF NOT EXISTS openai_file_id text; -- For the uploaded file in OpenAI

-- Add OpenAI Thread ID to chats 
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS openai_thread_id text;

-- Create index for faster assistant lookups
CREATE INDEX IF NOT EXISTS personalities_assistant_id_idx ON personalities(openai_assistant_id);
CREATE INDEX IF NOT EXISTS chats_thread_id_idx ON chats(openai_thread_id);
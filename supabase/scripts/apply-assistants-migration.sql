-- Add OpenAI Assistant ID to personalities
ALTER TABLE personalities 
ADD COLUMN IF NOT EXISTS openai_assistant_id text,
ADD COLUMN IF NOT EXISTS openai_file_id text;

-- Add OpenAI Thread ID to chats 
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS openai_thread_id text;

-- Create index for faster assistant lookups
CREATE INDEX IF NOT EXISTS personalities_assistant_id_idx ON personalities(openai_assistant_id);
CREATE INDEX IF NOT EXISTS chats_thread_id_idx ON chats(openai_thread_id);
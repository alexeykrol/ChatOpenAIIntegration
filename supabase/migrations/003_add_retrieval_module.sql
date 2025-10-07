-- Migration: Add Retrieval Module tables for summary and memory management
-- Date: 2025-01-31
-- Purpose: Support incremental summarization for chat memory

-- 1. Create memory_settings table for user-level summarization settings
CREATE TABLE IF NOT EXISTS memory_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    use_summarization BOOLEAN DEFAULT false,
    summarization_model TEXT DEFAULT 'gpt-3.5-turbo',
    summarization_prompt_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Create summary_prompts table for storing summarization prompts
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
);

-- 3. Create summaries table for storing thread summaries
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
);

-- 4. Create summary_events table for audit and debugging
CREATE TABLE IF NOT EXISTS summary_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'error', 'reconcile')),
    from_version INTEGER,
    to_version INTEGER,
    details JSONB DEFAULT '{}'::jsonb,
    window_msg_ids UUID[] DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Add foreign key constraint for memory_settings.summarization_prompt_id
ALTER TABLE memory_settings 
    ADD CONSTRAINT fk_memory_settings_prompt 
    FOREIGN KEY (summarization_prompt_id) 
    REFERENCES summary_prompts(id) 
    ON DELETE SET NULL;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_summaries_thread_id ON summaries(thread_id);
CREATE INDEX IF NOT EXISTS idx_summaries_updated_at ON summaries(updated_at);
CREATE INDEX IF NOT EXISTS idx_summary_events_thread_id ON summary_events(thread_id);
CREATE INDEX IF NOT EXISTS idx_summary_events_created_at ON summary_events(created_at);
CREATE INDEX IF NOT EXISTS idx_memory_settings_user_id ON memory_settings(user_id);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_summaries_facts ON summaries USING GIN (facts);
CREATE INDEX IF NOT EXISTS idx_summaries_decisions ON summaries USING GIN (decisions);
CREATE INDEX IF NOT EXISTS idx_summaries_todos ON summaries USING GIN (todos);
CREATE INDEX IF NOT EXISTS idx_summaries_glossary ON summaries USING GIN (glossary);

-- 7. Add RLS policies
ALTER TABLE memory_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE summary_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE summary_events ENABLE ROW LEVEL SECURITY;

-- Memory settings policies - users can only access their own settings
CREATE POLICY "Users can view own memory settings" 
    ON memory_settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own memory settings" 
    ON memory_settings FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory settings" 
    ON memory_settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Summary prompts policies - all authenticated users can read, only admins can write
CREATE POLICY "Authenticated users can view summary prompts" 
    ON summary_prompts FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Summaries policies - users can access summaries for their chats
CREATE POLICY "Users can view own chat summaries" 
    ON summaries FOR SELECT 
    USING (
        thread_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own chat summaries" 
    ON summaries FOR UPDATE 
    USING (
        thread_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own chat summaries" 
    ON summaries FOR INSERT 
    WITH CHECK (
        thread_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid()
        )
    );

-- Summary events policies - users can view events for their chats
CREATE POLICY "Users can view own chat summary events" 
    ON summary_events FOR SELECT 
    USING (
        thread_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own chat summary events" 
    ON summary_events FOR INSERT 
    WITH CHECK (
        thread_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid()
        )
    );

-- 8. Insert default summarization prompt
INSERT INTO summary_prompts (name, prompt, model, temperature, is_active)
VALUES (
    'Default Summarization Prompt',
    'You are a precise summarization assistant. Given a conversation pair (user question and assistant response), extract and update the following structured information:

1. SUMMARY: A brief overview of what was discussed (max 200 chars)
2. KEY_POINTS: Main points from this exchange
3. FACTS: Important facts mentioned (as key-value pairs)
4. DECISIONS: Any decisions made
5. TODOS: Action items mentioned
6. GOALS: Stated objectives or goals
7. CONSTRAINTS: Mentioned limitations or requirements
8. GLOSSARY: Technical terms or important concepts defined

Return the result as valid JSON with these exact keys. Be concise and only include information explicitly stated in the conversation.',
    'gpt-3.5-turbo',
    0.7,
    true
) ON CONFLICT DO NOTHING;

-- 9. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create triggers for updated_at
CREATE TRIGGER update_memory_settings_updated_at 
    BEFORE UPDATE ON memory_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_summary_prompts_updated_at 
    BEFORE UPDATE ON summary_prompts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_summaries_updated_at 
    BEFORE UPDATE ON summaries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Migration complete
-- Tables created: memory_settings, summary_prompts, summaries, summary_events
-- Next step: Create trigger for assistant messages to initiate summarization
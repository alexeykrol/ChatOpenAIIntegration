-- Migration: Add RLS policies to all tables
-- Purpose: Ensure data isolation between users
-- Date: 2025-10-06

-- =====================================================
-- PERSONALITIES TABLE
-- =====================================================
ALTER TABLE public.personalities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own personalities" ON public.personalities;
DROP POLICY IF EXISTS "Users can insert own personalities" ON public.personalities;
DROP POLICY IF EXISTS "Users can update own personalities" ON public.personalities;
DROP POLICY IF EXISTS "Users can delete own personalities" ON public.personalities;

-- Create policies
CREATE POLICY "Users can view own personalities"
  ON public.personalities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personalities"
  ON public.personalities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personalities"
  ON public.personalities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own personalities"
  ON public.personalities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- CHATS TABLE
-- =====================================================
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can insert own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON public.chats;

CREATE POLICY "Users can view own chats"
  ON public.chats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats"
  ON public.chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats"
  ON public.chats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats"
  ON public.chats FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;

-- Messages belong to chats, which belong to users
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- =====================================================
-- MEMORY_SETTINGS TABLE (if exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memory_settings') THEN
    ALTER TABLE public.memory_settings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own memory settings" ON public.memory_settings;
    DROP POLICY IF EXISTS "Users can update own memory settings" ON public.memory_settings;

    CREATE POLICY "Users can view own memory settings"
      ON public.memory_settings FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.personalities
          WHERE personalities.id = memory_settings.personality_id
          AND personalities.user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can update own memory settings"
      ON public.memory_settings FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.personalities
          WHERE personalities.id = memory_settings.personality_id
          AND personalities.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.personalities
          WHERE personalities.id = memory_settings.personality_id
          AND personalities.user_id = auth.uid()
        )
      );

    RAISE NOTICE 'RLS policies applied to memory_settings table';
  END IF;
END $$;

-- =====================================================
-- SUMMARIES TABLE (if exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'summaries') THEN
    ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own summaries" ON public.summaries;

    CREATE POLICY "Users can view own summaries"
      ON public.summaries FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.personalities
          WHERE personalities.id = summaries.personality_id
          AND personalities.user_id = auth.uid()
        )
      );

    RAISE NOTICE 'RLS policies applied to summaries table';
  END IF;
END $$;

-- =====================================================
-- SUMMARY_EVENTS TABLE (if exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'summary_events') THEN
    ALTER TABLE public.summary_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own summary events" ON public.summary_events;

    CREATE POLICY "Users can view own summary events"
      ON public.summary_events FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.personalities
          WHERE personalities.id = summary_events.personality_id
          AND personalities.user_id = auth.uid()
        )
      );

    RAISE NOTICE 'RLS policies applied to summary_events table';
  END IF;
END $$;

-- =====================================================
-- SUMMARY_PROMPTS TABLE (if exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'summary_prompts') THEN
    ALTER TABLE public.summary_prompts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Everyone can view summary prompts" ON public.summary_prompts;

    -- Summary prompts are global templates, readable by all
    CREATE POLICY "Everyone can view summary prompts"
      ON public.summary_prompts FOR SELECT
      TO authenticated
      USING (true);

    RAISE NOTICE 'RLS policies applied to summary_prompts table';
  END IF;
END $$;

-- =====================================================
-- Grant service_role bypass for all tables
-- =====================================================
-- Service role can bypass RLS for admin operations
-- This is automatic in Supabase but we document it here

-- =====================================================
-- Create indexes for RLS performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_personalities_user_id ON public.personalities(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);

-- Log migration
DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'RLS policies migration completed successfully';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Tables secured:';
  RAISE NOTICE '  - personalities (4 policies)';
  RAISE NOTICE '  - chats (4 policies)';
  RAISE NOTICE '  - messages (4 policies)';
  RAISE NOTICE '  - memory_settings (if exists)';
  RAISE NOTICE '  - summaries (if exists)';
  RAISE NOTICE '  - summary_events (if exists)';
  RAISE NOTICE '  - summary_prompts (if exists)';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Users can now only access their own data';
  RAISE NOTICE '=================================================';
END $$;

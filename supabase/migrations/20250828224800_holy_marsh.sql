/*
  # Add missing columns to chats table

  1. Changes
    - Add `title` column to `chats` table (if missing)
    - Add `created_at` column to `chats` table (if missing)  
    - Add `updated_at` column to `chats` table (if missing)
    - Add trigger for automatic updated_at updates

  2. Security
    - Ensure RLS policies exist for chats table
*/

-- Add missing columns to chats table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.chats ADD COLUMN title text DEFAULT 'New Chat' NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.chats ADD COLUMN created_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.chats ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Add trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_chats_updated_at'
  ) THEN
    CREATE TRIGGER update_chats_updated_at
      BEFORE UPDATE ON public.chats
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Ensure RLS policies exist for chats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chats' AND policyname = 'Users can view their own chats'
  ) THEN
    CREATE POLICY "Users can view their own chats"
      ON public.chats
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chats' AND policyname = 'Users can insert their own chats'
  ) THEN
    CREATE POLICY "Users can insert their own chats"
      ON public.chats
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chats' AND policyname = 'Users can update their own chats'
  ) THEN
    CREATE POLICY "Users can update their own chats"
      ON public.chats
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chats' AND policyname = 'Users can delete their own chats'
  ) THEN
    CREATE POLICY "Users can delete their own chats"
      ON public.chats
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
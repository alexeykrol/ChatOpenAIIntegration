/*
  # Create messages table

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `chat_id` (text, foreign key to chats.id)
      - `role` (text, 'user' or 'assistant')
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `messages` table
    - Add policies for users to manage messages in their own chats
*/

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chats 
    WHERE id = chat_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chats 
    WHERE id = chat_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own messages"
  ON public.messages
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chats 
    WHERE id = chat_id AND user_id = auth.uid()
  ));
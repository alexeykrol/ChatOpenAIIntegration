import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}. Please ensure VITE_SUPABASE_URL is a valid URL (e.g., https://your-project-ref.supabase.co)`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      chats: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          created_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          openai_api_key: string | null;
          model: string;
          temperature: number;
          max_tokens: number;
          theme: 'light' | 'dark';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          openai_api_key?: string | null;
          model?: string;
          temperature?: number;
          max_tokens?: number;
          theme?: 'light' | 'dark';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          openai_api_key?: string | null;
          model?: string;
          temperature?: number;
          max_tokens?: number;
          theme?: 'light' | 'dark';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    personalities: {
      Row: {
        id: string;
        user_id: string;
        name: string;
        prompt: string;
        is_active: boolean;
        has_memory: boolean;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        user_id: string;
        name: string;
        prompt: string;
        is_active?: boolean;
        has_memory?: boolean;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        user_id?: string;
        name?: string;
        prompt?: string;
        is_active?: boolean;
        has_memory?: boolean;
        created_at?: string;
        updated_at?: string;
      };
    };
  };
};
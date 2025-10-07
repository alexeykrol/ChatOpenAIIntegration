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

export interface PersonalityFile {
  openai_file_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  uploaded_at: string;
  error_message?: string;
}

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
          openai_thread_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
          openai_thread_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
          openai_thread_id?: string | null;
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
          openai_assistant_id: string | null;
          files: PersonalityFile[];
          file_instruction: string | null;
          summarization_enabled: boolean;
          summarization_model: string;
          summarization_prompt: string;
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
          openai_assistant_id?: string | null;
          files?: PersonalityFile[];
          file_instruction?: string | null;
          summarization_enabled?: boolean;
          summarization_model?: string;
          summarization_prompt?: string;
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
          openai_assistant_id?: string | null;
          files?: PersonalityFile[];
          file_instruction?: string | null;
          summarization_enabled?: boolean;
          summarization_model?: string;
          summarization_prompt?: string;
        };
      };
      memory_settings: {
        Row: {
          id: string;
          user_id: string;
          use_summarization: boolean;
          summarization_model: string;
          summarization_prompt_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          use_summarization?: boolean;
          summarization_model?: string;
          summarization_prompt_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          use_summarization?: boolean;
          summarization_model?: string;
          summarization_prompt_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      summary_prompts: {
        Row: {
          id: string;
          name: string;
          prompt: string;
          model: string;
          temperature: number;
          max_tokens: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          prompt: string;
          model?: string;
          temperature?: number;
          max_tokens?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          prompt?: string;
          model?: string;
          temperature?: number;
          max_tokens?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      summaries: {
        Row: {
          thread_id: string;
          version: number;
          core_text: string | null;
          facts: any;
          decisions: any;
          todos: any;
          goals: string[];
          constraints: string[];
          glossary: any;
          deltas: any;
          last_msg_id: string | null;
          last_pair_seq: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          thread_id: string;
          version?: number;
          core_text?: string | null;
          facts?: any;
          decisions?: any;
          todos?: any;
          goals?: string[];
          constraints?: string[];
          glossary?: any;
          deltas?: any;
          last_msg_id?: string | null;
          last_pair_seq?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          thread_id?: string;
          version?: number;
          core_text?: string | null;
          facts?: any;
          decisions?: any;
          todos?: any;
          goals?: string[];
          constraints?: string[];
          glossary?: any;
          deltas?: any;
          last_msg_id?: string | null;
          last_pair_seq?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      summary_events: {
        Row: {
          id: string;
          thread_id: string;
          event_type: 'created' | 'updated' | 'error' | 'reconcile';
          from_version: number | null;
          to_version: number | null;
          details: any;
          window_msg_ids: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          event_type: 'created' | 'updated' | 'error' | 'reconcile';
          from_version?: number | null;
          to_version?: number | null;
          details?: any;
          window_msg_ids?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          event_type?: 'created' | 'updated' | 'error' | 'reconcile';
          from_version?: number | null;
          to_version?: number | null;
          details?: any;
          window_msg_ids?: string[];
          created_at?: string;
        };
      };
    };
  };
};
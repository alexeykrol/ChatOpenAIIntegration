// Types for Retrieval module - Summary and Memory management

export interface Summary {
  thread_id: string;
  version: number;
  core_text: string | null;
  
  // Structured data
  facts: Record<string, { value: string; source_msg_ids: string[] }>;
  decisions: Array<{ text: string; msg_id: string; timestamp: string }>;
  todos: Array<{ text: string; status?: string; msg_id: string }>;
  goals: string[];
  constraints: string[];
  glossary: Record<string, string>;
  
  // Metadata
  deltas: Array<{ action: string; details: string; timestamp: string }>;
  last_msg_id: string | null;
  last_pair_seq?: number;
  updated_at: string;
  created_at: string;
}

export interface SummaryEvent {
  id: string;
  thread_id: string;
  event_type: 'created' | 'updated' | 'error' | 'reconcile';
  from_version?: number;
  to_version?: number;
  details: Record<string, any>;
  window_msg_ids?: string[];
  created_at: string;
}

export interface SummaryPrompt {
  id: string;
  name: string;
  prompt: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemorySettings {
  id: string;
  user_id: string;
  use_summarization: boolean;
  summarization_model: string;
  summarization_prompt_id?: string;
  created_at: string;
  updated_at: string;
}

// Input/Output types for summarization
export interface SummarizationInput {
  thread_id: string;
  user_message: string;
  assistant_message: string;
  user_msg_id: string;
  assistant_msg_id: string;
  current_summary?: Summary | null;
}

export interface SummarizationCandidate {
  summary?: string;
  key_points?: string[];
  facts?: Record<string, string>;
  decisions?: string[];
  todos?: string[];
  goals?: string[];
  constraints?: string[];
  glossary?: Record<string, string>;
}

export interface SummarizationResult {
  success: boolean;
  summary?: Summary;
  error?: string;
  changes?: {
    added: Record<string, any>;
    updated: Record<string, any>;
    removed: string[];
  };
}
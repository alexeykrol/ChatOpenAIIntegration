// Database service for Retrieval module
// Handles all database operations for summaries

import { supabase } from '../../lib/supabase';
import type { 
  Summary,
  SummaryEvent,
  MemorySettings,
  SummaryPrompt
} from '../types';

export class SummaryDatabaseService {
  /**
   * Get or create summary for a thread
   */
  async getOrCreateSummary(threadId: string): Promise<Summary> {
    // Try to get existing summary
    const { data: existing, error: fetchError } = await supabase
      .from('summaries')
      .select('*')
      .eq('thread_id', threadId)
      .single();

    if (existing && !fetchError) {
      return existing as Summary;
    }

    // Create new summary if doesn't exist
    const newSummary: Partial<Summary> = {
      thread_id: threadId,
      version: 1,
      core_text: null,
      facts: {},
      decisions: [],
      todos: [],
      goals: [],
      constraints: [],
      glossary: {},
      deltas: [],
      last_msg_id: null,
      last_pair_seq: null
    };

    const { data: created, error: createError } = await supabase
      .from('summaries')
      .insert(newSummary)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create summary: ${createError.message}`);
    }

    return created as Summary;
  }

  /**
   * Update summary with new data
   */
  async updateSummary(
    threadId: string, 
    updates: Partial<Summary>
  ): Promise<Summary> {
    // Increment version
    const { data: current } = await supabase
      .from('summaries')
      .select('version')
      .eq('thread_id', threadId)
      .single();

    const newVersion = (current?.version || 0) + 1;

    const { data, error } = await supabase
      .from('summaries')
      .update({
        ...updates,
        version: newVersion,
        updated_at: new Date().toISOString()
      })
      .eq('thread_id', threadId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update summary: ${error.message}`);
    }

    return data as Summary;
  }

  /**
   * Check if message was already processed
   */
  async isMessageProcessed(
    threadId: string, 
    messageId: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from('summaries')
      .select('last_msg_id')
      .eq('thread_id', threadId)
      .single();

    return data?.last_msg_id === messageId;
  }

  /**
   * Get user's memory settings
   */
  async getUserMemorySettings(userId: string): Promise<MemorySettings | null> {
    const { data, error } = await supabase
      .from('memory_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings exist, create default
        return this.createDefaultMemorySettings(userId);
      }
      throw error;
    }

    return data as MemorySettings;
  }

  /**
   * Create default memory settings for user
   */
  private async createDefaultMemorySettings(
    userId: string
  ): Promise<MemorySettings> {
    const defaults = {
      user_id: userId,
      use_summarization: false,
      summarization_model: 'gpt-3.5-turbo'
    };

    const { data, error } = await supabase
      .from('memory_settings')
      .insert(defaults)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create memory settings: ${error.message}`);
    }

    return data as MemorySettings;
  }

  /**
   * Update user's memory settings
   */
  async updateMemorySettings(
    userId: string,
    updates: Partial<MemorySettings>
  ): Promise<MemorySettings> {
    const { data, error } = await supabase
      .from('memory_settings')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update memory settings: ${error.message}`);
    }

    return data as MemorySettings;
  }

  /**
   * Get active summarization prompt
   */
  async getActivePrompt(): Promise<SummaryPrompt | null> {
    const { data, error } = await supabase
      .from('summary_prompts')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('No active prompt found:', error);
      return null;
    }

    return data as SummaryPrompt;
  }

  /**
   * Log summary event
   */
  async logEvent(
    threadId: string,
    eventType: SummaryEvent['event_type'],
    details: Record<string, any> = {},
    windowMsgIds: string[] = []
  ): Promise<void> {
    const { error } = await supabase
      .from('summary_events')
      .insert({
        thread_id: threadId,
        event_type: eventType,
        details,
        window_msg_ids: windowMsgIds
      });

    if (error) {
      console.error('Failed to log summary event:', error);
    }
  }
}

export const summaryDb = new SummaryDatabaseService();
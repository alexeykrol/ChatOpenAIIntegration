// Main entry point for Retrieval module
// Provides API for summary management and memory features

import { supabase } from '../lib/supabase';
import type { 
  Summary, 
  SummaryEvent, 
  MemorySettings,
  SummaryPrompt 
} from './types';

export class RetrievalService {
  /**
   * Get summary for a thread
   */
  async getSummary(threadId: string): Promise<Summary | null> {
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('thread_id', threadId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No summary exists yet
        return null;
      }
      console.error('Error fetching summary:', error);
      throw error;
    }

    return data as Summary;
  }

  /**
   * Get memory settings for current user
   */
  async getMemorySettings(userId: string): Promise<MemorySettings | null> {
    const { data, error } = await supabase
      .from('memory_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings exist, will use defaults
        return null;
      }
      console.error('Error fetching memory settings:', error);
      throw error;
    }

    return data as MemorySettings;
  }

  /**
   * Get active summarization prompt
   */
  async getActiveSummaryPrompt(): Promise<SummaryPrompt | null> {
    const { data, error } = await supabase
      .from('summary_prompts')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching active prompt:', error);
      return null;
    }

    return data as SummaryPrompt;
  }

  /**
   * Check if summarization is enabled for user
   */
  async isSummarizationEnabled(userId: string): Promise<boolean> {
    const settings = await this.getMemorySettings(userId);
    return settings?.use_summarization ?? false;
  }

  /**
   * Get summary core text for injection into chat context
   */
  async getSummaryContext(threadId: string): Promise<string | null> {
    const summary = await this.getSummary(threadId);
    return summary?.core_text ?? null;
  }

  /**
   * Log summary event for audit
   */
  async logSummaryEvent(
    threadId: string,
    eventType: SummaryEvent['event_type'],
    details: Record<string, any> = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('summary_events')
      .insert({
        thread_id: threadId,
        event_type: eventType,
        details
      });

    if (error) {
      console.error('Error logging summary event:', error);
    }
  }
}

// Export singleton instance
export const retrievalService = new RetrievalService();
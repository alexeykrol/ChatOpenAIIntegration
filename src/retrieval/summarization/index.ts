// Incremental summarization algorithm implementation
// Core logic for processing message pairs and updating summaries

import OpenAI from 'openai';
import { summaryDb } from '../services/database';
import type {
  Summary,
  SummarizationInput,
  SummarizationCandidate,
  SummarizationResult
} from '../types';

export class SummarizationService {
  private openai: OpenAI | null = null;

  /**
   * Initialize OpenAI client with API key
   */
  initializeOpenAI(apiKey: string) {
    this.openai = new OpenAI({ 
      apiKey,
      dangerouslyAllowBrowser: true 
    });
  }

  /**
   * Main summarization pipeline
   */
  async processPair(input: SummarizationInput): Promise<SummarizationResult> {
    try {
      // 1. Validate input
      if (!input.user_message || !input.assistant_message) {
        return { 
          success: false, 
          error: 'Invalid message pair' 
        };
      }

      // 2. Get or create current summary
      const currentSummary = input.current_summary || 
        await summaryDb.getOrCreateSummary(input.thread_id);

      // 3. Check if already processed
      if (await summaryDb.isMessageProcessed(input.thread_id, input.assistant_msg_id)) {
        return { 
          success: true, 
          summary: currentSummary 
        };
      }

      // 4. Get summarization prompt
      const promptConfig = await summaryDb.getActivePrompt();
      if (!promptConfig) {
        return { 
          success: false, 
          error: 'No active summarization prompt' 
        };
      }

      // 5. Generate candidate summary
      const candidate = await this.generateCandidate(
        input.user_message,
        input.assistant_message,
        promptConfig
      );

      if (!candidate) {
        return { 
          success: false, 
          error: 'Failed to generate summary candidate' 
        };
      }

      // 6. Merge candidate with current summary
      const updatedSummary = this.mergeSummaries(
        currentSummary,
        candidate,
        input.assistant_msg_id
      );

      // 7. Generate core text
      updatedSummary.core_text = this.generateCoreText(updatedSummary);

      // 8. Save to database
      const savedSummary = await summaryDb.updateSummary(
        input.thread_id,
        updatedSummary
      );

      // 9. Log event
      await summaryDb.logEvent(
        input.thread_id,
        'updated',
        { 
          added: this.getChanges(currentSummary, updatedSummary).added 
        },
        [input.user_msg_id, input.assistant_msg_id]
      );

      return {
        success: true,
        summary: savedSummary,
        changes: this.getChanges(currentSummary, updatedSummary)
      };

    } catch (error) {
      console.error('Summarization error:', error);
      
      await summaryDb.logEvent(
        input.thread_id,
        'error',
        { error: error.message }
      );

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate summary candidate using LLM
   */
  private async generateCandidate(
    userMessage: string,
    assistantMessage: string,
    promptConfig: any
  ): Promise<SummarizationCandidate | null> {
    if (!this.openai) {
      console.error('OpenAI client not initialized');
      return null;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: promptConfig.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: promptConfig.prompt
          },
          {
            role: 'user',
            content: `User: ${userMessage}\n\nAssistant: ${assistantMessage}`
          }
        ],
        temperature: promptConfig.temperature || 0.7,
        max_tokens: promptConfig.max_tokens || 1000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      return JSON.parse(content) as SummarizationCandidate;
    } catch (error) {
      console.error('Failed to generate candidate:', error);
      return null;
    }
  }

  /**
   * Merge candidate with existing summary
   */
  private mergeSummaries(
    current: Summary,
    candidate: SummarizationCandidate,
    msgId: string
  ): Partial<Summary> {
    const merged: Partial<Summary> = {
      ...current
    };

    // Merge facts (upsert by key)
    if (candidate.facts) {
      merged.facts = { ...current.facts };
      for (const [key, value] of Object.entries(candidate.facts)) {
        if (!merged.facts[key]) {
          merged.facts[key] = { 
            value, 
            source_msg_ids: [msgId] 
          };
        } else {
          merged.facts[key].value = value;
          merged.facts[key].source_msg_ids.push(msgId);
        }
      }
    }

    // Merge decisions (deduplicate)
    if (candidate.decisions) {
      const existingDecisions = new Set(
        current.decisions.map(d => d.text.toLowerCase())
      );
      
      merged.decisions = [...current.decisions];
      for (const decision of candidate.decisions) {
        if (!existingDecisions.has(decision.toLowerCase())) {
          merged.decisions.push({
            text: decision,
            msg_id: msgId,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Merge todos (deduplicate)
    if (candidate.todos) {
      const existingTodos = new Set(
        current.todos.map(t => t.text.toLowerCase())
      );
      
      merged.todos = [...current.todos];
      for (const todo of candidate.todos) {
        if (!existingTodos.has(todo.toLowerCase())) {
          merged.todos.push({
            text: todo,
            msg_id: msgId
          });
        }
      }
    }

    // Merge goals (unique set)
    if (candidate.goals) {
      merged.goals = Array.from(
        new Set([...current.goals, ...candidate.goals])
      );
    }

    // Merge constraints (unique set)
    if (candidate.constraints) {
      merged.constraints = Array.from(
        new Set([...current.constraints, ...candidate.constraints])
      );
    }

    // Merge glossary (upsert)
    if (candidate.glossary) {
      merged.glossary = {
        ...current.glossary,
        ...candidate.glossary
      };
    }

    // Add delta
    merged.deltas = [...(current.deltas || [])];
    merged.deltas.push({
      action: 'updated',
      details: `Processed message pair ending with ${msgId}`,
      timestamp: new Date().toISOString()
    });

    // Keep only last 20 deltas
    if (merged.deltas.length > 20) {
      merged.deltas = merged.deltas.slice(-20);
    }

    // Update last processed message
    merged.last_msg_id = msgId;

    return merged;
  }

  /**
   * Generate core text from structured data
   */
  private generateCoreText(summary: Partial<Summary>): string {
    const parts: string[] = [];

    // Goals
    if (summary.goals && summary.goals.length > 0) {
      parts.push(`Goals: ${summary.goals.slice(0, 3).join(', ')}`);
    }

    // Key facts
    if (summary.facts && Object.keys(summary.facts).length > 0) {
      const factsList = Object.entries(summary.facts)
        .slice(0, 5)
        .map(([k, v]) => `${k}: ${v.value}`)
        .join('; ');
      parts.push(`Facts: ${factsList}`);
    }

    // Recent decisions
    if (summary.decisions && summary.decisions.length > 0) {
      const recentDecisions = summary.decisions
        .slice(-3)
        .map(d => d.text)
        .join('; ');
      parts.push(`Decisions: ${recentDecisions}`);
    }

    // Active todos
    if (summary.todos && summary.todos.length > 0) {
      parts.push(`TODOs: ${summary.todos.length} items`);
    }

    // Constraints
    if (summary.constraints && summary.constraints.length > 0) {
      parts.push(`Constraints: ${summary.constraints.slice(0, 2).join(', ')}`);
    }

    // Limit to 1500 characters
    const coreText = parts.join(' | ');
    return coreText.length > 1500 ? coreText.substring(0, 1497) + '...' : coreText;
  }

  /**
   * Calculate changes between summaries
   */
  private getChanges(
    oldSummary: Summary, 
    newSummary: Partial<Summary>
  ): SummarizationResult['changes'] {
    const changes = {
      added: {} as Record<string, any>,
      updated: {} as Record<string, any>,
      removed: [] as string[]
    };

    // Check facts
    const oldFactKeys = Object.keys(oldSummary.facts || {});
    const newFactKeys = Object.keys(newSummary.facts || {});
    
    for (const key of newFactKeys) {
      if (!oldFactKeys.includes(key)) {
        changes.added[`fact.${key}`] = newSummary.facts[key];
      }
    }

    // Check new decisions
    const newDecisionCount = (newSummary.decisions?.length || 0) - 
                            (oldSummary.decisions?.length || 0);
    if (newDecisionCount > 0) {
      changes.added.decisions = newDecisionCount;
    }

    // Check new todos
    const newTodoCount = (newSummary.todos?.length || 0) - 
                        (oldSummary.todos?.length || 0);
    if (newTodoCount > 0) {
      changes.added.todos = newTodoCount;
    }

    return changes;
  }
}

export const summarizationService = new SummarizationService();
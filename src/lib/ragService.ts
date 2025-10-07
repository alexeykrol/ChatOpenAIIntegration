import { supabase } from './supabase';
import { OpenAIService } from './openai';
import { processFile, findSimilarChunks } from './fileProcessing';

export interface PersonalityEmbedding {
  id: string;
  personality_id: string;
  chunk_text: string;
  chunk_index: number;
  embedding: number[];
  created_at: string;
}

export interface RAGContext {
  relevantChunks: string[];
  instruction: string;
  similarity: number[];
}

export class RAGService {
  private openaiService: OpenAIService;

  constructor(apiKey?: string) {
    this.openaiService = new OpenAIService(apiKey);
  }

  setApiKey(apiKey: string) {
    this.openaiService.setApiKey(apiKey);
  }

  /**
   * Process file and store embeddings for a personality
   */
  async processPersonalityFile(
    personalityId: string,
    file: File,
    chunkSize: number = 800,
    embeddingModel: string = 'text-embedding-3-small'
  ): Promise<void> {
    try {
      // Process the file
      const processed = await processFile(file, chunkSize);
      
      // Delete existing embeddings for this personality
      await this.deletePersonalityEmbeddings(personalityId);

      // Create embeddings for all chunks
      const chunkTexts = processed.chunks.map(chunk => chunk.text);
      const embeddings = await this.openaiService.createEmbeddings(chunkTexts, embeddingModel);

      // Store embeddings in database
      const embeddingData = processed.chunks.map((chunk, index) => ({
        personality_id: personalityId,
        chunk_text: chunk.text,
        chunk_index: chunk.index,
        embedding: JSON.stringify(embeddings[index].embedding)
      }));

      const { error } = await supabase
        .from('personality_embeddings')
        .insert(embeddingData);

      if (error) {
        throw new Error(`Failed to store embeddings: ${error.message}`);
      }

    } catch (error) {
      throw new Error(`Failed to process personality file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all embeddings for a personality
   */
  async deletePersonalityEmbeddings(personalityId: string): Promise<void> {
    const { error } = await supabase
      .from('personality_embeddings')
      .delete()
      .eq('personality_id', personalityId);

    if (error) {
      throw new Error(`Failed to delete embeddings: ${error.message}`);
    }
  }

  /**
   * Get relevant context for a user query
   */
  async getRelevantContext(
    personalityId: string,
    query: string,
    topK: number = 3,
    embeddingModel: string = 'text-embedding-3-small'
  ): Promise<RAGContext | null> {
    try {
      // Get personality data to check if it has files
      const { data: personality, error: personalityError } = await supabase
        .from('personalities')
        .select('file_name, file_instruction, top_chunks')
        .eq('id', personalityId)
        .single();

      if (personalityError || !personality?.file_name) {
        return null; // No file associated with this personality
      }

      // Create embedding for the query
      const queryEmbedding = await this.openaiService.createEmbedding(query, embeddingModel);

      // Get stored embeddings for this personality
      const { data: embeddings, error: embeddingsError } = await supabase
        .from('personality_embeddings')
        .select('chunk_text, embedding')
        .eq('personality_id', personalityId);

      if (embeddingsError || !embeddings || embeddings.length === 0) {
        return null;
      }

      // Find most similar chunks
      const chunks = embeddings.map(emb => ({
        text: emb.chunk_text,
        embedding: typeof emb.embedding === 'string' 
          ? JSON.parse(emb.embedding) 
          : emb.embedding as number[]
      }));

      const actualTopK = Math.min(topK, personality.top_chunks || 3);
      const similarChunks = findSimilarChunks(
        queryEmbedding.embedding,
        chunks,
        actualTopK
      );

      return {
        relevantChunks: similarChunks.map(chunk => chunk.text),
        instruction: personality.file_instruction || '',
        similarity: similarChunks.map(chunk => chunk.similarity)
      };

    } catch (error) {
      console.error('Error getting relevant context:', error);
      return null;
    }
  }

  /**
   * Build enhanced system prompt with RAG context
   */
  buildEnhancedPrompt(
    originalPrompt: string,
    ragContext: RAGContext
  ): string {
    const contextSection = ragContext.relevantChunks
      .map((chunk, index) => `[Context ${index + 1}]\n${chunk}`)
      .join('\n\n');

    return `${originalPrompt}

${ragContext.instruction}

Relevant context from knowledge base:
${contextSection}

Please use the above context to provide more accurate and informed responses. If the context is relevant to the user's question, reference it in your answer.`;
  }

  /**
   * Get embedding statistics for a personality
   */
  async getEmbeddingStats(personalityId: string): Promise<{
    chunkCount: number;
    totalSize: number;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('personality_embeddings')
        .select('chunk_text')
        .eq('personality_id', personalityId);

      if (error || !data) {
        return null;
      }

      const totalSize = data.reduce((sum, emb) => sum + emb.chunk_text.length, 0);

      return {
        chunkCount: data.length,
        totalSize
      };
    } catch {
      return null;
    }
  }

  /**
   * Validate if personality has file and embeddings
   */
  async validatePersonalityFile(personalityId: string): Promise<{
    hasFile: boolean;
    hasEmbeddings: boolean;
    fileName?: string;
  }> {
    try {
      // Check personality file info
      const { data: personality } = await supabase
        .from('personalities')
        .select('file_name')
        .eq('id', personalityId)
        .single();

      // Check embeddings existence
      const { data: embeddings } = await supabase
        .from('personality_embeddings')
        .select('id')
        .eq('personality_id', personalityId)
        .limit(1);

      return {
        hasFile: !!personality?.file_name,
        hasEmbeddings: !!(embeddings && embeddings.length > 0),
        fileName: personality?.file_name || undefined
      };
    } catch {
      return {
        hasFile: false,
        hasEmbeddings: false
      };
    }
  }
}
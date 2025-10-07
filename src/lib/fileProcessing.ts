// File processing utilities for RAG implementation

export interface TextChunk {
  text: string;
  index: number;
}

export interface ProcessedFile {
  content: string;
  chunks: TextChunk[];
  wordCount: number;
}

/**
 * Estimates token count for a text string
 * Rough approximation: 1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Splits text into chunks based on token limit
 */
export function chunkText(text: string, maxTokens: number = 800): TextChunk[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const potentialChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    
    if (estimateTokens(potentialChunk) > maxTokens && currentChunk) {
      // Save current chunk and start new one
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex++
      });
      currentChunk = sentence;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex
    });
  }

  return chunks;
}

/**
 * Extracts text content from various file types
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  try {
    // Handle text and markdown files
    if (fileType === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      return await file.text();
    }
    
    // Handle PDF files
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        const pdfjs = await import('pdfjs-dist');
        
        // Disable worker to avoid CDN/loading issues
        pdfjs.GlobalWorkerOptions.workerSrc = '';
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(arrayBuffer).promise;
        
        let fullText = '';
        
        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }
        
        return fullText.trim();
      } catch (pdfError) {
        // If PDF processing fails, suggest alternative
        throw new Error('PDF processing failed. Please convert to TXT format or try again.');
      }
    }
    
    // Handle DOCX files
    if (fileType.includes('word') || fileName.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }

    // Try to read as text for any other file type
    return await file.text();
    
  } catch (error) {
    throw new Error(`Failed to extract text from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Magic bytes for file type verification
 * Used to detect actual file type regardless of extension
 */
const MAGIC_BYTES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  docx: [0x50, 0x4B, 0x03, 0x04], // PK.. (ZIP format)
  zip: [0x50, 0x4B, 0x03, 0x04], // PK.. (DOCX is a ZIP)
} as const;

/**
 * Validates file before processing with enhanced security
 * Includes magic byte verification to prevent file type spoofing
 */
export async function validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const allowedExtensions = ['.txt', '.md', '.pdf', '.docx'];

  // 1. Sanitize filename - prevent path traversal
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (file.name !== safeName) {
    return {
      valid: false,
      error: 'Invalid filename. Only alphanumeric characters, dots, dashes, and underscores allowed.',
    };
  }

  // 2. Check for path traversal attempts
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid filename. Path traversal detected.',
    };
  }

  // 3. Check file size
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 5MB limit' };
  }

  // 4. Check extension
  const extension = file.name.toLowerCase().split('.').pop();
  if (!extension || !allowedExtensions.some((ext) => ext.substring(1) === extension)) {
    return {
      valid: false,
      error: 'Invalid file type. Supported formats: TXT, MD, PDF, DOCX',
    };
  }

  // 5. Verify MIME type (can be spoofed but adds a layer)
  const hasValidType = allowedTypes.includes(file.type.toLowerCase());

  // 6. Magic byte verification for binary files
  if (extension === 'pdf' || extension === 'docx') {
    try {
      const buffer = await file.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(buffer);

      if (extension === 'pdf') {
        const expected = MAGIC_BYTES.pdf;
        const matches = bytes.every((byte, i) => byte === expected[i]);

        if (!matches) {
          return {
            valid: false,
            error: 'File content does not match PDF format. File may be corrupted or mislabeled.',
          };
        }
      }

      if (extension === 'docx') {
        const expected = MAGIC_BYTES.docx;
        const matches = bytes.every((byte, i) => byte === expected[i]);

        if (!matches) {
          return {
            valid: false,
            error: 'File content does not match DOCX format. File may be corrupted or mislabeled.',
          };
        }
      }
    } catch (error) {
      return {
        valid: false,
        error: 'Failed to verify file integrity',
      };
    }
  }

  // 7. Basic content scanning for text files
  if (extension === 'txt' || extension === 'md') {
    try {
      const preview = await file.slice(0, 1024).text();

      // Check for suspicious patterns (scripts, executables)
      const dangerousPatterns = [
        /<script[^>]*>/i,
        /javascript:/i,
        /onerror\s*=/i,
        /onclick\s*=/i,
        /on\w+\s*=/i, // Any event handler
        /MZ/, // DOS/Windows executable header
        /\x7fELF/, // Linux executable header
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(preview)) {
          return {
            valid: false,
            error: 'File contains suspicious content and was rejected for security reasons.',
          };
        }
      }
    } catch (error) {
      // If we can't read the file, reject it
      return {
        valid: false,
        error: 'Unable to verify file content',
      };
    }
  }

  // 8. Final checks passed
  if (!hasValidType && extension !== 'md') {
    // Markdown files might not have correct MIME type
    return {
      valid: false,
      error: 'Invalid MIME type. File may be mislabeled.',
    };
  }

  return { valid: true };
}

/**
 * Processes file completely - extracts text, validates, and creates chunks
 */
export async function processFile(file: File, chunkSize: number = 800): Promise<ProcessedFile> {
  // Validate file (now async)
  const validation = await validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    // Extract text content
    const content = await extractTextFromFile(file);
    
    if (!content.trim()) {
      throw new Error('File appears to be empty or contains no readable text');
    }

    // Create chunks
    const chunks = chunkText(content, chunkSize);
    
    if (chunks.length === 0) {
      throw new Error('Failed to create text chunks from file content');
    }

    // Count words
    const wordCount = content.split(/\s+/).length;

    return {
      content,
      chunks,
      wordCount
    };

  } catch (error) {
    throw new Error(`File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Find most similar chunks based on query embedding
 */
export function findSimilarChunks(
  queryEmbedding: number[],
  chunks: { text: string; embedding: number[] }[],
  topK: number = 3
): { text: string; similarity: number }[] {
  const similarities = chunks.map(chunk => ({
    text: chunk.text,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
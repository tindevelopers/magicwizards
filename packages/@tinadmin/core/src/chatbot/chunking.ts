/**
 * TEXT CHUNKING STRATEGIES
 * 
 * Utilities for splitting documents into chunks for embedding.
 */

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ' ', ''];

/**
 * Recursively split text into chunks with overlap
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    separators = DEFAULT_SEPARATORS,
  } = options;

  // If text is smaller than chunk size, return as single chunk
  if (text.length <= chunkSize) {
    return [text];
  }

  // Try to split by separators in order
  for (const separator of separators) {
    const chunks = splitBySeparator(text, separator, chunkSize, chunkOverlap);
    if (chunks.length > 1) {
      return chunks;
    }
  }

  // Fallback: split by character if no separator works
  return splitByCharacter(text, chunkSize, chunkOverlap);
}

/**
 * Split text by a specific separator
 */
function splitBySeparator(
  text: string,
  separator: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const parts = text.split(separator);
  const chunks: string[] = [];
  let currentChunk = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const testChunk = currentChunk
      ? currentChunk + separator + part
      : part;

    if (testChunk.length <= chunkSize) {
      currentChunk = testChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        // Add overlap from previous chunk
        const overlapText = getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText + separator + part;
      } else {
        // Part is too large, split it recursively
        const subChunks = chunkText(part, { chunkSize, chunkOverlap });
        chunks.push(...subChunks.slice(0, -1));
        currentChunk = subChunks[subChunks.length - 1] || part;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.filter(chunk => chunk.trim().length > 0);
}

/**
 * Split text by character (fallback)
 */
function splitByCharacter(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - chunkOverlap;
  }

  return chunks.filter(chunk => chunk.trim().length > 0);
}

/**
 * Get overlap text from the end of a chunk
 */
function getOverlapText(text: string, overlapSize: number): string {
  if (text.length <= overlapSize) {
    return text;
  }
  return text.slice(-overlapSize);
}

/**
 * Chunk markdown documents preserving structure
 */
export function chunkMarkdown(text: string, options: ChunkOptions = {}): string[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
  } = options;

  // Split by markdown headers first
  const headerRegex = /^(#{1,6}\s+.+)$/gm;
  const sections: { header: string; content: string }[] = [];
  let currentHeader = '';
  let currentContent = '';

  const lines = text.split('\n');
  for (const line of lines) {
    if (headerRegex.test(line)) {
      if (currentContent) {
        sections.push({ header: currentHeader, content: currentContent.trim() });
      }
      currentHeader = line;
      currentContent = '';
    } else {
      currentContent += line + '\n';
    }
  }
  if (currentContent) {
    sections.push({ header: currentHeader, content: currentContent.trim() });
  }

  // Chunk each section
  const chunks: string[] = [];
  for (const section of sections) {
    const sectionText = section.header ? `${section.header}\n\n${section.content}` : section.content;
    if (sectionText.length <= chunkSize) {
      chunks.push(sectionText);
    } else {
      const subChunks = chunkText(sectionText, { chunkSize, chunkOverlap });
      chunks.push(...subChunks);
    }
  }

  return chunks.filter(chunk => chunk.trim().length > 0);
}


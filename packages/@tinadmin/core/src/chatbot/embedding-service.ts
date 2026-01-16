/**
 * EMBEDDING SERVICE
 * 
 * Generates text embeddings using OpenAI's embedding API.
 */

import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiInstance = new OpenAI({
      apiKey,
    });
  }
  return openaiInstance;
}

export interface EmbeddingOptions {
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  dimensions?: number;
}

const DEFAULT_MODEL: EmbeddingOptions['model'] = 'text-embedding-3-small';
const DEFAULT_DIMENSIONS = 1536;

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<number[]> {
  const {
    model = DEFAULT_MODEL,
    dimensions = DEFAULT_DIMENSIONS,
  } = options;

  try {
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
      model: model as any,
      input: text,
      dimensions: model === 'text-embedding-3-small' || model === 'text-embedding-3-large' 
        ? dimensions 
        : undefined,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<number[][]> {
  const {
    model = DEFAULT_MODEL,
    dimensions = DEFAULT_DIMENSIONS,
  } = options;

  try {
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
      model: model as any,
      input: texts,
      dimensions: model === 'text-embedding-3-small' || model === 'text-embedding-3-large' 
        ? dimensions 
        : undefined,
    });

    return response.data.map((item: any) => item.embedding);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
}

/**
 * Get embedding model dimensions
 */
export function getEmbeddingDimensions(model?: EmbeddingOptions['model']): number {
  switch (model || DEFAULT_MODEL) {
    case 'text-embedding-3-small':
      return 1536;
    case 'text-embedding-3-large':
      return 3072;
    case 'text-embedding-ada-002':
      return 1536;
    default:
      return DEFAULT_DIMENSIONS;
  }
}


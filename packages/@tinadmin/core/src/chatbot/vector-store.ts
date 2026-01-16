/**
 * VECTOR STORE
 * 
 * Operations for storing and querying vector embeddings using Supabase pgvector.
 */

import { createTenantAwareServerClient } from '../database/tenant-client';
import type { Embedding, DocumentChunk, RetrievalResult } from './types';

export interface VectorStoreOptions {
  tenantId: string;
  limit?: number;
  threshold?: number;
}

const DEFAULT_LIMIT = 5;
const DEFAULT_THRESHOLD = 0.7;

/**
 * Store embeddings in the database
 */
export async function storeEmbeddings(
  embeddings: Array<{
    chunkId: string;
    documentId: string;
    knowledgeBaseId: string;
    tenantId: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }>
): Promise<void> {
  if (embeddings.length === 0) return;
  
  const tenantId = embeddings[0].tenantId;
  const tenantClient = await createTenantAwareServerClient(tenantId);
  const supabase = tenantClient.getClient();

  const records = embeddings.map(emb => ({
    chunk_id: emb.chunkId,
    document_id: emb.documentId,
    knowledge_base_id: emb.knowledgeBaseId,
    tenant_id: emb.tenantId,
    embedding: JSON.stringify(emb.embedding),
    metadata: emb.metadata || {},
  }));

  const { error } = await (supabase
    .from('chatbot_embeddings') as any)
    .insert(records);

  if (error) {
    console.error('Error storing embeddings:', error);
    throw new Error('Failed to store embeddings');
  }
}

/**
 * Search for similar embeddings using cosine similarity
 */
export async function searchSimilar(
  queryEmbedding: number[],
  options: VectorStoreOptions
): Promise<RetrievalResult> {
  const {
    tenantId,
    limit = DEFAULT_LIMIT,
    threshold = DEFAULT_THRESHOLD,
  } = options;

  const tenantClient = await createTenantAwareServerClient(tenantId);
  const supabase = tenantClient.getClient();

  // Use pgvector cosine similarity search
  const { data, error } = await (supabase.rpc as any)('match_embeddings', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: threshold,
    match_count: limit,
    tenant_id: tenantId,
  });

  if (error) {
    console.error('Error searching embeddings:', error);
    throw new Error('Failed to search embeddings');
  }

  // Extract chunks and documents from results
  const chunkIds = data?.map((item: any) => item.chunk_id) || [];
  const scores = data?.map((item: any) => item.similarity) || [];

  if (chunkIds.length === 0) {
    return {
      chunks: [],
      documents: [],
      scores: [],
    };
  }

  // Fetch chunks
  const { data: chunks, error: chunksError } = await (supabase
    .from('chatbot_document_chunks') as any)
    .select('*')
    .in('id', chunkIds)
    .eq('tenant_id', tenantId);

  if (chunksError) {
    console.error('Error fetching chunks:', chunksError);
    throw new Error('Failed to fetch chunks');
  }

  // Fetch documents
  const documentIds = [...new Set(chunks?.map((c: any) => c.document_id) || [])];
  
  const { data: documents, error: docsError } = await (supabase
    .from('chatbot_documents') as any)
    .select('*')
    .in('id', documentIds)
    .eq('tenant_id', tenantId);

  if (docsError) {
    console.error('Error fetching documents:', docsError);
    throw new Error('Failed to fetch documents');
  }

  // Map results
  const chunkMap = new Map((chunks as any[])?.map((c: any) => [c.id, c]) || []);
  const docMap = new Map((documents as any[])?.map((d: any) => [d.id, d]) || []);

  const resultChunks: DocumentChunk[] = chunkIds
    .map((chunkId: string, index: number) => {
      const chunk = chunkMap.get(chunkId);
      if (!chunk) return null;
      return {
        id: chunk.id,
        documentId: chunk.document_id,
        content: chunk.content,
        chunkIndex: chunk.chunk_index,
        metadata: chunk.metadata,
      };
    })
    .filter((c: DocumentChunk | null): c is DocumentChunk => c !== null);

  const resultDocuments = (documentIds as string[])
    .map((docId: string) => docMap.get(docId))
    .filter((d): d is any => d !== undefined)
    .map((d: any) => ({
      id: d.id,
      knowledgeBaseId: d.knowledge_base_id,
      tenantId: d.tenant_id,
      title: d.title,
      content: d.content,
      source: d.source,
      sourceType: d.source_type,
      metadata: d.metadata,
      createdAt: new Date(d.created_at),
      updatedAt: new Date(d.updated_at),
    }));

  return {
    chunks: resultChunks,
    documents: resultDocuments,
    scores,
  };
}

/**
 * Delete embeddings for a document
 */
export async function deleteDocumentEmbeddings(
  documentId: string,
  tenantId: string
): Promise<void> {
  const tenantClient = await createTenantAwareServerClient(tenantId);
  const supabase = tenantClient.getClient();

  const { error } = await (supabase
    .from('chatbot_embeddings') as any)
    .delete()
    .eq('document_id', documentId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting embeddings:', error);
    throw new Error('Failed to delete embeddings');
  }
}

/**
 * Delete embeddings for a knowledge base
 */
export async function deleteKnowledgeBaseEmbeddings(
  knowledgeBaseId: string,
  tenantId: string
): Promise<void> {
  const tenantClient = await createTenantAwareServerClient(tenantId);
  const supabase = tenantClient.getClient();

  const { error } = await (supabase
    .from('chatbot_embeddings') as any)
    .delete()
    .eq('knowledge_base_id', knowledgeBaseId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting embeddings:', error);
    throw new Error('Failed to delete embeddings');
  }
}


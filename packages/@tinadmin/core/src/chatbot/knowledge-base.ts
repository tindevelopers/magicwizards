/**
 * KNOWLEDGE BASE MANAGER
 * 
 * Manages knowledge bases, documents, and document ingestion.
 */

import { createTenantAwareServerClient } from '../database/tenant-client';
import { chunkText, chunkMarkdown } from './chunking';
import { generateEmbeddings } from './embedding-service';
import { storeEmbeddings, deleteDocumentEmbeddings } from './vector-store';
import type { KnowledgeBase, Document, DocumentChunk } from './types';

export interface CreateKnowledgeBaseInput {
  tenantId: string;
  name: string;
  description?: string;
  type: 'platform' | 'tenant' | 'domain';
  domain?: 'auth' | 'multi-tenancy' | 'billing' | 'permissions' | 'database' | 'shared';
}

export interface CreateDocumentInput {
  knowledgeBaseId: string;
  tenantId: string;
  title: string;
  content: string;
  source: string;
  sourceType: 'file' | 'url' | 'manual' | 'code';
  metadata?: Record<string, unknown>;
}

/**
 * Create a new knowledge base
 */
export async function createKnowledgeBase(
  input: CreateKnowledgeBaseInput
): Promise<KnowledgeBase> {
  const tenantClient = await createTenantAwareServerClient(input.tenantId);
  const supabase = tenantClient.getClient();

  const { data, error } = await (supabase
    .from('chatbot_knowledge_bases') as any)
    .insert({
      tenant_id: input.tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      domain: input.domain,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating knowledge base:', error);
    throw new Error('Failed to create knowledge base');
  }

  return {
    id: data.id,
    tenantId: data.tenant_id,
    name: data.name,
    description: data.description,
    type: data.type,
    domain: data.domain,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Get knowledge base by ID
 */
export async function getKnowledgeBase(
  knowledgeBaseId: string,
  tenantId: string
): Promise<KnowledgeBase | null> {
  const tenantClient = await createTenantAwareServerClient(tenantId);
  const supabase = tenantClient.getClient();

  const { data, error } = await (supabase
    .from('chatbot_knowledge_bases') as any)
    .select('*')
    .eq('id', knowledgeBaseId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching knowledge base:', error);
    throw new Error('Failed to fetch knowledge base');
  }

  return {
    id: data.id,
    tenantId: data.tenant_id,
    name: data.name,
    description: data.description,
    type: data.type,
    domain: data.domain,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * List knowledge bases for a tenant
 */
export async function listKnowledgeBases(
  tenantId: string,
  options?: { type?: 'platform' | 'tenant' | 'domain'; domain?: string }
): Promise<KnowledgeBase[]> {
  const tenantClient = await createTenantAwareServerClient(tenantId);
  const supabase = tenantClient.getClient();

  let query = supabase
    .from('chatbot_knowledge_bases')
    .select('*')
    .eq('tenant_id', tenantId);

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  if (options?.domain) {
    query = query.eq('domain', options.domain);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing knowledge bases:', error);
    throw new Error('Failed to list knowledge bases');
  }

  return (data || []).map((kb: any) => ({
    id: kb.id,
    tenantId: kb.tenant_id,
    name: kb.name,
    description: kb.description,
    type: kb.type,
    domain: kb.domain,
    createdAt: new Date(kb.created_at),
    updatedAt: new Date(kb.updated_at),
  }));
}

/**
 * Create a document and index it
 */
export async function createDocument(
  input: CreateDocumentInput
): Promise<Document> {
  const tenantClient = await createTenantAwareServerClient(input.tenantId);
  const supabase = tenantClient.getClient();

  // Create document
  const { data: docData, error: docError } = await (supabase
    .from('chatbot_documents') as any)
    .insert({
      knowledge_base_id: input.knowledgeBaseId,
      tenant_id: input.tenantId,
      title: input.title,
      content: input.content,
      source: input.source,
      source_type: input.sourceType,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (docError) {
    console.error('Error creating document:', docError);
    throw new Error('Failed to create document');
  }

  const document: Document = {
    id: (docData as any).id,
    knowledgeBaseId: (docData as any).knowledge_base_id,
    tenantId: (docData as any).tenant_id,
    title: (docData as any).title,
    content: (docData as any).content,
    source: (docData as any).source,
    sourceType: (docData as any).source_type,
    metadata: (docData as any).metadata,
    createdAt: new Date((docData as any).created_at),
    updatedAt: new Date((docData as any).updated_at),
  };

  // Index the document
  await indexDocument(document);

  return document;
}

/**
 * Index a document (chunk and create embeddings)
 */
export async function indexDocument(document: Document): Promise<void> {
  // Chunk the document
  const chunks = document.sourceType === 'code' || document.source.includes('.md')
    ? chunkMarkdown(document.content)
    : chunkText(document.content);

  // Create chunks in database
  const tenantClient = await createTenantAwareServerClient(document.tenantId);
  const supabase = tenantClient.getClient();

  const chunkRecords = chunks.map((content, index) => ({
    document_id: document.id,
    tenant_id: document.tenantId,
    content,
    chunk_index: index,
    metadata: {
      title: document.title,
      source: document.source,
    },
  }));

  const { data: insertedChunks, error: chunksError } = await (supabase
    .from('chatbot_document_chunks') as any)
    .insert(chunkRecords)
    .select();

  if (chunksError) {
    console.error('Error creating chunks:', chunksError);
    throw new Error('Failed to create document chunks');
  }

  // Generate embeddings
  const embeddings = await generateEmbeddings(chunks);

  // Store embeddings
  const embeddingRecords = insertedChunks.map((chunk: any, index: number) => ({
    chunkId: chunk.id,
    documentId: document.id,
    knowledgeBaseId: document.knowledgeBaseId,
    tenantId: document.tenantId,
    embedding: embeddings[index],
    metadata: {
      chunkIndex: index,
      title: document.title,
    },
  }));

  await storeEmbeddings(embeddingRecords);
}

/**
 * Delete a document and its embeddings
 */
export async function deleteDocument(
  documentId: string,
  tenantId: string
): Promise<void> {
  const tenantClient = await createTenantAwareServerClient(tenantId);
  const supabase = tenantClient.getClient();

  // Delete embeddings first
  await deleteDocumentEmbeddings(documentId, tenantId);

  // Delete chunks
  await (supabase
    .from('chatbot_document_chunks') as any)
    .delete()
    .eq('document_id', documentId)
    .eq('tenant_id', tenantId);

  // Delete document
  const { error } = await (supabase
    .from('chatbot_documents') as any)
    .delete()
    .eq('id', documentId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting document:', error);
    throw new Error('Failed to delete document');
  }
}

/**
 * Update a document and re-index
 */
export async function updateDocument(
  documentId: string,
  tenantId: string,
  updates: Partial<Pick<Document, 'title' | 'content' | 'metadata'>>
): Promise<Document> {
  const tenantClient = await createTenantAwareServerClient(tenantId);
  const supabase = tenantClient.getClient();

  // Update document
  const { data, error } = await (supabase
    .from('chatbot_documents') as any)
    .update({
      ...(updates.title && { title: updates.title }),
      ...(updates.content && { content: updates.content }),
      ...(updates.metadata && { metadata: updates.metadata }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating document:', error);
    throw new Error('Failed to update document');
  }

  const document: Document = {
    id: data.id,
    knowledgeBaseId: data.knowledge_base_id,
    tenantId: data.tenant_id,
    title: data.title,
    content: data.content,
    source: data.source,
    sourceType: data.source_type,
    metadata: data.metadata,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };

  // Re-index if content changed
  if (updates.content) {
    await deleteDocumentEmbeddings(documentId, tenantId);
    await indexDocument(document);
  }

  return document;
}


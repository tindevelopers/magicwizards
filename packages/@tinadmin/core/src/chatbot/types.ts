/**
 * CHATBOT DOMAIN TYPES
 * 
 * TypeScript types for the chatbot domain.
 */

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ChatConversation {
  id: string;
  tenantId: string;
  userId?: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeBase {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'platform' | 'tenant' | 'domain';
  domain?: 'auth' | 'multi-tenancy' | 'billing' | 'permissions' | 'database' | 'shared';
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  knowledgeBaseId: string;
  tenantId: string;
  title: string;
  content: string;
  source: string;
  sourceType: 'file' | 'url' | 'manual' | 'code';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  metadata?: Record<string, unknown>;
}

export interface Embedding {
  id: string;
  chunkId: string;
  documentId: string;
  knowledgeBaseId: string;
  tenantId: string;
  embedding: number[];
  createdAt: Date;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  tenantId: string;
  userId?: string;
  context?: Record<string, unknown>;
}

export interface ChatResponse {
  message: string;
  conversationId: string;
  messageId: string;
  citations?: Citation[];
  metadata?: Record<string, unknown>;
}

export interface Citation {
  documentId: string;
  title: string;
  content: string;
  source: string;
  relevanceScore?: number;
}

export interface DomainContext {
  domain: 'auth' | 'multi-tenancy' | 'billing' | 'permissions' | 'database' | 'shared' | 'general';
  confidence: number;
  relevantDocuments?: string[];
}

export interface RetrievalResult {
  chunks: DocumentChunk[];
  documents: Document[];
  scores: number[];
}


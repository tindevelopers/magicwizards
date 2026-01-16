/**
 * CHATBOT DOMAIN
 * 
 * Multi-tenant RAG chatbot system with domain intelligence.
 * 
 * PUBLIC API - Only import from this file!
 */

// ============================================================================
// TYPES
// ============================================================================
export type {
  ChatMessage,
  ChatConversation,
  ChatRequest,
  ChatResponse,
  KnowledgeBase,
  Document,
  Citation,
  DomainContext,
} from './types';

// ============================================================================
// CHAT SERVICE
// ============================================================================
export {
  processChatMessage,
  getConversation,
  listConversations,
} from './chat-service';

// ============================================================================
// KNOWLEDGE BASE
// ============================================================================
export {
  createKnowledgeBase,
  getKnowledgeBase,
  listKnowledgeBases,
  createDocument,
  deleteDocument,
  updateDocument,
} from './knowledge-base';

// ============================================================================
// RAG ENGINE
// ============================================================================
export {
  retrieveContext,
  buildContextString,
  formatCitations,
} from './rag-engine';

// ============================================================================
// DOMAIN INTELLIGENCE
// ============================================================================
export {
  detectDomain,
  getDomainKnowledgeBases,
  enhanceQueryWithDomain,
  getDomainPrompt,
} from './domain-intelligence';

// ============================================================================
// UTILITIES
// ============================================================================
export {
  chunkText,
  chunkMarkdown,
} from './chunking';

export {
  generateEmbedding,
  generateEmbeddings,
  getEmbeddingDimensions,
} from './embedding-service';


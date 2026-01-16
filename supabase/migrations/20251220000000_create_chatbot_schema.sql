-- Migration: Create Chatbot Schema
-- This migration creates tables for the multi-tenant RAG chatbot system

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_tenant_id ON chatbot_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_updated_at ON chatbot_conversations(updated_at DESC);

-- ============================================================================
-- MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation_id ON chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_tenant_id ON chatbot_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_created_at ON chatbot_messages(created_at);

-- ============================================================================
-- KNOWLEDGE BASES
-- ============================================================================

CREATE TABLE IF NOT EXISTS chatbot_knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('platform', 'tenant', 'domain')),
  domain TEXT CHECK (domain IN ('auth', 'multi-tenancy', 'billing', 'permissions', 'database', 'shared')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_bases_tenant_id ON chatbot_knowledge_bases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_bases_type ON chatbot_knowledge_bases(type);
CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_bases_domain ON chatbot_knowledge_bases(domain);

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS chatbot_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID NOT NULL REFERENCES chatbot_knowledge_bases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('file', 'url', 'manual', 'code')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_documents_knowledge_base_id ON chatbot_documents(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_tenant_id ON chatbot_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_source_type ON chatbot_documents(source_type);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_content_search ON chatbot_documents USING GIN (to_tsvector('english', title || ' ' || content));

-- ============================================================================
-- DOCUMENT CHUNKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS chatbot_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES chatbot_documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_document_chunks_document_id ON chatbot_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_document_chunks_tenant_id ON chatbot_document_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_document_chunks_chunk_index ON chatbot_document_chunks(document_id, chunk_index);

-- ============================================================================
-- EMBEDDINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS chatbot_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES chatbot_document_chunks(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES chatbot_documents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES chatbot_knowledge_bases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_embeddings_chunk_id ON chatbot_embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_embeddings_document_id ON chatbot_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_embeddings_knowledge_base_id ON chatbot_embeddings(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_embeddings_tenant_id ON chatbot_embeddings(tenant_id);

-- Vector similarity search index (HNSW for fast approximate nearest neighbor search)
CREATE INDEX IF NOT EXISTS idx_chatbot_embeddings_vector ON chatbot_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_embeddings ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only see their tenant's conversations
CREATE POLICY "Users can view their tenant's conversations"
  ON chatbot_conversations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
    OR tenant_id IS NULL
  );

CREATE POLICY "Users can create conversations for their tenant"
  ON chatbot_conversations
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their tenant's conversations"
  ON chatbot_conversations
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their tenant's conversations"
  ON chatbot_conversations
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Messages: Users can only see their tenant's messages
CREATE POLICY "Users can view their tenant's messages"
  ON chatbot_messages
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages for their tenant"
  ON chatbot_messages
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Knowledge Bases: Users can only see their tenant's knowledge bases
CREATE POLICY "Users can view their tenant's knowledge bases"
  ON chatbot_knowledge_bases
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
    OR type = 'platform' -- Platform knowledge bases are shared
  );

CREATE POLICY "Users can create knowledge bases for their tenant"
  ON chatbot_knowledge_bases
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their tenant's knowledge bases"
  ON chatbot_knowledge_bases
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their tenant's knowledge bases"
  ON chatbot_knowledge_bases
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Documents: Users can only see their tenant's documents
CREATE POLICY "Users can view their tenant's documents"
  ON chatbot_documents
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
    OR knowledge_base_id IN (
      SELECT id FROM chatbot_knowledge_bases WHERE type = 'platform'
    )
  );

CREATE POLICY "Users can create documents for their tenant"
  ON chatbot_documents
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their tenant's documents"
  ON chatbot_documents
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their tenant's documents"
  ON chatbot_documents
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Document Chunks: Users can only see their tenant's chunks
CREATE POLICY "Users can view their tenant's document chunks"
  ON chatbot_document_chunks
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create document chunks for their tenant"
  ON chatbot_document_chunks
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their tenant's document chunks"
  ON chatbot_document_chunks
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Embeddings: Users can only see their tenant's embeddings
CREATE POLICY "Users can view their tenant's embeddings"
  ON chatbot_embeddings
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create embeddings for their tenant"
  ON chatbot_embeddings
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their tenant's embeddings"
  ON chatbot_embeddings
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  tenant_id uuid
)
RETURNS TABLE (
  chunk_id uuid,
  similarity float,
  content text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.chunk_id,
    1 - (e.embedding <=> query_embedding) AS similarity,
    dc.content,
    e.metadata
  FROM chatbot_embeddings e
  JOIN chatbot_document_chunks dc ON e.chunk_id = dc.id
  WHERE e.tenant_id = match_embeddings.tenant_id
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_chatbot_conversations_updated_at
  BEFORE UPDATE ON chatbot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chatbot_knowledge_bases_updated_at
  BEFORE UPDATE ON chatbot_knowledge_bases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chatbot_documents_updated_at
  BEFORE UPDATE ON chatbot_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


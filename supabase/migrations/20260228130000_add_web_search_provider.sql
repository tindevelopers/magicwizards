-- Add web-search provider for MCP API key configuration
INSERT INTO integration_providers (slug, name, category, auth_type, description)
VALUES
  ('web-search', 'Web Search', 'tools', 'api_key',
   'Web search via Google CSE or SerpAPI for wizard tools')
ON CONFLICT (slug) DO NOTHING;

-- Add Microsoft 365 provider for OAuth flows (Outlook Mail, Calendar, Graph)
INSERT INTO integration_providers (slug, name, category, auth_type, description)
VALUES
  ('microsoft', 'Microsoft 365', 'productivity', 'oauth2',
   'Outlook Mail, Calendar, and Microsoft Graph via OAuth 2.0')
ON CONFLICT (slug) DO NOTHING;

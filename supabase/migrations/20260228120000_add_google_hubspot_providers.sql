-- Add Google Workspace and HubSpot providers for OAuth flows
INSERT INTO integration_providers (slug, name, category, auth_type, description)
VALUES
  ('google', 'Google Workspace', 'productivity', 'oauth2',
   'Gmail, Google Calendar, and Google Drive via OAuth 2.0'),
  ('hubspot', 'HubSpot', 'crm', 'oauth2',
   'HubSpot CRM: contacts, companies, deals, and activities')
ON CONFLICT (slug) DO NOTHING;

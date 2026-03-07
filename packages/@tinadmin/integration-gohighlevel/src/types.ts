export type GHLTokenSet = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  locationId?: string;
  companyId?: string;
};

export type GHLConnectionSecrets = {
  oauth: {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_at?: string; // ISO
    scope?: string;
  };
  location_id?: string;
  company_id?: string;
};

export type GHLOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
};

export type GHLApiError = {
  message: string;
  status?: number;
  details?: any;
};


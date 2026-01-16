import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  getAuthProviderType,
  supportsFeature,
} from '../index';

describe('auth utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAuthProviderType', () => {
    it('returns supabase as default when no provider is set', () => {
      delete process.env.NEXT_PUBLIC_AUTH_PROVIDER;
      expect(getAuthProviderType()).toBe('supabase');
    });

    it('returns configured provider from environment', () => {
      process.env.NEXT_PUBLIC_AUTH_PROVIDER = 'workos';
      expect(getAuthProviderType()).toBe('workos');
      
      process.env.NEXT_PUBLIC_AUTH_PROVIDER = 'auth0';
      expect(getAuthProviderType()).toBe('auth0');
      
      process.env.NEXT_PUBLIC_AUTH_PROVIDER = 'cognito';
      expect(getAuthProviderType()).toBe('cognito');
    });
  });

  describe('supportsFeature', () => {
    it('returns correct feature support for supabase', () => {
      process.env.NEXT_PUBLIC_AUTH_PROVIDER = 'supabase';
      expect(supportsFeature('oauth')).toBe(true);
      expect(supportsFeature('mfa')).toBe(true);
      expect(supportsFeature('sso')).toBe(false);
      expect(supportsFeature('passwordless')).toBe(true);
    });

    it('returns correct feature support for workos', () => {
      process.env.NEXT_PUBLIC_AUTH_PROVIDER = 'workos';
      expect(supportsFeature('oauth')).toBe(true);
      expect(supportsFeature('mfa')).toBe(true);
      expect(supportsFeature('sso')).toBe(true);
      expect(supportsFeature('passwordless')).toBe(false);
    });

    it('returns correct feature support for auth0', () => {
      process.env.NEXT_PUBLIC_AUTH_PROVIDER = 'auth0';
      expect(supportsFeature('oauth')).toBe(true);
      expect(supportsFeature('mfa')).toBe(true);
      expect(supportsFeature('sso')).toBe(true);
      expect(supportsFeature('passwordless')).toBe(true);
    });

    it('returns correct feature support for cognito', () => {
      process.env.NEXT_PUBLIC_AUTH_PROVIDER = 'cognito';
      expect(supportsFeature('oauth')).toBe(true);
      expect(supportsFeature('mfa')).toBe(true);
      expect(supportsFeature('sso')).toBe(true);
      expect(supportsFeature('passwordless')).toBe(false);
    });

    it('returns false for unknown provider', () => {
      process.env.NEXT_PUBLIC_AUTH_PROVIDER = 'unknown';
      expect(supportsFeature('oauth')).toBe(false);
      expect(supportsFeature('mfa')).toBe(false);
      expect(supportsFeature('sso')).toBe(false);
      expect(supportsFeature('passwordless')).toBe(false);
    });

    it('returns false for unknown feature', () => {
      process.env.NEXT_PUBLIC_AUTH_PROVIDER = 'supabase';
      // @ts-expect-error - testing unknown feature
      expect(supportsFeature('unknown_feature')).toBe(false);
    });
  });
});


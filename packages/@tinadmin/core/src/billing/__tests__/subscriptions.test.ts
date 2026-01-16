import { describe, expect, it } from 'vitest';

/**
 * Subscription status validation utilities
 * These are pure functions that can be tested without mocking
 */

/**
 * Check if a subscription status is considered active
 */
export function isActiveSubscriptionStatus(status: string): boolean {
  return ['active', 'trialing'].includes(status.toLowerCase());
}

/**
 * Check if a subscription status is considered canceled
 */
export function isCanceledSubscriptionStatus(status: string): boolean {
  return ['canceled', 'unpaid', 'past_due'].includes(status.toLowerCase());
}

/**
 * Check if a subscription status is considered pending
 */
export function isPendingSubscriptionStatus(status: string): boolean {
  return ['incomplete', 'incomplete_expired', 'unpaid'].includes(status.toLowerCase());
}

/**
 * Validate subscription status
 */
export function validateSubscriptionStatus(status: string): {
  isValid: boolean;
  error?: string;
} {
  const validStatuses = [
    'active',
    'trialing',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused',
  ];

  if (!status || typeof status !== 'string') {
    return {
      isValid: false,
      error: 'Subscription status is required',
    };
  }

  if (!validStatuses.includes(status.toLowerCase())) {
    return {
      isValid: false,
      error: `Invalid subscription status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`,
    };
  }

  return { isValid: true };
}

describe('subscription utilities', () => {
  describe('isActiveSubscriptionStatus', () => {
    it('returns true for active statuses', () => {
      expect(isActiveSubscriptionStatus('active')).toBe(true);
      expect(isActiveSubscriptionStatus('trialing')).toBe(true);
      expect(isActiveSubscriptionStatus('ACTIVE')).toBe(true);
      expect(isActiveSubscriptionStatus('TRIALING')).toBe(true);
    });

    it('returns false for inactive statuses', () => {
      expect(isActiveSubscriptionStatus('canceled')).toBe(false);
      expect(isActiveSubscriptionStatus('unpaid')).toBe(false);
      expect(isActiveSubscriptionStatus('past_due')).toBe(false);
      expect(isActiveSubscriptionStatus('incomplete')).toBe(false);
    });
  });

  describe('isCanceledSubscriptionStatus', () => {
    it('returns true for canceled statuses', () => {
      expect(isCanceledSubscriptionStatus('canceled')).toBe(true);
      expect(isCanceledSubscriptionStatus('unpaid')).toBe(true);
      expect(isCanceledSubscriptionStatus('past_due')).toBe(true);
      expect(isCanceledSubscriptionStatus('CANCELED')).toBe(true);
    });

    it('returns false for non-canceled statuses', () => {
      expect(isCanceledSubscriptionStatus('active')).toBe(false);
      expect(isCanceledSubscriptionStatus('trialing')).toBe(false);
      expect(isCanceledSubscriptionStatus('incomplete')).toBe(false);
    });
  });

  describe('isPendingSubscriptionStatus', () => {
    it('returns true for pending statuses', () => {
      expect(isPendingSubscriptionStatus('incomplete')).toBe(true);
      expect(isPendingSubscriptionStatus('incomplete_expired')).toBe(true);
      expect(isPendingSubscriptionStatus('unpaid')).toBe(true);
      expect(isPendingSubscriptionStatus('INCOMPLETE')).toBe(true);
    });

    it('returns false for non-pending statuses', () => {
      expect(isPendingSubscriptionStatus('active')).toBe(false);
      expect(isPendingSubscriptionStatus('trialing')).toBe(false);
      expect(isPendingSubscriptionStatus('canceled')).toBe(false);
    });
  });

  describe('validateSubscriptionStatus', () => {
    it('validates correct subscription statuses', () => {
      const validStatuses = [
        'active',
        'trialing',
        'past_due',
        'canceled',
        'unpaid',
        'incomplete',
        'incomplete_expired',
        'paused',
      ];

      for (const status of validStatuses) {
        const result = validateSubscriptionStatus(status);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });

    it('handles case-insensitive validation', () => {
      expect(validateSubscriptionStatus('ACTIVE')).toEqual({ isValid: true });
      expect(validateSubscriptionStatus('Trialing')).toEqual({ isValid: true });
      expect(validateSubscriptionStatus('CANCELED')).toEqual({ isValid: true });
    });

    it('rejects invalid statuses', () => {
      const result = validateSubscriptionStatus('invalid_status');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid subscription status');
    });

    it('rejects empty status', () => {
      const result = validateSubscriptionStatus('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Subscription status is required');
    });

    it('rejects null/undefined status', () => {
      // @ts-expect-error - testing invalid input
      const result1 = validateSubscriptionStatus(null);
      expect(result1.isValid).toBe(false);
      expect(result1.error).toBe('Subscription status is required');

      // @ts-expect-error - testing invalid input
      const result2 = validateSubscriptionStatus(undefined);
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBe('Subscription status is required');
    });
  });
});


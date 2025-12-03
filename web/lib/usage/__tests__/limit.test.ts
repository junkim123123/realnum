import { describe, it, expect, beforeEach } from 'vitest';
import { incrementUsage, getUsage } from '../limit';

describe('usage limiter', () => {
  beforeEach(() => {
    // Reset usage between tests
    (global as any).usage = new Map();
    delete process.env.NEXSUPPLY_DISABLE_USAGE_LIMITS;
  });

  it('should enforce anonymous limit by default', () => {
    const identifier = 'test-anonymous-1';
    const isAuthenticated = false;

    // First scan should be allowed
    let result = incrementUsage(identifier, isAuthenticated);
    expect(result.count).toBe(1);

    // Second scan should exceed the limit
    result = incrementUsage(identifier, isAuthenticated);
    expect(result.count).toBe(2);
  });

  it('should not enforce limits when NEXSUPPLY_DISABLE_USAGE_LIMITS is true', () => {
    process.env.NEXSUPPLY_DISABLE_USAGE_LIMITS = 'true';
    const identifier = 'test-anonymous-2';
    const isAuthenticated = false;
  
    // All scans should be allowed and not increment the count
    let result = incrementUsage(identifier, isAuthenticated);
    expect(result.count).toBe(0);
  
    result = incrementUsage(identifier, isAuthenticated);
    expect(result.count).toBe(0);
  });
  
  it('should enforce authenticated limit by default', () => {
    const identifier = 'test-authenticated-1';
    const isAuthenticated = true;
  
    // First 5 scans should be allowed
    for (let i = 1; i <= 5; i++) {
      let result = incrementUsage(identifier, isAuthenticated);
      expect(result.count).toBe(i);
    }
  
    // 6th scan should exceed the limit
    let result = incrementUsage(identifier, isAuthenticated);
    expect(result.count).toBe(6);
  });
});
/**
 * Entitlement Resolver Architecture (Prompt 9)
 */

export interface EntitlementResolver {
  hasEntitlement(userId: string | null | undefined, entitlementKey: string): Promise<boolean>;
}

/**
 * Production Entitlement Resolver
 * Default implementation before Subscription Plans & Product Purchases are built.
 * Always resolves false for unauthenticated or non-entitled requests.
 */
export class DefaultEntitlementResolver implements EntitlementResolver {
  async hasEntitlement(_userId: string | null | undefined, _entitlementKey: string): Promise<boolean> {
    // Production default: no entitlement is granted until subscription module is active
    return false;
  }
}

/**
 * Mock Entitlement Resolver for Testing
 */
export class MockEntitlementResolver implements EntitlementResolver {
  private grantedMap: Map<string, Set<string>> = new Map();

  grantEntitlement(userId: string, entitlementKey: string): void {
    if (!this.grantedMap.has(userId)) {
      this.grantedMap.set(userId, new Set());
    }
    this.grantedMap.get(userId)!.add(entitlementKey);
  }

  revokeEntitlement(userId: string, entitlementKey: string): void {
    if (this.grantedMap.has(userId)) {
      this.grantedMap.get(userId)!.delete(entitlementKey);
    }
  }

  clear(): void {
    this.grantedMap.clear();
  }

  async hasEntitlement(userId: string | null | undefined, entitlementKey: string): Promise<boolean> {
    if (!userId) return false;
    const userEntitlements = this.grantedMap.get(userId);
    if (!userEntitlements) return false;
    return userEntitlements.has(entitlementKey);
  }
}

export let currentEntitlementResolver: EntitlementResolver = new DefaultEntitlementResolver();

export function setEntitlementResolver(resolver: EntitlementResolver): void {
  currentEntitlementResolver = resolver;
}

export function resetEntitlementResolver(): void {
  currentEntitlementResolver = new DefaultEntitlementResolver();
}

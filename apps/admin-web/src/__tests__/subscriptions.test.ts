import { describe, it, expect } from 'vitest';
import { ModulesPage, PlansPage, TransactionsPage } from '../pages/subscriptions';

describe('Admin Web Subscriptions UI Tests', () => {
  it('exports Subscriptions pages correctly', () => {
    expect(ModulesPage).toBeDefined();
    expect(PlansPage).toBeDefined();
    expect(TransactionsPage).toBeDefined();
  });
});

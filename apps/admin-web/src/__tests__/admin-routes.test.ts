import { describe, it, expect } from 'vitest';
import { ALL_ADMIN_MENU_ITEMS, MenuItem } from '../components/AdminLayout';

describe('Admin Shell Routes & Menu Structure', () => {
  it('should contain exactly the 12 frozen sidebar main menus', () => {
    const menuNames = ALL_ADMIN_MENU_ITEMS.map((item: MenuItem) => item.name);

    expect(menuNames).toEqual([
      'Dashboard',
      'Exams',
      'Study Materials',
      'MCQ Library & Tests',
      'Study Plans',
      'Students',
      'Current Affairs',
      'Quick Revision',
      'Subscriptions & Payments',
      'Team',
      'Support',
      'Settings',
    ]);
  });

  it('should have unique paths for all menu routes', () => {
    const paths = ALL_ADMIN_MENU_ITEMS.map((item: MenuItem) => item.path);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(12);
  });
});

import { describe, it, expect } from 'vitest';
import { CurrentAffairsDashboardPage } from '../pages/current-affairs/CurrentAffairsDashboardPage';
import { CurrentAffairsListPage } from '../pages/current-affairs/CurrentAffairsListPage';
import { CurrentAffairsCalendarPage } from '../pages/current-affairs/CurrentAffairsCalendarPage';

describe('Admin Web Current Affairs UI Tests', () => {
  it('exports Current Affairs pages correctly', () => {
    expect(CurrentAffairsDashboardPage).toBeDefined();
    expect(CurrentAffairsListPage).toBeDefined();
    expect(CurrentAffairsCalendarPage).toBeDefined();
  });
});

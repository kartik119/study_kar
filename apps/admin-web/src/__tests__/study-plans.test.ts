import { describe, it, expect } from 'vitest';
import { StudyPlansOverviewPage } from '../pages/study-plans/StudyPlansOverviewPage';
import { CreatePlanPage } from '../pages/study-plans/CreatePlanPage';

describe('Admin Web Study Plans UI Tests', () => {
  it('exports Study Plans pages correctly', () => {
    expect(StudyPlansOverviewPage).toBeDefined();
    expect(CreatePlanPage).toBeDefined();
  });
});

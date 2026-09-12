import { describe, it, expect } from 'vitest';

describe('Admin Web Exam Pattern UI Tests', () => {
  it('exports ExamStagesPage and ExamPatternBuilderPage correctly', async () => {
    const { ExamStagesPage } = await import('../pages/exams/ExamStagesPage');
    const { ExamPatternBuilderPage } = await import('../pages/exams/ExamPatternBuilderPage');

    expect(ExamStagesPage).toBeDefined();
    expect(ExamPatternBuilderPage).toBeDefined();
  });
});

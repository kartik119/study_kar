import { describe, it, expect } from 'vitest';

describe('Admin Web Exam Pattern UI Tests', () => {
  it('exports ExamStagesPage and ExamStagesBuilderPage correctly', async () => {
    const { ExamStagesPage } = await import('../pages/exams/ExamStagesPage');
    const { ExamStagesBuilderPage } = await import('../pages/exams/ExamStagesBuilderPage');

    expect(ExamStagesPage).toBeDefined();
    expect(ExamStagesBuilderPage).toBeDefined();
  });
});

import { describe, it, expect } from 'vitest';
import { ALL_ADMIN_MENU_ITEMS, EXAM_SUBMENU } from '../components/AdminLayout';

describe('Admin Web Exam Navigation & Submenu Shell', () => {
  it('includes Exams in top-level admin menu items', () => {
    const examsItem = ALL_ADMIN_MENU_ITEMS.find((item) => item.name === 'Exams');
    expect(examsItem).toBeDefined();
    expect(examsItem?.path).toBe('/exams');
    expect(examsItem?.permission).toBe('exams.view');
  });

  it('defines required submenus under Exams module', () => {
    const names = EXAM_SUBMENU.map((s) => s.name);
    expect(names).toEqual(['All Exams', 'Add Exam', 'Exam Syllabus']);
  });
});

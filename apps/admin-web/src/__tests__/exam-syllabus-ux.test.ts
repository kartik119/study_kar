import { describe, it, expect } from 'vitest';
import { ALL_ADMIN_MENU_ITEMS } from '../components/AdminLayout';

describe('Exam Syllabus UX Polish & Admin Shell Expansion', () => {
  it('preserves the frozen sidebar menu items and submenus', () => {
    const menuNames = ALL_ADMIN_MENU_ITEMS.map((i) => i.name);
    expect(menuNames).toContain('Exams');
    expect(menuNames).toContain('Study Materials');

    const examsMenu = ALL_ADMIN_MENU_ITEMS.find((i) => i.name === 'Exams');
    expect(examsMenu?.subItems).toBeDefined();
    const syllabusItem = examsMenu?.subItems?.find((sub) => sub.name === 'Exam Syllabus');
    expect(syllabusItem).toBeDefined();
    expect(syllabusItem?.path).toBe('/exams/syllabus');
  });

  it('verifies that Exams menu contains submenus in correct order', () => {
    const examsMenu = ALL_ADMIN_MENU_ITEMS.find((i) => i.name === 'Exams');
    const subNames = examsMenu?.subItems?.map((s) => s.name);

    expect(subNames).toEqual([
      'All Exams',
      'Add Exam',
      'Exam Syllabus',
    ]);
  });
});

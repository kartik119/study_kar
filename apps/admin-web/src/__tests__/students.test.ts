import { describe, it, expect } from 'vitest';
import { StudentsListPage } from '../pages/students/StudentsListPage';
import { StudentProfilePage } from '../pages/students/StudentProfilePage';

describe('Admin Web Students UI Tests', () => {
  it('exports Students pages correctly', () => {
    expect(StudentsListPage).toBeDefined();
    expect(StudentProfilePage).toBeDefined();
  });
});

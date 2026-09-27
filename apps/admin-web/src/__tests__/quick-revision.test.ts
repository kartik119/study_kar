import { describe, it, expect } from 'vitest';
import { RevisionLibraryPage } from '../pages/quick-revision/RevisionLibraryPage';
import { QuickRevisionAddCardPage } from '../pages/quick-revision/QuickRevisionAddCardPage';

describe('Admin Web Quick Revision UI Tests', () => {
  it('exports Quick Revision pages correctly', () => {
    expect(RevisionLibraryPage).toBeDefined();
    expect(QuickRevisionAddCardPage).toBeDefined();
  });
});

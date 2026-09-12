import { describe, it, expect } from 'vitest';
import { STUDY_MATERIALS_SUBMENU } from '../components/AdminLayout';
import { StudyMaterialApi } from '../api/study-materials.api';

describe('Study Materials UI & Submenu Unit Tests', () => {
  it('should define the exact 3 Study Materials submenu items in correct order', () => {
    const expectedSubmenuNames = [
      'All Content',
      'Add Content',
      'Categories',
    ];

    expect(STUDY_MATERIALS_SUBMENU).toHaveLength(3);
    STUDY_MATERIALS_SUBMENU.forEach((item, index) => {
      expect(item.name).toBe(expectedSubmenuNames[index]);
    });
  });

  it('should use exact path mapping for functional submenu items', () => {
    expect(STUDY_MATERIALS_SUBMENU[0].path).toBe('/study-materials');
    expect(STUDY_MATERIALS_SUBMENU[1].path).toBe('/study-materials/new');
    expect(STUDY_MATERIALS_SUBMENU[2].path).toBe('/study-materials/categories');
  });

  it('should export StudyMaterialApi client methods', () => {
    expect(typeof StudyMaterialApi.getStudyMaterials).toBe('function');
    expect(typeof StudyMaterialApi.getStudyMaterialById).toBe('function');
    expect(typeof StudyMaterialApi.createStudyMaterial).toBe('function');
    expect(typeof StudyMaterialApi.updateStudyMaterial).toBe('function');
  });

  it('should include SHORT_NOTE in CALLOUT_TYPES array', async () => {
    const { CALLOUT_TYPES } = await import('../components/editor/TiptapEditor');
    const shortNote = CALLOUT_TYPES.find((c) => c.id === 'SHORT_NOTE');
    expect(shortNote).toBeDefined();
    expect(shortNote?.labelEn).toBe('Short Note');
    expect(shortNote?.labelKn).toBe('ಕಿರು ಟಿಪ್ಪಣಿ');
  });
});

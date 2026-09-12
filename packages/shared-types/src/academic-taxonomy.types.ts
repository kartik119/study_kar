export type AcademicTaxonomyReadiness = 'BOTH_COMPLETE' | 'ENGLISH_COMPLETE' | 'KANNADA_COMPLETE' | 'INCOMPLETE';

export interface AcademicCategory {
  id: string;
  code: string;
  nameEn: string;
  nameKn: string;
  shortNameEn?: string | null;
  shortNameKn?: string | null;
  slugEn: string;
  slugKn: string;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;

  // Joined / computed metadata
  subcategoryCount?: number;
  studyMaterialCount?: number;
  bilingualReadiness?: AcademicTaxonomyReadiness;
  subcategories?: AcademicSubcategory[];
}

export interface AcademicSubcategory {
  id: string;
  categoryId: string;
  code: string;
  nameEn: string;
  nameKn: string;
  shortNameEn?: string | null;
  shortNameKn?: string | null;
  slugEn: string;
  slugKn: string;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;

  // Joined / computed metadata
  categoryNameEn?: string;
  categoryNameKn?: string;
  topicCount?: number;
  studyMaterialCount?: number;
  bilingualReadiness?: AcademicTaxonomyReadiness;
  topics?: AcademicTopic[];
}

export interface AcademicTopic {
  id: string;
  subcategoryId: string;
  code: string;
  nameEn: string;
  nameKn: string;
  shortNameEn?: string | null;
  shortNameKn?: string | null;
  slugEn: string;
  slugKn: string;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;

  // Joined / computed metadata
  subcategoryNameEn?: string;
  subcategoryNameKn?: string;
  categoryNameEn?: string;
  categoryNameKn?: string;
  knowledgeAreaCount?: number;
  studyMaterialCount?: number;
  bilingualReadiness?: AcademicTaxonomyReadiness;
  knowledgeAreas?: AcademicKnowledgeArea[];
}

export interface AcademicKnowledgeArea {
  id: string;
  topicId: string;
  code: string;
  nameEn: string;
  nameKn: string;
  shortNameEn?: string | null;
  shortNameKn?: string | null;
  slugEn: string;
  slugKn: string;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;

  // Joined / computed metadata
  topicNameEn?: string;
  topicNameKn?: string;
  studyMaterialCount?: number;
  bilingualReadiness?: AcademicTaxonomyReadiness;
}

export interface AcademicTaxonomyTree {
  categories: AcademicCategory[];
  totalCategories: number;
  totalSubcategories: number;
  totalTopics: number;
  totalKnowledgeAreas: number;
}

export interface AcademicTaxonomyMoveRequest {
  targetParentId: string;
  reason?: string;
}

export interface AcademicTaxonomyReorderRequest {
  items: { id: string; displayOrder: number }[];
}

export interface AcademicTaxonomyPath {
  category: AcademicCategory;
  subcategory: AcademicSubcategory;
  topic: AcademicTopic;
  knowledgeArea?: AcademicKnowledgeArea | null;
  isConsistent: boolean;
}

export interface AcademicStage {
  id: string;
  code: string;
  nameEn: string;
  nameKn: string;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

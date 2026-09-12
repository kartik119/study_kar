export type ExamCycleStatus =
  | 'DRAFT'
  | 'REVIEW_PENDING'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'CLOSED'
  | 'ARCHIVED';

export type ExamVisibility = 'PRIVATE' | 'UNLISTED' | 'PUBLIC';

export type ImportantDateType =
  | 'NOTIFICATION'
  | 'APPLICATION_START'
  | 'APPLICATION_END'
  | 'FEE_PAYMENT_END'
  | 'CORRECTION_WINDOW'
  | 'ADMIT_CARD'
  | 'EXAM'
  | 'RESULT'
  | 'CUSTOM';

export type OfficialResourceType =
  | 'OFFICIAL_NOTIFICATION'
  | 'OFFICIAL_WEBSITE'
  | 'APPLICATION'
  | 'INSTRUCTIONS'
  | 'CALENDAR'
  | 'OTHER';

export type ExamReadinessState =
  | 'BOTH_COMPLETE'
  | 'ENGLISH_COMPLETE'
  | 'KANNADA_COMPLETE'
  | 'ENGLISH_MISSING'
  | 'KANNADA_MISSING'
  | 'INCOMPLETE';

export interface ExamAuthority {
  id: string;
  code: string;
  nameEn: string;
  nameKn: string;
  shortNameEn?: string | null;
  shortNameKn?: string | null;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  officialWebsiteUrl?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ExamProgramme {
  id: string;
  authorityId: string;
  authority?: ExamAuthority;
  code: string;
  nameEn: string;
  nameKn: string;
  shortNameEn?: string | null;
  shortNameKn?: string | null;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  overviewEn?: string | null;
  overviewKn?: string | null;
  eligibilitySummaryEn?: string | null;
  eligibilitySummaryKn?: string | null;
  selectionProcessSummaryEn?: string | null;
  selectionProcessSummaryKn?: string | null;
  officialProgrammeUrl?: string | null;
  isActive: boolean;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ExamEligibility {
  id: string;
  examCycleId: string;
  minimumAge?: number | null;
  maximumAge?: number | null;
  ageCalculatedOn?: Date | string | null;
  minimumEducationEn?: string | null;
  minimumEducationKn?: string | null;
  nationalityRequirementEn?: string | null;
  nationalityRequirementKn?: string | null;
  domicileRequirementEn?: string | null;
  domicileRequirementKn?: string | null;
  attemptsSummaryEn?: string | null;
  attemptsSummaryKn?: string | null;
  additionalCriteriaEn?: string | null;
  additionalCriteriaKn?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ExamImportantDate {
  id: string;
  examCycleId: string;
  type: ImportantDateType;
  labelEn: string;
  labelKn: string;
  startAt: Date | string;
  endAt?: Date | string | null;
  isTentative: boolean;
  displayOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ExamOfficialResource {
  id: string;
  examCycleId: string;
  resourceType: OfficialResourceType;
  labelEn: string;
  labelKn: string;
  url: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ExamSEO {
  id: string;
  examCycleId: string;
  slugEn: string;
  slugKn: string;
  metaTitleEn?: string | null;
  metaTitleKn?: string | null;
  metaDescriptionEn?: string | null;
  metaDescriptionKn?: string | null;
  socialTitleEn?: string | null;
  socialTitleKn?: string | null;
  socialDescriptionEn?: string | null;
  socialDescriptionKn?: string | null;
  canonicalUrlEn?: string | null;
  canonicalUrlKn?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ExamCycle {
  id: string;
  programmeId: string;
  programme?: ExamProgramme;
  cycleCode: string;
  cycleYear: number;
  titleEn: string;
  titleKn: string;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  notificationNumber?: string | null;
  notificationDate?: Date | string | null;
  applicationStartDate?: Date | string | null;
  applicationEndDate?: Date | string | null;
  feePaymentEndDate?: Date | string | null;
  tentativeExamDate?: Date | string | null;
  resultDate?: Date | string | null;
  officialNotificationUrl?: string | null;
  applicationUrl?: string | null;
  logoUrl?: string | null;
  status: ExamCycleStatus;
  visibility: ExamVisibility;
  reviewSubmittedAt?: Date | string | null;
  reviewedAt?: Date | string | null;
  reviewedByAdminId?: string | null;
  publishedAt?: Date | string | null;
  publishedByAdminId?: string | null;
  closedAt?: Date | string | null;
  archivedAt?: Date | string | null;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;

  eligibility?: ExamEligibility | null;
  importantDates?: ExamImportantDate[];
  officialResources?: ExamOfficialResource[];
  seo?: ExamSEO | null;

  readiness?: {
    state: ExamReadinessState;
    isEnglishComplete: boolean;
    isKannadaComplete: boolean;
    missingEnglishFields: string[];
    missingKannadaFields: string[];
  };
}

export interface PublicExamLocalizedResponse {
  id: string;
  cycleCode: string;
  cycleYear: number;
  title: string;
  description?: string | null;
  slug: string;
  language: 'en' | 'kn';
  authorityName: string;
  programmeName: string;
  notificationNumber?: string | null;
  notificationDate?: Date | string | null;
  applicationStartDate?: Date | string | null;
  applicationEndDate?: Date | string | null;
  tentativeExamDate?: Date | string | null;
  resultDate?: Date | string | null;
  officialNotificationUrl?: string | null;
  applicationUrl?: string | null;
  eligibility?: {
    minimumAge?: number | null;
    maximumAge?: number | null;
    minimumEducation?: string | null;
    nationalityRequirement?: string | null;
    domicileRequirement?: string | null;
  } | null;
  importantDates: Array<{
    type: ImportantDateType;
    label: string;
    startAt: Date | string;
    endAt?: Date | string | null;
    isTentative: boolean;
  }>;
  officialResources: Array<{
    resourceType: OfficialResourceType;
    label: string;
    url: string;
  }>;
  seo?: {
    slug: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    socialTitle?: string | null;
    socialDescription?: string | null;
    canonicalUrl?: string | null;
  } | null;
}

import { prisma } from '@study-karnataka/database';
import { calculateExamReadiness, ExamReadinessResult } from '@study-karnataka/validation';

export async function createExamAuditLog(params: {
  adminUserId: string;
  action: string;
  recordType: 'ExamAuthority' | 'ExamProgramme' | 'ExamCycle' | 'ExamEligibility' | 'ExamImportantDate' | 'ExamOfficialResource' | 'ExamSEO';
  recordId: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<any> {
  return prisma.adminAuditLog.create({
    data: {
      adminUserId: params.adminUserId,
      action: params.action,
      module: 'EXAMS',
      recordType: params.recordType,
      recordId: params.recordId,
      previousValue: params.previousValue ? JSON.parse(JSON.stringify(params.previousValue)) : undefined,
      newValue: params.newValue ? JSON.parse(JSON.stringify(params.newValue)) : undefined,
      reason: params.reason || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    },
  });
}

export function serializePublicExam(cycle: any, language: 'en' | 'kn' = 'en') {
  const isKn = language === 'kn';
  const programme = cycle.programme || {};
  const authority = programme.authority || {};
  const eligibility = cycle.eligibility || {};
  const seo = cycle.seo || {};

  return {
    id: cycle.id,
    cycleCode: cycle.cycleCode,
    cycleYear: cycle.cycleYear,
    title: isKn ? cycle.titleKn || cycle.titleEn : cycle.titleEn,
    description: isKn ? cycle.descriptionKn || cycle.descriptionEn : cycle.descriptionEn,
    slug: isKn ? seo.slugKn || seo.slugEn || cycle.id : seo.slugEn || cycle.id,
    language,
    authorityName: isKn ? authority.nameKn || authority.nameEn : authority.nameEn,
    programmeName: isKn ? programme.nameKn || programme.nameEn : programme.nameEn,
    notificationNumber: cycle.notificationNumber || null,
    notificationDate: cycle.notificationDate || null,
    applicationStartDate: cycle.applicationStartDate || null,
    applicationEndDate: cycle.applicationEndDate || null,
    tentativeExamDate: cycle.tentativeExamDate || null,
    resultDate: cycle.resultDate || null,
    officialNotificationUrl: cycle.officialNotificationUrl || null,
    applicationUrl: cycle.applicationUrl || null,
    logoUrl: cycle.logoUrl || null,
    eligibility: cycle.eligibility
      ? {
          minimumAge: eligibility.minimumAge || null,
          maximumAge: eligibility.maximumAge || null,
          minimumEducation: isKn ? eligibility.minimumEducationKn || eligibility.minimumEducationEn : eligibility.minimumEducationEn,
          nationalityRequirement: isKn ? eligibility.nationalityRequirementKn || eligibility.nationalityRequirementEn : eligibility.nationalityRequirementEn,
          domicileRequirement: isKn ? eligibility.domicileRequirementKn || eligibility.domicileRequirementEn : eligibility.domicileRequirementEn,
        }
      : null,
    importantDates: (cycle.importantDates || []).map((d: any) => ({
      type: d.type,
      label: isKn ? d.labelKn || d.labelEn : d.labelEn,
      startAt: d.startAt,
      endAt: d.endAt || null,
      isTentative: d.isTentative,
    })),
    officialResources: (cycle.officialResources || [])
      .filter((r: any) => r.isActive !== false)
      .map((r: any) => ({
        resourceType: r.resourceType,
        label: isKn ? r.labelKn || r.labelEn : r.labelEn,
        url: r.url,
      })),
    seo: cycle.seo
      ? {
          slug: isKn ? seo.slugKn : seo.slugEn,
          metaTitle: isKn ? seo.metaTitleKn || seo.metaTitleEn : seo.metaTitleEn,
          metaDescription: isKn ? seo.metaDescriptionKn || seo.metaDescriptionEn : seo.metaDescriptionEn,
          socialTitle: isKn ? seo.socialTitleKn || seo.socialTitleEn : seo.socialTitleEn,
          socialDescription: isKn ? seo.socialDescriptionKn || seo.socialDescriptionEn : seo.socialDescriptionEn,
          canonicalUrl: isKn ? seo.canonicalUrlKn || seo.canonicalUrlEn : seo.canonicalUrlEn,
        }
      : null,
  };
}

export function validateExamLifecycleTransition(
  currentStatus: string,
  targetAction: string,
  readiness: ExamReadinessResult
): { allowed: boolean; newStatus?: string; reason?: string } {
  switch (targetAction) {
    case 'SUBMIT_REVIEW':
      if (currentStatus !== 'DRAFT' && currentStatus !== 'CHANGES_REQUESTED') {
        return { allowed: false, reason: `Cannot submit for review from status ${currentStatus}` };
      }
      if (!readiness.isEnglishComplete || !readiness.isKannadaComplete) {
        return { allowed: false, reason: 'Record must be complete in both English and Kannada before submission' };
      }
      return { allowed: true, newStatus: 'REVIEW_PENDING' };

    case 'REQUEST_CHANGES':
      if (currentStatus !== 'REVIEW_PENDING') {
        return { allowed: false, reason: `Cannot request changes from status ${currentStatus}` };
      }
      return { allowed: true, newStatus: 'CHANGES_REQUESTED' };

    case 'APPROVE':
      if (currentStatus !== 'REVIEW_PENDING') {
        return { allowed: false, reason: `Cannot approve from status ${currentStatus}` };
      }
      if (!readiness.isEnglishComplete || !readiness.isKannadaComplete) {
        return { allowed: false, reason: 'Record must be complete in both languages before approval' };
      }
      return { allowed: true, newStatus: 'APPROVED' };

    case 'PUBLISH':
      if (currentStatus !== 'APPROVED') {
        return { allowed: false, reason: `Only APPROVED records can be published. Current status: ${currentStatus}` };
      }
      if (!readiness.isEnglishComplete || !readiness.isKannadaComplete) {
        return { allowed: false, reason: 'Record must be complete in both languages before publication' };
      }
      return { allowed: true, newStatus: 'PUBLISHED' };

    case 'CLOSE':
      if (currentStatus !== 'PUBLISHED') {
        return { allowed: false, reason: `Only PUBLISHED records can be closed. Current status: ${currentStatus}` };
      }
      return { allowed: true, newStatus: 'CLOSED' };

    case 'ARCHIVE':
      if (currentStatus !== 'CLOSED' && currentStatus !== 'DRAFT' && currentStatus !== 'CHANGES_REQUESTED') {
        return { allowed: false, reason: `Cannot archive active record from status ${currentStatus}` };
      }
      return { allowed: true, newStatus: 'ARCHIVED' };

    case 'REVERT_DRAFT':
      if (currentStatus === 'PUBLISHED' || currentStatus === 'CLOSED' || currentStatus === 'ARCHIVED') {
        return { allowed: false, reason: `Cannot revert published/closed/archived record to DRAFT. Use closure instead.` };
      }
      return { allowed: true, newStatus: 'DRAFT' };

    case 'REOPEN':
      if (currentStatus !== 'CLOSED' && currentStatus !== 'ARCHIVED' && currentStatus !== 'PUBLISHED' && currentStatus !== 'APPROVED') {
        return { allowed: false, reason: `Only PUBLISHED, APPROVED, CLOSED or ARCHIVED records can be reopened. Current status: ${currentStatus}` };
      }
      return { allowed: true, newStatus: 'DRAFT' };


    default:
      return { allowed: false, reason: `Unknown workflow action: ${targetAction}` };
  }
}

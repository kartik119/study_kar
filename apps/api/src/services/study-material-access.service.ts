// @ts-nocheck
import { prisma } from '@study-karnataka/database';
import {
  StudyMaterialAccessType,
  StudyMaterialAccessResult,
  StudyMaterialAccessPreviewMode,
  StudyMaterialAccessUpdateRequest,
} from '@study-karnataka/shared-types';
import {
  generateEntitlementKey,
  ensureStableNodeIds,
  extractPreviewOutline,
  splitContentAtNodeBoundary,
  evaluateStudyMaterialAccessReadiness,
} from '@study-karnataka/validation';
import { currentEntitlementResolver } from './entitlement-resolver.service';
import { AppError } from '../middleware/errorHandler';

export class StudyMaterialAccessService {
  /**
   * Get or auto-create access policy for a Study Material.
   */
  static async getAccessPolicy(studyMaterialId: string): Promise<any> {
    let policy = await prisma.studyMaterialAccessPolicy.findUnique({
      where: { studyMaterialId },
      include: {
        previewConfigs: {
          include: {
            localeRevision: true,
          },
        },
      },
    });

    if (!policy) {
      const entitlementKey = generateEntitlementKey(studyMaterialId);
      policy = await prisma.studyMaterialAccessPolicy.create({
        data: {
          studyMaterialId,
          accessType: 'FREE',
          entitlementKey,
          teaserMode: 'SUMMARY_ONLY',
          freeMcqSampleCount: 0,
          freeQuickRevisionSampleCount: 0,
        },
        include: {
          previewConfigs: {
            include: {
              localeRevision: true,
            },
          },
        },
      });
    }

    return policy;
  }

  /**
   * Update Access Policy and language preview configurations.
   */
  static async updateAccessPolicy(
    studyMaterialId: string,
    payload: StudyMaterialAccessUpdateRequest,
    adminUserId: string
  ) {
    const studyMaterial = await prisma.studyMaterial.findUnique({
      where: { id: studyMaterialId },
      include: {
        locales: {
          include: {
            revisions: {
              where: { isCurrentPublished: true },
            },
          },
        },
      },
    });

    if (!studyMaterial) {
      throw new AppError('Study Material not found', 404, 'STUDY_MATERIAL_ACCESS_POLICY_NOT_FOUND');
    }

    const currentPolicy = await this.getAccessPolicy(studyMaterialId);
    const entitlementKey = currentPolicy.entitlementKey || generateEntitlementKey(studyMaterialId);

    // Perform atomic transaction update
    const result = await prisma.$transaction(async (tx) => {
      const updatedPolicy = await tx.studyMaterialAccessPolicy.update({
        where: { studyMaterialId },
        data: {
          accessType: payload.accessType,
          entitlementKey,
          freeMcqSampleCount: payload.freeMcqSampleCount ?? currentPolicy.freeMcqSampleCount,
          freeQuickRevisionSampleCount:
            payload.freeQuickRevisionSampleCount ?? currentPolicy.freeQuickRevisionSampleCount,
          updatedByAdminId: adminUserId,
          version: { increment: 1 },
        },
      });

      // Process Preview Config for English
      const enLocale = studyMaterial.locales.find((l) => l.language === 'en');
      const enPublishedRev = enLocale?.revisions[0];
      if (enPublishedRev) {
        await tx.studyMaterialLocalePreviewConfig.upsert({
          where: {
            accessPolicyId_localeRevisionId: {
              accessPolicyId: updatedPolicy.id,
              localeRevisionId: enPublishedRev.id,
            },
          },
          update: {
            previewMode: payload.accessType === 'FREE' ? 'FULL' : payload.accessType === 'PAID' ? 'SUMMARY_ONLY' : 'CONTENT_BOUNDARY',
            previewEndNodeId: payload.previewEndNodeIdEn ?? undefined,
            paywallTitle: payload.paywallTitleEn ?? 'Unlock Full English Content',
            paywallMessage: payload.paywallMessageEn ?? 'Access complete English study material with Study Karnataka entitlement.',
            updatedByAdminId: adminUserId,
          },
          create: {
            accessPolicyId: updatedPolicy.id,
            localeRevisionId: enPublishedRev.id,
            language: 'en',
            previewMode: payload.accessType === 'FREE' ? 'FULL' : payload.accessType === 'PAID' ? 'SUMMARY_ONLY' : 'CONTENT_BOUNDARY',
            previewEndNodeId: payload.previewEndNodeIdEn ?? undefined,
            paywallTitle: payload.paywallTitleEn ?? 'Unlock Full English Content',
            paywallMessage: payload.paywallMessageEn ?? 'Access complete English study material with Study Karnataka entitlement.',
            createdByAdminId: adminUserId,
            updatedByAdminId: adminUserId,
          },
        });
      }

      // Process Preview Config for Kannada
      const knLocale = studyMaterial.locales.find((l) => l.language === 'kn');
      const knPublishedRev = knLocale?.revisions[0];
      if (knPublishedRev) {
        await tx.studyMaterialLocalePreviewConfig.upsert({
          where: {
            accessPolicyId_localeRevisionId: {
              accessPolicyId: updatedPolicy.id,
              localeRevisionId: knPublishedRev.id,
            },
          },
          update: {
            previewMode: payload.accessType === 'FREE' ? 'FULL' : payload.accessType === 'PAID' ? 'SUMMARY_ONLY' : 'CONTENT_BOUNDARY',
            previewEndNodeId: payload.previewEndNodeIdKn ?? undefined,
            paywallTitle: payload.paywallTitleKn ?? 'ಸಂಪೂರ್ಣ ಕನ್ನಡ ವಿಷಯವನ್ನು ವೀಕ್ಷಿಸಿ',
            paywallMessage: payload.paywallMessageKn ?? 'ಅಧ್ಯಯನ ಕರ್ನಾಟಕ ಚಂದಾದಾರಿಕೆಯೊಂದಿಗೆ ಸಂಪೂರ್ಣ ವಿಷಯವನ್ನು ಓದಿ.',
            updatedByAdminId: adminUserId,
          },
          create: {
            accessPolicyId: updatedPolicy.id,
            localeRevisionId: knPublishedRev.id,
            language: 'kn',
            previewMode: payload.accessType === 'FREE' ? 'FULL' : payload.accessType === 'PAID' ? 'SUMMARY_ONLY' : 'CONTENT_BOUNDARY',
            previewEndNodeId: payload.previewEndNodeIdKn ?? undefined,
            paywallTitle: payload.paywallTitleKn ?? 'ಸಂಪೂರ್ಣ ಕನ್ನಡ ವಿಷಯವನ್ನು ವೀಕ್ಷಿಸಿ',
            paywallMessage: payload.paywallMessageKn ?? 'ಅಧ್ಯಯನ ಕರ್ನಾಟಕ ಚಂದಾದಾರಿಕೆಯೊಂದಿಗೆ ಸಂಪೂರ್ಣ ವಿಷಯವನ್ನು ಓದಿ.',
            createdByAdminId: adminUserId,
            updatedByAdminId: adminUserId,
          },
        });
      }

      // Record Audit Log if access type or consequential settings changed
      if (currentPolicy.accessType !== payload.accessType || payload.reason) {
        await tx.adminAuditLog.create({
          data: {
            adminUserId,
            action: 'UPDATE_ACCESS_POLICY',
            module: 'STUDY_MATERIALS',
            recordType: 'StudyMaterialAccessPolicy',
            recordId: updatedPolicy.id,
            previousValue: {
              accessType: currentPolicy.accessType,
            },
            newValue: {
              accessType: payload.accessType,
              freeMcqSampleCount: updatedPolicy.freeMcqSampleCount,
              freeQuickRevisionSampleCount: updatedPolicy.freeQuickRevisionSampleCount,
            },
            reason: payload.reason || `Changed Access Type from ${currentPolicy.accessType} to ${payload.accessType}`,
          },
        });
      }

      return updatedPolicy;
    });

    return result;
  }

  /**
   * Get document preview outline for admin selection.
   */
  static async getPreviewOutline(studyMaterialId: string, language: 'en' | 'kn', revisionId?: string) {
    let localeRevision;

    if (revisionId) {
      localeRevision = await prisma.studyMaterialLocaleRevision.findUnique({
        where: { id: revisionId },
      });
    } else {
      const locale = await prisma.studyMaterialLocale.findFirst({
        where: { studyMaterialId, language },
        include: {
          revisions: {
            where: { isCurrentPublished: true },
            take: 1,
          },
        },
      });
      localeRevision = locale?.revisions[0];
    }

    if (!localeRevision || !localeRevision.contentJson) {
      return [];
    }

    // Ensure nodes carry stable IDs before generating outline
    const contentWithNodeIds = ensureStableNodeIds(localeRevision.contentJson);
    return extractPreviewOutline(contentWithNodeIds);
  }

  /**
   * Access-aware read service for Public Web, Student Web, Mobile, and Admin Simulator.
   */
  static async resolveAccessAndContent(params: {
    slugOrId: string;
    language: 'en' | 'kn';
    userId?: string | null;
    isStudent?: boolean;
    studentPreparationLanguage?: string | null;
    previewMode?: StudyMaterialAccessPreviewMode;
  }): Promise<{
    material: any;
    revision: any;
    accessResult: StudyMaterialAccessResult;
  }> {
    const { slugOrId, language, userId, isStudent, studentPreparationLanguage, previewMode } = params;

    // Student Preparation Language Enforcement
    if (isStudent && studentPreparationLanguage && studentPreparationLanguage !== language) {
      throw new AppError(
        `Your selected preparation language is ${studentPreparationLanguage.toUpperCase()}. You cannot access materials in ${language.toUpperCase()}.`,
        400,
        'STUDY_MATERIAL_LANGUAGE_ACCESS_INVALID'
      );
    }

    // Find Study Material by ID or Slug
    const locale = await prisma.studyMaterialLocale.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { studyMaterialId: slugOrId }],
        language,
      },
      include: {
        studyMaterial: {
          include: {
            accessPolicy: {
              include: {
                previewConfigs: true,
              },
            },
          },
        },
        revisions: {
          where: { isCurrentPublished: true },
          take: 1,
        },
      },
    });

    if (!locale || !locale.revisions[0]) {
      throw new AppError('Published Study Material not found', 404, 'STUDY_MATERIAL_NO_PUBLISHED_REVISION');
    }

    const studyMaterial = locale.studyMaterial;
    if (studyMaterial.recordStatus === 'ARCHIVED') {
      throw new AppError('Study Material is archived', 404, 'STUDY_MATERIAL_NO_PUBLISHED_REVISION');
    }

    const revision = locale.revisions[0];

    // Ensure content JSON nodes carry stable node IDs
    const safeContentJson = ensureStableNodeIds(revision.contentJson);

    const accessPolicy =
      studyMaterial.accessPolicy ||
      (await this.getAccessPolicy(studyMaterial.id));

    const entitlementKey = accessPolicy.entitlementKey;
    const accessType: StudyMaterialAccessType = accessPolicy.accessType;

    // Check user entitlement
    let isEntitled = false;
    if (previewMode === 'ENTITLED_USER' || previewMode === 'FULL_ADMIN_PREVIEW') {
      isEntitled = true;
    } else if (previewMode === 'ANONYMOUS_VISITOR' || previewMode === 'FREE_USER') {
      isEntitled = false;
    } else if (userId) {
      isEntitled = await currentEntitlementResolver.hasEntitlement(userId, entitlementKey);
    }

    const previewConfig = accessPolicy.previewConfigs?.find(
      (c: any) => c.language === language || c.localeRevisionId === revision.id
    );

    const paywallTitle = previewConfig?.paywallTitle || (language === 'kn' ? 'ಸಂಪೂರ್ಣ ವಿಷಯವನ್ನು ವೀಕ್ಷಿಸಿ' : 'Unlock Full Access');
    const paywallMessage =
      previewConfig?.paywallMessage ||
      (language === 'kn'
        ? 'ಈ ವಿಷಯದ ಸಂಪೂರ್ಣ ಭಾಗವನ್ನು ಓದಲು ಸೂಕ್ತ ಅಧ್ಯಯನ ಕರ್ನಾಟಕ ಪ್ರವೇಶವನ್ನು ಪಡೆಯಿರಿ.'
        : 'Full access requires an eligible Study Karnataka plan.');

    // 1. Completely FREE
    if (accessType === 'FREE') {
      return {
        material: studyMaterial,
        revision: {
          ...revision,
          contentJson: safeContentJson,
        },
        accessResult: {
          accessType: 'FREE',
          accessState: 'FREE_ACCESS',
          entitled: true,
          previewAvailable: false,
          contentAccess: 'FULL',
          entitlementRequired: false,
          fullContentJson: safeContentJson,
        },
      };
    }

    // 2. Entitled Access (PAID or FREEMIUM with active entitlement)
    if (isEntitled) {
      return {
        material: studyMaterial,
        revision: {
          ...revision,
          contentJson: safeContentJson,
        },
        accessResult: {
          accessType,
          accessState: 'FULL_ACCESS',
          entitled: true,
          previewAvailable: accessType === 'FREEMIUM',
          contentAccess: 'FULL',
          entitlementRequired: true,
          entitlementKey,
          fullContentJson: safeContentJson,
        },
      };
    }

    // 3. Completely PAID without entitlement -> LOCKED
    if (accessType === 'PAID') {
      return {
        material: studyMaterial,
        revision: {
          ...revision,
          contentJson: null, // BACKEND REMOVES PROTECTED CONTENT
          plainTextContent: null,
        },
        accessResult: {
          accessType: 'PAID',
          accessState: 'LOCKED',
          entitled: false,
          previewAvailable: false,
          contentAccess: 'SUMMARY_ONLY',
          entitlementRequired: true,
          entitlementKey,
          paywall: {
            title: paywallTitle,
            message: paywallMessage,
            entitlementKey,
            callToActionNotice: 'Full access requires an eligible Study Karnataka plan.',
          },
        },
      };
    }

    // 4. FREEMIUM without entitlement -> PREVIEW_ACCESS (Split content at previewEndNodeId)
    const splitResult = splitContentAtNodeBoundary(
      safeContentJson,
      previewConfig?.previewEndNodeId,
      previewConfig?.previewEndInclusive ?? true
    );

    return {
      material: studyMaterial,
      revision: {
        ...revision,
        contentJson: splitResult.freeContentJson, // ONLY FREE NODES RETURNED
        plainTextContent: null,
      },
      accessResult: {
        accessType: 'FREEMIUM',
        accessState: 'PREVIEW_ACCESS',
        entitled: false,
        previewAvailable: true,
        contentAccess: 'PREVIEW',
        entitlementRequired: true,
        entitlementKey,
        freeContentJson: splitResult.freeContentJson,
        paywall: {
          title: paywallTitle,
          message: paywallMessage,
          entitlementKey,
          callToActionNotice: 'Full access requires an eligible Study Karnataka plan.',
        },
      },
    };
  }
}

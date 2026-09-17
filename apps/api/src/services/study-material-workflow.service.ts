// @ts-nocheck
import { prisma } from '@study-karnataka/database';
import {
  StudyMaterialLocaleRevisionStatus,
  StudyMaterialReviewAction,
  BilingualContentStatus,
  ReviewQueueFilters,
  ReviewQueueItem,
} from '@study-karnataka/shared-types';
import { StudyMaterialError } from './study-material.service';
import { sanitizeTiptapJsonNode, extractPlainTextFromTiptapJson } from '../utils/sanitizer';

export class StudyMaterialWorkflowService {
  /**
   * Ensure a StudyMaterialLocale has a current DRAFT revision (Revision 1 initialized if needed)
   */
  static async ensureCurrentDraftRevision(localeId: string, adminUserId?: string): Promise<any> {
    const locale = await prisma.studyMaterialLocale.findUnique({
      where: { id: localeId },
      include: { revisions: { orderBy: { revisionNumber: 'desc' } } },
    });

    if (!locale) throw new StudyMaterialError('Locale record not found', 'STUDY_MATERIAL_REVISION_NOT_FOUND', 404);

    let currentDraft = locale.revisions.find((r) => r.isCurrentDraft);

    if (!currentDraft) {
      const nextRevNumber = locale.revisions.length > 0 ? locale.revisions[0].revisionNumber + 1 : 1;
      currentDraft = await prisma.studyMaterialLocaleRevision.create({
        data: {
          studyMaterialLocaleId: localeId,
          revisionNumber: nextRevNumber,
          title: locale.title,
          shortTitle: locale.shortTitle,
          slug: locale.slug,
          summary: locale.summary,
          contentJson: locale.contentJson ? (locale.contentJson as any) : undefined,
          plainTextContent: locale.plainTextContent,
          status: 'DRAFT',
          isCurrentDraft: true,
          isCurrentPublished: false,
          createdByAdminId: adminUserId,
          updatedByAdminId: adminUserId,
        },
      });
    }

    return currentDraft;
  }

  /**
   * Calculate Bilingual Content Status across English and Kannada locales
   */
  static calculateBilingualStatus(enRev?: any, knRev?: any): BilingualContentStatus {
    const enStatus = enRev?.status;
    const knStatus = knRev?.status;

    if (!enRev && !knRev) return 'NOT_STARTED';
    if (enRev && !knRev) return 'ENGLISH_ONLY';
    if (!enRev && knRev) return 'KANNADA_ONLY';

    if (enStatus === 'PUBLISHED' && knStatus === 'PUBLISHED') return 'BOTH_PUBLISHED';
    if (enStatus === 'PUBLISHED' || knStatus === 'PUBLISHED') return 'PARTIALLY_PUBLISHED';
    if (enStatus === 'APPROVED' && knStatus === 'APPROVED') return 'BOTH_APPROVED';
    if (
      enStatus === 'REVIEW_PENDING' ||
      knStatus === 'REVIEW_PENDING' ||
      enStatus === 'APPROVED' ||
      knStatus === 'APPROVED'
    ) {
      return 'PARTIALLY_REVIEWED';
    }

    return 'BOTH_DRAFT';
  }

  /**
   * Save / Autosave Revision with Content & SEO metadata
   */
  static async saveRevision(
    revisionId: string,
    payload: {
      title?: string;
      shortTitle?: string;
      slug?: string;
      summary?: string;
      contentJson?: any;
      plainTextContent?: string;
      metaTitle?: string;
      metaDescription?: string;
      socialTitle?: string;
      socialDescription?: string;
      canonicalUrl?: string;
      robotsIndex?: boolean;
      robotsFollow?: boolean;
      version?: number;
    },
    adminUserId: string,
    isAutosave: boolean = false
  ): Promise<any> {
    const existing = await prisma.studyMaterialLocaleRevision.findUnique({
      where: { id: revisionId },
      include: { studyMaterialLocale: true },
    });

    if (!existing) throw new StudyMaterialError('Revision not found', 'STUDY_MATERIAL_REVISION_NOT_FOUND', 404);

    // Editing allowed only in DRAFT or CHANGES_REQUESTED
    if (existing.status !== 'DRAFT' && existing.status !== 'CHANGES_REQUESTED') {
      throw new StudyMaterialError(
        `Revision in status '${existing.status}' is immutable and cannot be edited directly.`,
        'STUDY_MATERIAL_REVISION_IMMUTABLE',
        400
      );
    }

    // Optimistic concurrency check
    if (payload.version !== undefined && payload.version !== existing.version) {
      throw new StudyMaterialError('Revision was modified by another administrator.', 'STUDY_MATERIAL_REVISION_CONFLICT', 409);
    }

    // Sanitize content & extract plain text
    let sanitizedJson = existing.contentJson;
    let extractedText = existing.plainTextContent;

    if (payload.contentJson) {
      sanitizedJson = sanitizeTiptapJsonNode(payload.contentJson);
      extractedText = extractPlainTextFromTiptapJson(sanitizedJson);
    } else if (payload.plainTextContent !== undefined) {
      extractedText = payload.plainTextContent;
    }

    // Slug uniqueness check if changed
    if (payload.slug && payload.slug !== existing.slug) {
      const existingSlug = await prisma.studyMaterialLocale.findUnique({
        where: {
          language_slug: {
            language: existing.studyMaterialLocale.language,
            slug: payload.slug,
          },
        },
      });
      if (existingSlug && existingSlug.id !== existing.studyMaterialLocaleId) {
        throw new StudyMaterialError(`Slug '${payload.slug}' is already in use`, 'STUDY_MATERIAL_SLUG_CONFLICT', 409);
      }
    }

    const updated = await prisma.studyMaterialLocaleRevision.update({
      where: { id: revisionId },
      data: {
        title: payload.title !== undefined ? payload.title : existing.title,
        shortTitle: payload.shortTitle !== undefined ? payload.shortTitle : existing.shortTitle,
        slug: payload.slug !== undefined ? payload.slug : existing.slug,
        summary: payload.summary !== undefined ? payload.summary : existing.summary,
        contentJson: sanitizedJson ? (sanitizedJson as any) : undefined,
        plainTextContent: extractedText,
        metaTitle: payload.metaTitle !== undefined ? payload.metaTitle : existing.metaTitle,
        metaDescription: payload.metaDescription !== undefined ? payload.metaDescription : existing.metaDescription,
        socialTitle: payload.socialTitle !== undefined ? payload.socialTitle : existing.socialTitle,
        socialDescription: payload.socialDescription !== undefined ? payload.socialDescription : existing.socialDescription,
        canonicalUrl: payload.canonicalUrl !== undefined ? payload.canonicalUrl : existing.canonicalUrl,
        robotsIndex: payload.robotsIndex !== undefined ? payload.robotsIndex : existing.robotsIndex,
        robotsFollow: payload.robotsFollow !== undefined ? payload.robotsFollow : existing.robotsFollow,
        updatedByAdminId: adminUserId,
        version: { increment: 1 },
      },
    });

    // Update parent StudyMaterialLocale latest metadata
    await prisma.studyMaterialLocale.update({
      where: { id: existing.studyMaterialLocaleId },
      data: {
        title: updated.title,
        shortTitle: updated.shortTitle,
        slug: updated.slug,
        summary: updated.summary,
        contentJson: updated.contentJson ? (updated.contentJson as any) : undefined,
        plainTextContent: updated.plainTextContent,
        updatedByAdminId: adminUserId,
      },
    });

    // Audit log meaningful manual saves
    if (!isAutosave) {
      await prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: 'STUDY_MATERIAL_REVISION_SAVED',
          module: 'STUDY_MATERIAL',
          recordType: 'StudyMaterialLocaleRevision',
          recordId: revisionId,
          reason: `Updated revision ${existing.revisionNumber} for ${existing.studyMaterialLocale.language.toUpperCase()}`,
        },
      });
    }

    return updated;
  }

  /**
   * Submit Revision for Review (DRAFT / CHANGES_REQUESTED -> REVIEW_PENDING)
   */
  static async submitForReview(revisionId: string, adminUserId: string): Promise<any> {
    const revision = await prisma.studyMaterialLocaleRevision.findUnique({
      where: { id: revisionId },
      include: {
        studyMaterialLocale: {
          include: {
            studyMaterial: {
              include: { taxonomyMappings: true },
            },
          },
        },
      },
    });

    if (!revision) throw new StudyMaterialError('Revision not found', 'STUDY_MATERIAL_REVISION_NOT_FOUND', 404);

    if (revision.status !== 'DRAFT' && revision.status !== 'CHANGES_REQUESTED') {
      throw new StudyMaterialError(
        `Cannot submit revision in status '${revision.status}' for review.`,
        'STUDY_MATERIAL_INVALID_WORKFLOW_TRANSITION',
        400
      );
    }

    // Validation checks
    if (!revision.title.trim()) throw new StudyMaterialError('Title is required for review submission.', 'STUDY_MATERIAL_CONTENT_INCOMPLETE', 400);
    if (!revision.slug.trim()) throw new StudyMaterialError('URL Slug is required for review submission.', 'STUDY_MATERIAL_CONTENT_INCOMPLETE', 400);

    const isResubmission = revision.status === 'CHANGES_REQUESTED';
    const newStatus = 'REVIEW_PENDING';

    const updated = await prisma.studyMaterialLocaleRevision.update({
      where: { id: revisionId },
      data: {
        status: newStatus,
        reviewSubmittedAt: new Date(),
        updatedByAdminId: adminUserId,
      },
    });

    // Create Review Event
    await prisma.studyMaterialReviewEvent.create({
      data: {
        localeRevisionId: revisionId,
        action: isResubmission ? 'RESUBMITTED' : 'SUBMITTED',
        adminUserId,
      },
    });

    // Audit log
    await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action: isResubmission ? 'STUDY_MATERIAL_REVIEW_RESUBMITTED' : 'STUDY_MATERIAL_REVIEW_SUBMITTED',
        module: 'STUDY_MATERIAL',
        recordType: 'StudyMaterialLocaleRevision',
        recordId: revisionId,
      },
    });

    return updated;
  }

  /**
   * Request Changes (REVIEW_PENDING -> CHANGES_REQUESTED)
   */
  static async requestChanges(revisionId: string, comment: string, adminUserId: string): Promise<any> {
    if (!comment || !comment.trim()) {
      throw new StudyMaterialError('Reason/Comment is required when requesting changes.', 'STUDY_MATERIAL_REVIEW_COMMENT_REQUIRED', 400);
    }

    const revision = await prisma.studyMaterialLocaleRevision.findUnique({ where: { id: revisionId } });
    if (!revision) throw new StudyMaterialError('Revision not found', 'STUDY_MATERIAL_REVISION_NOT_FOUND', 404);

    if (revision.status !== 'REVIEW_PENDING') {
      throw new StudyMaterialError(`Cannot request changes on revision in status '${revision.status}'.`, 'STUDY_MATERIAL_INVALID_WORKFLOW_TRANSITION', 400);
    }

    const updated = await prisma.studyMaterialLocaleRevision.update({
      where: { id: revisionId },
      data: {
        status: 'CHANGES_REQUESTED',
        reviewedAt: new Date(),
        reviewedByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
      },
    });

    await prisma.studyMaterialReviewEvent.create({
      data: {
        localeRevisionId: revisionId,
        action: 'CHANGES_REQUESTED',
        comment: comment.trim(),
        adminUserId,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action: 'STUDY_MATERIAL_CHANGES_REQUESTED',
        module: 'STUDY_MATERIAL',
        recordType: 'StudyMaterialLocaleRevision',
        recordId: revisionId,
        reason: comment.trim(),
      },
    });

    return updated;
  }

  /**
   * Approve Revision (REVIEW_PENDING -> APPROVED)
   */
  static async approveRevision(revisionId: string, comment: string | undefined, adminUserId: string): Promise<any> {
    const revision = await prisma.studyMaterialLocaleRevision.findUnique({ where: { id: revisionId } });
    if (!revision) throw new StudyMaterialError('Revision not found', 'STUDY_MATERIAL_REVISION_NOT_FOUND', 404);

    if (revision.status !== 'REVIEW_PENDING') {
      throw new StudyMaterialError(`Cannot approve revision in status '${revision.status}'.`, 'STUDY_MATERIAL_INVALID_WORKFLOW_TRANSITION', 400);
    }

    const updated = await prisma.studyMaterialLocaleRevision.update({
      where: { id: revisionId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedByAdminId: adminUserId,
        reviewedAt: new Date(),
        reviewedByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
      },
    });

    await prisma.studyMaterialReviewEvent.create({
      data: {
        localeRevisionId: revisionId,
        action: 'APPROVED',
        comment: comment?.trim() || undefined,
        adminUserId,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action: 'STUDY_MATERIAL_APPROVED',
        module: 'STUDY_MATERIAL',
        recordType: 'StudyMaterialLocaleRevision',
        recordId: revisionId,
        reason: comment?.trim(),
      },
    });

    return updated;
  }

  /**
   * Publish Revision (APPROVED -> PUBLISHED)
   */
  static async publishRevision(revisionId: string, adminUserId: string): Promise<any> {
    const revision = await prisma.studyMaterialLocaleRevision.findUnique({
      where: { id: revisionId },
      include: { studyMaterialLocale: true },
    });
    if (!revision) throw new StudyMaterialError('Revision not found', 'STUDY_MATERIAL_REVISION_NOT_FOUND', 404);

    if (revision.status !== 'APPROVED') {
      // Auto-approve if in DRAFT, REVIEW_PENDING or CHANGES_REQUESTED for direct publication
      if (['DRAFT', 'REVIEW_PENDING', 'CHANGES_REQUESTED'].includes(revision.status)) {
        await prisma.studyMaterialLocaleRevision.update({
          where: { id: revisionId },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedByAdminId: adminUserId,
            reviewedAt: new Date(),
            reviewedByAdminId: adminUserId,
            updatedByAdminId: adminUserId,
          },
        });
        await prisma.studyMaterialReviewEvent.create({
          data: {
            localeRevisionId: revisionId,
            action: 'APPROVED',
            comment: 'Direct publish approval',
            adminUserId,
          },
        });
      } else {
        throw new StudyMaterialError(`Cannot publish revision in status '${revision.status}'.`, 'STUDY_MATERIAL_NOT_APPROVED', 400);
      }
    }

    // Run publication transactionally
    const published = await prisma.$transaction(async (tx) => {
      // Archive previous published revision for this locale
      await tx.studyMaterialLocaleRevision.updateMany({
        where: {
          studyMaterialLocaleId: revision.studyMaterialLocaleId,
          isCurrentPublished: true,
        },
        data: {
          isCurrentPublished: false,
          status: 'ARCHIVED',
          archivedAt: new Date(),
        },
      });

      // Promote target revision to PUBLISHED
      const pub = await tx.studyMaterialLocaleRevision.update({
        where: { id: revisionId },
        data: {
          status: 'PUBLISHED',
          isCurrentPublished: true,
          isCurrentDraft: false,
          publishedAt: new Date(),
          publishedByAdminId: adminUserId,
          updatedByAdminId: adminUserId,
        },
      });

      // Record Review Event
      await tx.studyMaterialReviewEvent.create({
        data: {
          localeRevisionId: revisionId,
          action: 'PUBLISHED',
          adminUserId,
        },
      });

      return pub;
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action: 'STUDY_MATERIAL_PUBLISHED',
        module: 'STUDY_MATERIAL',
        recordType: 'StudyMaterialLocaleRevision',
        recordId: revisionId,
      },
    });

    return published;
  }

  /**
   * Clone Published Revision into a New DRAFT Revision
   */
  static async cloneNewRevision(publishedRevisionId: string, adminUserId: string): Promise<any> {
    const pubRev = await prisma.studyMaterialLocaleRevision.findUnique({
      where: { id: publishedRevisionId },
      include: { studyMaterialLocale: true },
    });
    if (!pubRev) throw new StudyMaterialError('Published revision not found', 'STUDY_MATERIAL_REVISION_NOT_FOUND', 404);

    if (pubRev.status !== 'PUBLISHED' && pubRev.status !== 'APPROVED') {
      throw new StudyMaterialError('New revision can only be cloned from a PUBLISHED or APPROVED revision.', 'STUDY_MATERIAL_INVALID_WORKFLOW_TRANSITION', 400);
    }

    // Check if a current draft already exists
    const currentDraft = await prisma.studyMaterialLocaleRevision.findFirst({
      where: {
        studyMaterialLocaleId: pubRev.studyMaterialLocaleId,
        isCurrentDraft: true,
        status: { in: ['DRAFT', 'CHANGES_REQUESTED', 'REVIEW_PENDING'] },
      },
    });

    if (currentDraft) {
      return currentDraft; // Return existing active draft
    }

    const latestRevs = await prisma.studyMaterialLocaleRevision.findMany({
      where: { studyMaterialLocaleId: pubRev.studyMaterialLocaleId },
      orderBy: { revisionNumber: 'desc' },
      take: 1,
    });
    const nextRevNum = (latestRevs[0]?.revisionNumber || 1) + 1;

    const newDraft = await prisma.studyMaterialLocaleRevision.create({
      data: {
        studyMaterialLocaleId: pubRev.studyMaterialLocaleId,
        revisionNumber: nextRevNum,
        sourceRevisionId: pubRev.id,
        title: pubRev.title,
        shortTitle: pubRev.shortTitle,
        slug: pubRev.slug,
        summary: pubRev.summary,
        contentJson: pubRev.contentJson ? (pubRev.contentJson as any) : undefined,
        plainTextContent: pubRev.plainTextContent,
        metaTitle: pubRev.metaTitle,
        metaDescription: pubRev.metaDescription,
        socialTitle: pubRev.socialTitle,
        socialDescription: pubRev.socialDescription,
        canonicalUrl: pubRev.canonicalUrl,
        robotsIndex: pubRev.robotsIndex,
        robotsFollow: pubRev.robotsFollow,
        status: 'DRAFT',
        isCurrentDraft: true,
        isCurrentPublished: false,
        createdByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action: 'STUDY_MATERIAL_REVISION_CLONED',
        module: 'STUDY_MATERIAL',
        recordType: 'StudyMaterialLocaleRevision',
        recordId: newDraft.id,
        reason: `Cloned from revision ${pubRev.revisionNumber}`,
      },
    });

    return newDraft;
  }

  /**
   * Get Review Queue List with filters
   */
  static async getReviewQueue(filters: ReviewQueueFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.pageSize) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.tab === 'awaiting_review') {
      where.status = 'REVIEW_PENDING';
    } else if (filters.tab === 'changes_requested') {
      where.status = 'CHANGES_REQUESTED';
    } else if (filters.tab === 'approved') {
      where.status = 'APPROVED';
    } else if (filters.tab === 'recently_published') {
      where.status = 'PUBLISHED';
    } else if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = { in: ['REVIEW_PENDING', 'CHANGES_REQUESTED', 'APPROVED'] };
    }

    if (filters.language) {
      where.studyMaterialLocale = { language: filters.language };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
        { studyMaterialLocale: { studyMaterial: { code: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    const [total, revisions] = await Promise.all([
      prisma.studyMaterialLocaleRevision.count({ where }),
      prisma.studyMaterialLocaleRevision.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          studyMaterialLocale: {
            include: {
              studyMaterial: {
                include: {
                  taxonomyMappings: {
                    include: {
                      category: true,
                      subcategory: true,
                      topic: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const items: ReviewQueueItem[] = revisions.map((rev) => {
      const sm = rev.studyMaterialLocale.studyMaterial;
      const primaryMap = sm.taxonomyMappings.find((m) => m.isPrimary) || sm.taxonomyMappings[0];
      let taxonomyPath = 'Unassigned';
      if (primaryMap && primaryMap.category) {
        const rawSegments = [
          primaryMap.category.nameEn,
          primaryMap.subcategory?.nameEn,
          primaryMap.topic?.nameEn,
        ].filter(Boolean) as string[];
        const dedupedSegments = rawSegments.filter((seg, idx, arr) => idx === 0 || seg.trim().toLowerCase() !== arr[idx - 1].trim().toLowerCase());
        taxonomyPath = dedupedSegments.join(' > ') || 'Unassigned';
      }

      return {
        revisionId: rev.id,
        studyMaterialId: sm.id,
        code: sm.code,
        language: rev.studyMaterialLocale.language as 'en' | 'kn',
        title: rev.title,
        slug: rev.slug,
        contentType: sm.contentType,
        primaryTaxonomyPath: taxonomyPath,
        submittedBy: rev.createdByAdminId || 'System Admin',
        submittedAt: rev.reviewSubmittedAt || rev.createdAt,
        lastUpdated: rev.updatedAt,
        revisionNumber: rev.revisionNumber,
        status: rev.status,
      };
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

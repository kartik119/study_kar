import { prisma } from '@study-karnataka/database';
import {
  StudyMaterialListItem,
  StudyMaterialDetail,
  StudyMaterialFilters,
} from '@study-karnataka/shared-types';
import {
  evaluateStudyMaterialFoundationReadiness,
  toUpperSnakeCase,
  createStudyMaterialSchema,
  updateStudyMaterialSchema,
  saveStudyMaterialLocaleSchema,
  createTaxonomyMappingSchema,
} from '@study-karnataka/validation';

import { StudyMaterialWorkflowService } from './study-material-workflow.service';

export class StudyMaterialError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'StudyMaterialError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

async function createAuditLog(params: {
  adminUserId?: string;
  action: string;
  recordType: string;
  recordId: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  if (!params.adminUserId) return;
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: params.adminUserId,
        action: params.action,
        module: 'STUDY_MATERIAL',
        recordType: params.recordType,
        recordId: params.recordId,
        previousValue: params.previousValue ? (params.previousValue as any) : undefined,
        newValue: params.newValue ? (params.newValue as any) : undefined,
        reason: params.reason,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    console.error('Failed to create audit log for study material action:', err);
  }
}

export class StudyMaterialService {
  static async getStudyMaterials(filters?: StudyMaterialFilters) {
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.pageSize) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (!filters?.includeArchived) {
      where.recordStatus = 'ACTIVE';
    } else if (filters?.recordStatus) {
      where.recordStatus = filters.recordStatus;
    }

    if (filters?.contentType) {
      where.contentType = filters.contentType;
    }

    if (filters?.code) {
      where.code = { contains: filters.code, mode: 'insensitive' };
    }

    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { locales: { some: { title: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    if (filters?.categoryId || filters?.subcategoryId || filters?.topicId || filters?.knowledgeAreaId) {
      const mappingWhere: any = {};
      if (filters.categoryId) mappingWhere.categoryId = filters.categoryId;
      if (filters.subcategoryId) mappingWhere.subcategoryId = filters.subcategoryId;
      if (filters.topicId) mappingWhere.topicId = filters.topicId;
      if (filters.knowledgeAreaId) mappingWhere.knowledgeAreaId = filters.knowledgeAreaId;
      where.taxonomyMappings = { some: mappingWhere };
    }

    const [total, items] = await Promise.all([
      prisma.studyMaterial.count({ where }),
      prisma.studyMaterial.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          locales: {
            include: {
              revisions: { orderBy: { revisionNumber: 'desc' } },
            },
          },
          taxonomyMappings: {
            include: {
              category: { select: { nameEn: true, nameKn: true } },
              subcategory: { select: { nameEn: true, nameKn: true } },
              topic: { select: { nameEn: true, nameKn: true } },
              knowledgeArea: { select: { nameEn: true, nameKn: true } },
            },
          },
        },
      }),
    ]);

    const { StudyMaterialWorkflowService } = await import('./study-material-workflow.service');

    const formattedItems: StudyMaterialListItem[] = items.map((sm) => {
      const enLocale = sm.locales.find((l) => l.language === 'en');
      const knLocale = sm.locales.find((l) => l.language === 'kn');

      const enRev = enLocale?.revisions.find((r) => r.isCurrentDraft) || enLocale?.revisions[0] || null;
      const knRev = knLocale?.revisions.find((r) => r.isCurrentDraft) || knLocale?.revisions[0] || null;

      const readinessEval = evaluateStudyMaterialFoundationReadiness(sm, sm.locales, sm.taxonomyMappings);
      const bilingualStatus = StudyMaterialWorkflowService.calculateBilingualStatus(enRev, knRev);

      const primaryMap = sm.taxonomyMappings.find((m) => m.isPrimary) || sm.taxonomyMappings[0];
      let primaryPath = 'Unmapped';
      if (primaryMap && primaryMap.category) {
        const rawSegments = [
          primaryMap.category.nameEn,
          primaryMap.subcategory?.nameEn,
          primaryMap.topic?.nameEn,
          primaryMap.knowledgeArea?.nameEn,
        ].filter(Boolean) as string[];

        // Deduplicate consecutive identical segments (e.g. Subcategory name matching Topic name)
        const dedupedSegments = rawSegments.filter((seg, idx, arr) => idx === 0 || seg.trim().toLowerCase() !== arr[idx - 1].trim().toLowerCase());
        primaryPath = dedupedSegments.join(' > ') || 'Unmapped';
      }

      // SEO status calculation
      const seoStatusEn = !enRev ? 'MISSING' : enRev.metaTitle && enRev.metaDescription ? 'GOOD' : 'NEEDS_ATTENTION';
      const seoStatusKn = !knRev ? 'MISSING' : knRev.metaTitle && knRev.metaDescription ? 'GOOD' : 'NEEDS_ATTENTION';

      return {
        id: sm.id,
        code: sm.code,
        logoUrl: sm.logoUrl || null,
        contentType: sm.contentType,
        recordStatus: sm.recordStatus,
        titleEn: enRev?.title || enLocale?.title || null,
        titleKn: knRev?.title || knLocale?.title || null,
        slugEn: enRev?.slug || enLocale?.slug || null,
        slugKn: knRev?.slug || knLocale?.slug || null,
        statusEn: (enRev?.status as any) || null,
        statusKn: (knRev?.status as any) || null,
        seoStatusEn,
        seoStatusKn,
        hasEnglishLocale: Boolean(enLocale),
        hasKannadaLocale: Boolean(knLocale),
        englishRevisionId: enRev?.id || null,
        kannadaRevisionId: knRev?.id || null,
        englishLocaleId: enLocale?.id || null,
        kannadaLocaleId: knLocale?.id || null,
        foundationReadiness: readinessEval.foundationReadiness,
        bilingualStatus,
        primaryTaxonomyPath: primaryPath,
        updatedAt: sm.updatedAt,
      };
    });

    // Language / readiness client-side filters if specified
    let finalItems = formattedItems;
    if (filters?.hasEnglishLocale !== undefined) {
      finalItems = finalItems.filter((i) => i.hasEnglishLocale === filters.hasEnglishLocale);
    }
    if (filters?.hasKannadaLocale !== undefined) {
      finalItems = finalItems.filter((i) => i.hasKannadaLocale === filters.hasKannadaLocale);
    }
    if (filters?.foundationReadiness) {
      finalItems = finalItems.filter((i) => i.foundationReadiness === filters.foundationReadiness);
    }

    return {
      items: finalItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getStudyMaterialById(id: string): Promise<StudyMaterialDetail> {
    const sm = await prisma.studyMaterial.findUnique({
      where: { id },
      include: {
        locales: {
          include: {
            revisions: {
              orderBy: { revisionNumber: 'desc' },
            },
          },
        },
        taxonomyMappings: {
          include: {
            category: true,
            subcategory: true,
            topic: true,
            knowledgeArea: true,
          },
        },
      },
    });

    if (!sm) throw new StudyMaterialError('Study Material not found', 'STUDY_MATERIAL_NOT_FOUND', 404);

    let enLocale = sm.locales.find((l) => l.language === 'en') || null;
    let knLocale = sm.locales.find((l) => l.language === 'kn') || null;

    const { StudyMaterialWorkflowService } = await import('./study-material-workflow.service');

    // Ensure DRAFT revisions exist for English and Kannada if locale records exist
    if (enLocale) {
      await StudyMaterialWorkflowService.ensureCurrentDraftRevision(enLocale.id);
    }
    if (knLocale) {
      await StudyMaterialWorkflowService.ensureCurrentDraftRevision(knLocale.id);
    }

    // Re-fetch sm with updated revisions if needed
    const refetched = await prisma.studyMaterial.findUnique({
      where: { id },
      include: {
        locales: {
          include: {
            revisions: {
              orderBy: { revisionNumber: 'desc' },
            },
          },
        },
        taxonomyMappings: {
          include: {
            category: true,
            subcategory: true,
            topic: true,
            knowledgeArea: true,
          },
        },
      },
    });

    const targetSm = refetched || sm;
    enLocale = targetSm.locales.find((l) => l.language === 'en') || null;
    knLocale = targetSm.locales.find((l) => l.language === 'kn') || null;

    const enRev = enLocale?.revisions.find((r) => r.isCurrentDraft) || enLocale?.revisions[0] || null;
    const knRev = knLocale?.revisions.find((r) => r.isCurrentDraft) || knLocale?.revisions[0] || null;

    const primaryMapping = targetSm.taxonomyMappings.find((m) => m.isPrimary) || targetSm.taxonomyMappings[0] || null;
    const readinessEval = evaluateStudyMaterialFoundationReadiness(targetSm, targetSm.locales, targetSm.taxonomyMappings);
    const bilingualStatus = StudyMaterialWorkflowService.calculateBilingualStatus(enRev, knRev);

    // Fetch Audit logs for this study material
    const auditLogs = await prisma.adminAuditLog.findMany({
      where: { module: 'STUDY_MATERIAL', recordId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      ...targetSm,
      englishLocale: enLocale,
      kannadaLocale: knLocale,
      englishRevision: enRev,
      kannadaRevision: knRev,
      primaryMapping,
      hasEnglishLocale: Boolean(enLocale),
      hasKannadaLocale: Boolean(knLocale),
      foundationReadiness: readinessEval.foundationReadiness,
      bilingualStatus,
      readinessDetails: {
        ...readinessEval,
        bilingualStatus,
      },
      auditLogs: auditLogs as any,
    } as any;
  }

  static async generateNextStudyMaterialCode(tx?: any): Promise<string> {
    const db = tx || prisma;
    const highestRecord = await db.studyMaterial.findFirst({
      where: { code: { startsWith: 'SM_' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let nextNumber = 1;
    if (highestRecord && highestRecord.code) {
      const match = highestRecord.code.match(/^SM_(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      } else {
        const count = await db.studyMaterial.count();
        nextNumber = count + 1;
      }
    } else {
      const count = await db.studyMaterial.count();
      if (count > 0) nextNumber = count + 1;
    }

    const padded = String(nextNumber).padStart(6, '0');
    return `SM_${padded}`;
  }

  static async createStudyMaterial(payload: any, adminUserId: string): Promise<StudyMaterialDetail> {
    const parsed = createStudyMaterialSchema.parse(payload);

    let finalCode = parsed.code || undefined;
    let sm;
    let attempts = 0;

    while (!sm && attempts < 10) {
      attempts++;
      if (!finalCode) {
        finalCode = await StudyMaterialService.generateNextStudyMaterialCode();
      }

      try {
        sm = await prisma.studyMaterial.create({
          data: {
            code: finalCode,
            contentType: parsed.contentType,
            logoUrl: (parsed as any).logoUrl || null,
            createdByAdminId: adminUserId,
            updatedByAdminId: adminUserId,
          },
        });
      } catch (err: any) {
        if (err.code === 'P2002' && (!parsed.code || attempts > 1)) {
          finalCode = undefined;
          continue;
        }
        if (err.code === 'P2002') {
          throw new StudyMaterialError(`Study Material code '${finalCode}' already exists`, 'STUDY_MATERIAL_CODE_EXISTS', 409);
        }
        throw err;
      }
    }

    if (!sm) {
      throw new StudyMaterialError('Failed to generate unique Study Material code', 'CODE_GENERATION_FAILED', 500);
    }

    // Optional Initial English Locale
    if (parsed.initialEnglishLocale) {
      const slug = parsed.initialEnglishLocale.slug || parsed.initialEnglishLocale.title.toLowerCase().replace(/[\s_]+/g, '-');
      const existingSlug = await prisma.studyMaterialLocale.findUnique({
        where: { language_slug: { language: 'en', slug } },
      });
      if (!existingSlug) {
        const loc = await prisma.studyMaterialLocale.create({
          data: {
            studyMaterialId: sm.id,
            language: 'en',
            title: parsed.initialEnglishLocale.title,
            shortTitle: parsed.initialEnglishLocale.shortTitle,
            slug,
            summary: parsed.initialEnglishLocale.summary,
            createdByAdminId: adminUserId,
            updatedByAdminId: adminUserId,
          },
        });
        await StudyMaterialWorkflowService.ensureCurrentDraftRevision(loc.id, adminUserId);
      }
    }

    // Optional Initial Kannada Locale
    if (parsed.initialKannadaLocale) {
      const slug = parsed.initialKannadaLocale.slug || parsed.initialKannadaLocale.title.toLowerCase().replace(/[\s_]+/g, '-');
      const existingSlug = await prisma.studyMaterialLocale.findUnique({
        where: { language_slug: { language: 'kn', slug } },
      });
      if (!existingSlug) {
        const loc = await prisma.studyMaterialLocale.create({
          data: {
            studyMaterialId: sm.id,
            language: 'kn',
            title: parsed.initialKannadaLocale.title,
            shortTitle: parsed.initialKannadaLocale.shortTitle,
            slug,
            summary: parsed.initialKannadaLocale.summary,
            createdByAdminId: adminUserId,
            updatedByAdminId: adminUserId,
          },
        });
        await StudyMaterialWorkflowService.ensureCurrentDraftRevision(loc.id, adminUserId);
      }
    }

    // Optional Initial Taxonomy Mapping
    if (parsed.taxonomyMapping) {
      await this.addTaxonomyMapping(sm.id, parsed.taxonomyMapping, adminUserId);
    }



    await createAuditLog({
      adminUserId,
      action: 'STUDY_MATERIAL_CREATED',
      recordType: 'StudyMaterial',
      recordId: sm.id,
      newValue: sm,
    });

    return this.getStudyMaterialById(sm.id);
  }

  static async updateStudyMaterial(id: string, payload: any, adminUserId: string): Promise<StudyMaterialDetail> {
    const existing = await prisma.studyMaterial.findUnique({ where: { id } });
    if (!existing) throw new StudyMaterialError('Study Material not found', 'STUDY_MATERIAL_NOT_FOUND', 404);

    const parsed = updateStudyMaterialSchema.parse(payload);

    if (parsed.version !== undefined && parsed.version !== existing.version) {
      throw new StudyMaterialError('Optimistic concurrency conflict.', 'STUDY_MATERIAL_VERSION_CONFLICT', 409);
    }

    if (parsed.code && parsed.code !== existing.code) {
      throw new StudyMaterialError('Study Material system code is immutable and cannot be modified', 'STUDY_MATERIAL_CODE_IMMUTABLE', 400);
    }

    const { academicStageIds, ...dataToUpdate } = parsed;

    const updated = await prisma.studyMaterial.update({
      where: { id },
      data: {
        ...dataToUpdate,
        updatedByAdminId: adminUserId,
        version: { increment: 1 },
      },
    });



    await createAuditLog({
      adminUserId,
      action: 'STUDY_MATERIAL_UPDATED',
      recordType: 'StudyMaterial',
      recordId: id,
      previousValue: existing,
      newValue: updated,
    });

    return this.getStudyMaterialById(id);
  }

  static async saveLocale(studyMaterialId: string, language: 'en' | 'kn', payload: any, adminUserId: string) {
    const sm = await prisma.studyMaterial.findUnique({ where: { id: studyMaterialId } });
    if (!sm) throw new StudyMaterialError('Study Material not found', 'STUDY_MATERIAL_NOT_FOUND', 404);

    const parsed = saveStudyMaterialLocaleSchema.parse(payload);

    // Slug uniqueness check for this language
    const existingSlug = await prisma.studyMaterialLocale.findUnique({
      where: { language_slug: { language, slug: parsed.slug } },
    });
    if (existingSlug && existingSlug.studyMaterialId !== studyMaterialId) {
      throw new StudyMaterialError(`Slug '${parsed.slug}' is already in use by another ${language === 'en' ? 'English' : 'Kannada'} content locale`, 'STUDY_MATERIAL_SLUG_EXISTS', 409);
    }

    const existingLocale = await prisma.studyMaterialLocale.findUnique({
      where: { studyMaterialId_language: { studyMaterialId, language } },
    });

    let locale;
    if (existingLocale) {
      locale = await prisma.studyMaterialLocale.update({
        where: { id: existingLocale.id },
        data: {
          ...parsed,
          updatedByAdminId: adminUserId,
          version: { increment: 1 },
        },
      });
      await createAuditLog({
        adminUserId,
        action: `STUDY_MATERIAL_LOCALE_UPDATED_${language.toUpperCase()}`,
        recordType: 'StudyMaterialLocale',
        recordId: locale.id,
        previousValue: existingLocale,
        newValue: locale,
      });
    } else {
      locale = await prisma.studyMaterialLocale.create({
        data: {
          studyMaterialId,
          language,
          ...parsed,
          createdByAdminId: adminUserId,
          updatedByAdminId: adminUserId,
        },
      });
      await createAuditLog({
        adminUserId,
        action: `STUDY_MATERIAL_LOCALE_CREATED_${language.toUpperCase()}`,
        recordType: 'StudyMaterialLocale',
        recordId: locale.id,
        newValue: locale,
      });
    }

    // Touch study material updatedAt
    await prisma.studyMaterial.update({
      where: { id: studyMaterialId },
      data: { updatedByAdminId: adminUserId },
    });

    return this.getStudyMaterialById(studyMaterialId);
  }

  static async addTaxonomyMapping(studyMaterialId: string, payload: any, adminUserId: string) {
    const sm = await prisma.studyMaterial.findUnique({ where: { id: studyMaterialId } });
    if (!sm) throw new StudyMaterialError('Study Material not found', 'STUDY_MATERIAL_NOT_FOUND', 404);

    const parsed = createTaxonomyMappingSchema.parse(payload);

    // Validate path consistency
    const subcategory = await prisma.academicSubcategory.findUnique({ where: { id: parsed.subcategoryId } });
    if (!subcategory || subcategory.categoryId !== parsed.categoryId) {
      throw new StudyMaterialError('Selected Subcategory does not belong to selected Category', 'STUDY_MATERIAL_TAXONOMY_PATH_INVALID', 400);
    }

    const topic = await prisma.academicTopic.findUnique({ where: { id: parsed.topicId } });
    if (!topic || topic.subcategoryId !== parsed.subcategoryId) {
      throw new StudyMaterialError('Selected Topic does not belong to selected Subcategory', 'STUDY_MATERIAL_TAXONOMY_PATH_INVALID', 400);
    }

    if (parsed.knowledgeAreaId) {
      const ka = await prisma.academicKnowledgeArea.findUnique({ where: { id: parsed.knowledgeAreaId } });
      if (!ka || ka.topicId !== parsed.topicId) {
        throw new StudyMaterialError('Selected Knowledge Area does not belong to selected Topic', 'STUDY_MATERIAL_TAXONOMY_PATH_INVALID', 400);
      }
    }

    const existingMappings = await prisma.studyMaterialTaxonomyMapping.findMany({ where: { studyMaterialId } });
    const isFirst = existingMappings.length === 0;
    const shouldBePrimary = isFirst || Boolean(parsed.isPrimary);

    if (shouldBePrimary && existingMappings.length > 0) {
      // Clear previous primary
      await prisma.studyMaterialTaxonomyMapping.updateMany({
        where: { studyMaterialId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await prisma.studyMaterialTaxonomyMapping.create({
      data: {
        studyMaterialId,
        categoryId: parsed.categoryId,
        subcategoryId: parsed.subcategoryId,
        topicId: parsed.topicId,
        knowledgeAreaId: parsed.knowledgeAreaId || null,
        isPrimary: shouldBePrimary,
        createdByAdminId: adminUserId,
      },
    });

    await createAuditLog({
      adminUserId,
      action: 'STUDY_MATERIAL_TAXONOMY_MAPPING_ADDED',
      recordType: 'StudyMaterialTaxonomyMapping',
      recordId: created.id,
      newValue: created,
    });

    return this.getStudyMaterialById(studyMaterialId);
  }

  static async deleteTaxonomyMapping(studyMaterialId: string, mappingId: string, adminUserId: string) {
    const mapping = await prisma.studyMaterialTaxonomyMapping.findUnique({ where: { id: mappingId } });
    if (!mapping || mapping.studyMaterialId !== studyMaterialId) {
      throw new StudyMaterialError('Taxonomy Mapping not found for this Study Material', 'STUDY_MATERIAL_MAPPING_NOT_FOUND', 404);
    }

    await prisma.studyMaterialTaxonomyMapping.delete({ where: { id: mappingId } });

    // If deleted mapping was primary, promote remaining mapping to primary
    if (mapping.isPrimary) {
      const remaining = await prisma.studyMaterialTaxonomyMapping.findFirst({ where: { studyMaterialId } });
      if (remaining) {
        await prisma.studyMaterialTaxonomyMapping.update({
          where: { id: remaining.id },
          data: { isPrimary: true },
        });
      }
    }

    await createAuditLog({
      adminUserId,
      action: 'STUDY_MATERIAL_TAXONOMY_MAPPING_REMOVED',
      recordType: 'StudyMaterialTaxonomyMapping',
      recordId: mappingId,
      previousValue: mapping,
    });

    return this.getStudyMaterialById(studyMaterialId);
  }

  static async makePrimaryTaxonomyMapping(studyMaterialId: string, mappingId: string, adminUserId: string) {
    const mapping = await prisma.studyMaterialTaxonomyMapping.findUnique({ where: { id: mappingId } });
    if (!mapping || mapping.studyMaterialId !== studyMaterialId) {
      throw new StudyMaterialError('Taxonomy Mapping not found', 'STUDY_MATERIAL_MAPPING_NOT_FOUND', 404);
    }

    await prisma.$transaction([
      prisma.studyMaterialTaxonomyMapping.updateMany({
        where: { studyMaterialId },
        data: { isPrimary: false },
      }),
      prisma.studyMaterialTaxonomyMapping.update({
        where: { id: mappingId },
        data: { isPrimary: true },
      }),
    ]);

    await createAuditLog({
      adminUserId,
      action: 'STUDY_MATERIAL_PRIMARY_MAPPING_CHANGED',
      recordType: 'StudyMaterialTaxonomyMapping',
      recordId: mappingId,
    });

    return this.getStudyMaterialById(studyMaterialId);
  }

  static async archiveStudyMaterial(id: string, adminUserId: string) {
    const sm = await prisma.studyMaterial.findUnique({ where: { id } });
    if (!sm) throw new StudyMaterialError('Study Material not found', 'STUDY_MATERIAL_NOT_FOUND', 404);

    const updated = await prisma.studyMaterial.update({
      where: { id },
      data: {
        recordStatus: 'ARCHIVED',
        archivedAt: new Date(),
        archivedByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
        version: { increment: 1 },
      },
    });

    await createAuditLog({
      adminUserId,
      action: 'STUDY_MATERIAL_ARCHIVED',
      recordType: 'StudyMaterial',
      recordId: id,
      previousValue: sm,
      newValue: updated,
    });

    return this.getStudyMaterialById(id);
  }

  static async restoreStudyMaterial(id: string, adminUserId: string) {
    const sm = await prisma.studyMaterial.findUnique({ where: { id } });
    if (!sm) throw new StudyMaterialError('Study Material not found', 'STUDY_MATERIAL_NOT_FOUND', 404);

    const updated = await prisma.studyMaterial.update({
      where: { id },
      data: {
        recordStatus: 'ACTIVE',
        archivedAt: null,
        archivedByAdminId: null,
        updatedByAdminId: adminUserId,
        version: { increment: 1 },
      },
    });

    await createAuditLog({
      adminUserId,
      action: 'STUDY_MATERIAL_RESTORED',
      recordType: 'StudyMaterial',
      recordId: id,
      previousValue: sm,
      newValue: updated,
    });

    return this.getStudyMaterialById(id);
  }

  static async deleteDraftStudyMaterial(id: string, adminUserId: string) {
    const sm = await prisma.studyMaterial.findUnique({
      where: { id },
      include: { locales: true },
    });
    if (!sm) throw new StudyMaterialError('Study Material not found', 'STUDY_MATERIAL_NOT_FOUND', 404);

    // Permitted only if both locales are DRAFT or absent
    const nonDraftLocales = sm.locales.filter((l) => l.localeStatus !== 'DRAFT');
    if (nonDraftLocales.length > 0) {
      throw new StudyMaterialError('Cannot delete Study Material with non-Draft locales', 'STUDY_MATERIAL_DELETE_NOT_ALLOWED', 400);
    }

    await prisma.studyMaterial.delete({ where: { id } });

    await createAuditLog({
      adminUserId,
      action: 'STUDY_MATERIAL_DRAFT_DELETED',
      recordType: 'StudyMaterial',
      recordId: id,
      previousValue: sm,
    });

    return { success: true };
  }
}

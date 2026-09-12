import { prisma } from '@study-karnataka/database';
import {
  calculateExamPatternTotals,
  calculateExamPatternReadiness,
  validateExamPatternStructure,
} from '@study-karnataka/validation';
import { PublicLocalizedPatternResponse } from '@study-karnataka/shared-types';

async function createAuditLog(
  adminUserId: string,
  action: string,
  module: string,
  recordId: string,
  oldValue: any,
  newValue: any,
  reason?: string
) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action,
        module,
        recordId,
        previousValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        reason: reason || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// -----------------------------------------------------------------------------
// PATTERN REVISION & LIFECYCLE
// -----------------------------------------------------------------------------

export async function getPatternsByExamCycle(examCycleId: string): Promise<any[]> {
  const patterns = await prisma.examPattern.findMany({
    where: { examCycleId },
    orderBy: { revisionNumber: 'desc' },
    include: {
      stages: {
        orderBy: { displayOrder: 'asc' },
        include: {
          papers: {
            orderBy: { displayOrder: 'asc' },
            include: {
              sections: {
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  return patterns.map((p) => {
    const readiness = calculateExamPatternReadiness(p);
    const totals = calculateExamPatternTotals(p);
    return {
      ...p,
      readiness,
      totals,
    };
  });
}

export async function getPatternById(patternId: string): Promise<any> {
  const pattern = await prisma.examPattern.findUnique({
    where: { id: patternId },
    include: {
      examCycle: true,
      stages: {
        orderBy: { displayOrder: 'asc' },
        include: {
          papers: {
            orderBy: { displayOrder: 'asc' },
            include: {
              sections: {
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  if (!pattern) {
    const err: any = new Error('Exam pattern not found');
    err.code = 'EXAM_PATTERN_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const readiness = calculateExamPatternReadiness(pattern);
  const totals = calculateExamPatternTotals(pattern);
  const validation = validateExamPatternStructure(pattern);

  return {
    ...pattern,
    readiness,
    totals,
    validation,
  };
}

export async function createInitialPattern(examCycleId: string, payload: any, adminUserId: string): Promise<any> {
  const examCycle = await prisma.examCycle.findUnique({ where: { id: examCycleId } });
  if (!examCycle) {
    const err: any = new Error('Exam cycle not found');
    err.code = 'EXAM_CYCLE_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const existingCurrent = await prisma.examPattern.findFirst({
    where: { examCycleId, revisionNumber: 1 },
  });

  if (existingCurrent) {
    const err: any = new Error('Initial pattern revision 1 already exists for this exam cycle');
    err.code = 'EXAM_PATTERN_ALREADY_EXISTS';
    err.status = 400;
    throw err;
  }

  const pattern = await prisma.examPattern.create({
    data: {
      examCycleId,
      revisionNumber: 1,
      titleEn: payload.titleEn,
      titleKn: payload.titleKn,
      descriptionEn: payload.descriptionEn || null,
      descriptionKn: payload.descriptionKn || null,
      generalInstructionsEn: payload.generalInstructionsEn || null,
      generalInstructionsKn: payload.generalInstructionsKn || null,
      sourceResourceId: payload.sourceResourceId || null,
      sourceReference: payload.sourceReference || null,
      status: 'DRAFT',
      isCurrent: false,
      createdByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
    },
  });

  await createAuditLog(adminUserId, 'CREATE_PATTERN', 'EXAM_PATTERN', pattern.id, null, pattern);

  return getPatternById(pattern.id);
}

export async function updatePattern(patternId: string, payload: any, adminUserId: string): Promise<any> {
  const pattern = await prisma.examPattern.findUnique({ where: { id: patternId } });
  if (!pattern) {
    const err: any = new Error('Exam pattern not found');
    err.code = 'EXAM_PATTERN_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  if (pattern.status === 'PUBLISHED') {
    const err: any = new Error('Published exam patterns are immutable. Create a new revision to make changes.');
    err.code = 'EXAM_PATTERN_PUBLISHED_IMMUTABLE';
    err.status = 400;
    throw err;
  }

  if (payload.version !== undefined && payload.version !== pattern.version) {
    const err: any = new Error('Optimistic concurrency error: pattern was modified by another request');
    err.code = 'EXAM_PATTERN_VERSION_CONFLICT';
    err.status = 409;
    throw err;
  }

  const updated = await prisma.examPattern.update({
    where: { id: patternId },
    data: {
      ...(payload.titleEn !== undefined ? { titleEn: payload.titleEn } : {}),
      ...(payload.titleKn !== undefined ? { titleKn: payload.titleKn } : {}),
      ...(payload.descriptionEn !== undefined ? { descriptionEn: payload.descriptionEn } : {}),
      ...(payload.descriptionKn !== undefined ? { descriptionKn: payload.descriptionKn } : {}),
      ...(payload.generalInstructionsEn !== undefined ? { generalInstructionsEn: payload.generalInstructionsEn } : {}),
      ...(payload.generalInstructionsKn !== undefined ? { generalInstructionsKn: payload.generalInstructionsKn } : {}),
      ...(payload.sourceResourceId !== undefined ? { sourceResourceId: payload.sourceResourceId } : {}),
      ...(payload.sourceReference !== undefined ? { sourceReference: payload.sourceReference } : {}),
      updatedByAdminId: adminUserId,
      version: { increment: 1 },
    },
  });

  await createAuditLog(adminUserId, 'UPDATE_PATTERN', 'EXAM_PATTERN', pattern.id, pattern, updated);

  return getPatternById(patternId);
}

export async function deleteDraftPattern(patternId: string, adminUserId: string): Promise<{ success: boolean }> {
  const pattern = await prisma.examPattern.findUnique({ where: { id: patternId } });
  if (!pattern) {
    const err: any = new Error('Exam pattern not found');
    err.code = 'EXAM_PATTERN_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  if (pattern.status !== 'DRAFT') {
    const err: any = new Error('Only draft exam patterns that have never been submitted can be deleted');
    err.code = 'EXAM_PATTERN_INVALID_TRANSITION';
    err.status = 400;
    throw err;
  }

  if (pattern.reviewSubmittedAt || pattern.approvedAt || pattern.publishedAt) {
    const err: any = new Error('Pattern has workflow history and cannot be deleted');
    err.code = 'EXAM_PATTERN_INVALID_TRANSITION';
    err.status = 400;
    throw err;
  }

  await prisma.examPattern.delete({ where: { id: patternId } });
  await createAuditLog(adminUserId, 'DELETE_PATTERN', 'EXAM_PATTERN', patternId, pattern, null);

  return { success: true };
}

export async function clonePatternRevision(patternId: string, adminUserId: string): Promise<any> {
  const sourcePattern = await prisma.examPattern.findUnique({
    where: { id: patternId },
    include: {
      stages: {
        include: {
          papers: {
            include: {
              sections: true,
            },
          },
        },
      },
    },
  });

  if (!sourcePattern) {
    const err: any = new Error('Source pattern not found');
    err.code = 'EXAM_PATTERN_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const latestPattern = await prisma.examPattern.findFirst({
    where: { examCycleId: sourcePattern.examCycleId },
    orderBy: { revisionNumber: 'desc' },
  });

  const nextRevisionNumber = (latestPattern?.revisionNumber || sourcePattern.revisionNumber) + 1;

  const newPattern = await prisma.$transaction(async (tx) => {
    const createdPattern = await tx.examPattern.create({
      data: {
        examCycleId: sourcePattern.examCycleId,
        revisionNumber: nextRevisionNumber,
        sourcePatternId: sourcePattern.id,
        titleEn: sourcePattern.titleEn,
        titleKn: sourcePattern.titleKn,
        descriptionEn: sourcePattern.descriptionEn,
        descriptionKn: sourcePattern.descriptionKn,
        generalInstructionsEn: sourcePattern.generalInstructionsEn,
        generalInstructionsKn: sourcePattern.generalInstructionsKn,
        sourceResourceId: sourcePattern.sourceResourceId,
        sourceReference: sourcePattern.sourceReference,
        status: 'DRAFT',
        isCurrent: false,
        createdByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
      },
    });

    for (const stage of sourcePattern.stages) {
      const createdStage = await tx.examStage.create({
        data: {
          examPatternId: createdPattern.id,
          code: stage.code,
          stageType: stage.stageType,
          nameEn: stage.nameEn,
          nameKn: stage.nameKn,
          shortNameEn: stage.shortNameEn,
          shortNameKn: stage.shortNameKn,
          descriptionEn: stage.descriptionEn,
          descriptionKn: stage.descriptionKn,
          instructionsEn: stage.instructionsEn,
          instructionsKn: stage.instructionsKn,
          displayOrder: stage.displayOrder,
          isQualifying: stage.isQualifying,
          contributesToFinalMerit: stage.contributesToFinalMerit,
          qualificationRuleType: stage.qualificationRuleType,
          qualificationValue: stage.qualificationValue,
          qualificationRuleEn: stage.qualificationRuleEn,
          qualificationRuleKn: stage.qualificationRuleKn,
          isActive: stage.isActive,
        },
      });

      for (const paper of stage.papers) {
        const createdPaper = await tx.examPaper.create({
          data: {
            examStageId: createdStage.id,
            code: paper.code,
            assessmentMode: paper.assessmentMode,
            nameEn: paper.nameEn,
            nameKn: paper.nameKn,
            shortNameEn: paper.shortNameEn,
            shortNameKn: paper.shortNameKn,
            descriptionEn: paper.descriptionEn,
            descriptionKn: paper.descriptionKn,
            instructionsEn: paper.instructionsEn,
            instructionsKn: paper.instructionsKn,
            mediumRule: paper.mediumRule,
            mediumInstructionsEn: paper.mediumInstructionsEn,
            mediumInstructionsKn: paper.mediumInstructionsKn,
            displayOrder: paper.displayOrder,
            durationMinutes: paper.durationMinutes,
            totalQuestions: paper.totalQuestions,
            questionsToAnswer: paper.questionsToAnswer,
            totalMarks: paper.totalMarks,
            isQualifying: paper.isQualifying,
            contributesToStageMerit: paper.contributesToStageMerit,
            qualifyingRuleType: paper.qualifyingRuleType,
            qualifyingValue: paper.qualifyingValue,
            defaultNegativeMarkingType: paper.defaultNegativeMarkingType,
            defaultNegativeMarkingValue: paper.defaultNegativeMarkingValue,
            defaultNegativeFractionNumerator: paper.defaultNegativeFractionNumerator,
            defaultNegativeFractionDenominator: paper.defaultNegativeFractionDenominator,
            calculatorEnabled: paper.calculatorEnabled,
            isActive: paper.isActive,
          },
        });

        for (const sec of paper.sections) {
          await tx.examPaperSection.create({
            data: {
              examPaperId: createdPaper.id,
              code: sec.code,
              questionFormat: sec.questionFormat,
              nameEn: sec.nameEn,
              nameKn: sec.nameKn,
              descriptionEn: sec.descriptionEn,
              descriptionKn: sec.descriptionKn,
              instructionsEn: sec.instructionsEn,
              instructionsKn: sec.instructionsKn,
              displayOrder: sec.displayOrder,
              totalQuestions: sec.totalQuestions,
              questionsToAnswer: sec.questionsToAnswer,
              marksPerQuestion: sec.marksPerQuestion,
              calculatedTotalMarks: sec.calculatedTotalMarks,
              durationMinutes: sec.durationMinutes,
              negativeMarkingType: sec.negativeMarkingType,
              negativeMarkingValue: sec.negativeMarkingValue,
              negativeFractionNumerator: sec.negativeFractionNumerator,
              negativeFractionDenominator: sec.negativeFractionDenominator,
              isQualifying: sec.isQualifying,
              qualifyingRuleType: sec.qualifyingRuleType,
              qualifyingValue: sec.qualifyingValue,
              contributesToPaperMerit: sec.contributesToPaperMerit,
              isActive: sec.isActive,
            },
          });
        }
      }
    }

    return createdPattern;
  });

  await createAuditLog(
    adminUserId,
    'CLONE_PATTERN_REVISION',
    'EXAM_PATTERN',
    newPattern.id,
    { sourcePatternId: sourcePattern.id, sourceRevision: sourcePattern.revisionNumber },
    { newPatternId: newPattern.id, newRevision: nextRevisionNumber }
  );

  return getPatternById(newPattern.id);
}

// -----------------------------------------------------------------------------
// WORKFLOW STATE TRANSITIONS
// -----------------------------------------------------------------------------

export async function submitPatternForReview(patternId: string, adminUserId: string): Promise<any> {
  const pattern = await getPatternById(patternId);
  if (pattern.status !== 'DRAFT' && pattern.status !== 'CHANGES_REQUESTED') {
    const err: any = new Error(`Cannot submit pattern for review from status ${pattern.status}`);
    err.code = 'EXAM_PATTERN_INVALID_TRANSITION';
    err.status = 400;
    throw err;
  }

  if (!pattern.validation.isValid) {
    const err: any = new Error('Pattern has structural or bilingual errors and cannot be submitted');
    err.code = 'EXAM_PATTERN_INCOMPLETE';
    err.status = 400;
    err.details = pattern.validation.issues;
    throw err;
  }

  await prisma.examPattern.update({
    where: { id: patternId },
    data: {
      status: 'REVIEW_PENDING',
      reviewSubmittedAt: new Date(),
      updatedByAdminId: adminUserId,
      version: { increment: 1 },
    },
  });

  await createAuditLog(adminUserId, 'SUBMIT_PATTERN_REVIEW', 'EXAM_PATTERN', patternId, { status: pattern.status }, { status: 'REVIEW_PENDING' });
  return getPatternById(patternId);
}

export async function requestPatternChanges(patternId: string, reason: string, adminUserId: string): Promise<any> {
  const pattern = await getPatternById(patternId);
  if (pattern.status !== 'REVIEW_PENDING') {
    const err: any = new Error(`Cannot request changes for pattern in status ${pattern.status}`);
    err.code = 'EXAM_PATTERN_INVALID_TRANSITION';
    err.status = 400;
    throw err;
  }

  await prisma.examPattern.update({
    where: { id: patternId },
    data: {
      status: 'CHANGES_REQUESTED',
      reviewedAt: new Date(),
      reviewedByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
      version: { increment: 1 },
    },
  });

  await createAuditLog(adminUserId, 'REQUEST_PATTERN_CHANGES', 'EXAM_PATTERN', patternId, { status: pattern.status }, { status: 'CHANGES_REQUESTED', reason });
  return getPatternById(patternId);
}

export async function approvePattern(patternId: string, adminUserId: string): Promise<any> {
  const pattern = await getPatternById(patternId);
  if (pattern.status !== 'REVIEW_PENDING') {
    const err: any = new Error(`Cannot approve pattern in status ${pattern.status}`);
    err.code = 'EXAM_PATTERN_INVALID_TRANSITION';
    err.status = 400;
    throw err;
  }

  if (!pattern.validation.isValid) {
    const err: any = new Error('Pattern validation failed. Both languages and correct structure are required.');
    err.code = 'EXAM_PATTERN_INCOMPLETE';
    err.status = 400;
    throw err;
  }

  await prisma.examPattern.update({
    where: { id: patternId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
      version: { increment: 1 },
    },
  });

  await createAuditLog(adminUserId, 'APPROVE_PATTERN', 'EXAM_PATTERN', patternId, { status: pattern.status }, { status: 'APPROVED' });
  return getPatternById(patternId);
}

export async function publishPattern(patternId: string, adminUserId: string): Promise<any> {
  const pattern = await getPatternById(patternId);
  if (pattern.status !== 'APPROVED') {
    const err: any = new Error('Pattern must be in APPROVED status to publish');
    err.code = 'EXAM_PATTERN_NOT_APPROVED';
    err.status = 400;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    // Mark previous current pattern as non-current and ARCHIVED
    await tx.examPattern.updateMany({
      where: {
        examCycleId: pattern.examCycleId,
        isCurrent: true,
      },
      data: {
        isCurrent: false,
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    // Mark target pattern as PUBLISHED and isCurrent = true
    await tx.examPattern.update({
      where: { id: patternId },
      data: {
        status: 'PUBLISHED',
        isCurrent: true,
        publishedAt: new Date(),
        publishedByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
        version: { increment: 1 },
      },
    });
  });

  await createAuditLog(adminUserId, 'PUBLISH_PATTERN', 'EXAM_PATTERN', patternId, { status: 'APPROVED' }, { status: 'PUBLISHED', isCurrent: true });
  return getPatternById(patternId);
}

// -----------------------------------------------------------------------------
// STAGE OPERATIONS
// -----------------------------------------------------------------------------

export async function createStage(patternId: string, payload: any, adminUserId: string): Promise<any> {
  const pattern = await prisma.examPattern.findUnique({ where: { id: patternId } });
  if (!pattern) {
    const err: any = new Error('Exam pattern not found');
    err.code = 'EXAM_PATTERN_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (pattern.status === 'PUBLISHED') {
    const err: any = new Error('Published exam patterns are immutable.');
    err.code = 'EXAM_PATTERN_PUBLISHED_IMMUTABLE';
    err.status = 400;
    throw err;
  }

  const existingCode = await prisma.examStage.findFirst({
    where: { examPatternId: patternId, code: payload.code },
  });
  if (existingCode) {
    const err: any = new Error(`Stage code ${payload.code} already exists in this pattern`);
    err.code = 'EXAM_STAGE_CODE_EXISTS';
    err.status = 400;
    throw err;
  }

  const stage = await prisma.examStage.create({
    data: {
      examPatternId: patternId,
      code: payload.code,
      stageType: payload.stageType,
      nameEn: payload.nameEn,
      nameKn: payload.nameKn,
      shortNameEn: payload.shortNameEn || null,
      shortNameKn: payload.shortNameKn || null,
      descriptionEn: payload.descriptionEn || null,
      descriptionKn: payload.descriptionKn || null,
      instructionsEn: payload.instructionsEn || null,
      instructionsKn: payload.instructionsKn || null,
      displayOrder: payload.displayOrder,
      isQualifying: payload.isQualifying || false,
      contributesToFinalMerit: payload.contributesToFinalMerit !== undefined ? payload.contributesToFinalMerit : true,
      qualificationRuleType: payload.qualificationRuleType || 'NONE',
      qualificationValue: payload.qualificationValue !== undefined ? payload.qualificationValue : null,
      qualificationRuleEn: payload.qualificationRuleEn || null,
      qualificationRuleKn: payload.qualificationRuleKn || null,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
    },
  });

  await createAuditLog(adminUserId, 'CREATE_STAGE', 'EXAM_STAGE', stage.id, null, stage);
  return stage;
}

export async function updateStage(patternId: string, stageId: string, payload: any, adminUserId: string): Promise<any> {
  const pattern = await prisma.examPattern.findUnique({ where: { id: patternId } });
  if (!pattern || pattern.status === 'PUBLISHED') {
    const err: any = new Error('Published exam patterns are immutable.');
    err.code = 'EXAM_PATTERN_PUBLISHED_IMMUTABLE';
    err.status = 400;
    throw err;
  }

  const stage = await prisma.examStage.findFirst({
    where: { id: stageId, examPatternId: patternId },
  });
  if (!stage) {
    const err: any = new Error('Stage not found');
    err.code = 'EXAM_STAGE_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const updated = await prisma.examStage.update({
    where: { id: stageId },
    data: {
      ...(payload.code ? { code: payload.code } : {}),
      ...(payload.stageType ? { stageType: payload.stageType } : {}),
      ...(payload.nameEn ? { nameEn: payload.nameEn } : {}),
      ...(payload.nameKn ? { nameKn: payload.nameKn } : {}),
      ...(payload.shortNameEn !== undefined ? { shortNameEn: payload.shortNameEn } : {}),
      ...(payload.shortNameKn !== undefined ? { shortNameKn: payload.shortNameKn } : {}),
      ...(payload.descriptionEn !== undefined ? { descriptionEn: payload.descriptionEn } : {}),
      ...(payload.descriptionKn !== undefined ? { descriptionKn: payload.descriptionKn } : {}),
      ...(payload.instructionsEn !== undefined ? { instructionsEn: payload.instructionsEn } : {}),
      ...(payload.instructionsKn !== undefined ? { instructionsKn: payload.instructionsKn } : {}),
      ...(payload.displayOrder ? { displayOrder: payload.displayOrder } : {}),
      ...(payload.isQualifying !== undefined ? { isQualifying: payload.isQualifying } : {}),
      ...(payload.contributesToFinalMerit !== undefined ? { contributesToFinalMerit: payload.contributesToFinalMerit } : {}),
      ...(payload.qualificationRuleType ? { qualificationRuleType: payload.qualificationRuleType } : {}),
      ...(payload.qualificationValue !== undefined ? { qualificationValue: payload.qualificationValue } : {}),
      ...(payload.qualificationRuleEn !== undefined ? { qualificationRuleEn: payload.qualificationRuleEn } : {}),
      ...(payload.qualificationRuleKn !== undefined ? { qualificationRuleKn: payload.qualificationRuleKn } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      version: { increment: 1 },
    },
  });

  await createAuditLog(adminUserId, 'UPDATE_STAGE', 'EXAM_STAGE', stageId, stage, updated);
  return updated;
}

export async function deleteDraftStage(patternId: string, stageId: string, adminUserId: string): Promise<{ success: boolean }> {
  const pattern = await prisma.examPattern.findUnique({ where: { id: patternId } });
  if (!pattern || pattern.status === 'PUBLISHED') {
    const err: any = new Error('Published exam patterns are immutable.');
    err.code = 'EXAM_PATTERN_PUBLISHED_IMMUTABLE';
    err.status = 400;
    throw err;
  }

  const stage = await prisma.examStage.findFirst({
    where: { id: stageId, examPatternId: patternId },
  });
  if (!stage) {
    const err: any = new Error('Stage not found');
    err.code = 'EXAM_STAGE_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  await prisma.examStage.delete({ where: { id: stageId } });
  await createAuditLog(adminUserId, 'DELETE_STAGE', 'EXAM_STAGE', stageId, stage, null);
  return { success: true };
}

export async function reorderStages(patternId: string, orderedIds: string[], adminUserId: string): Promise<{ success: boolean }> {
  const pattern = await prisma.examPattern.findUnique({ where: { id: patternId } });
  if (!pattern || pattern.status === 'PUBLISHED') {
    const err: any = new Error('Published exam patterns are immutable.');
    err.code = 'EXAM_PATTERN_PUBLISHED_IMMUTABLE';
    err.status = 400;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.examStage.update({
        where: { id: orderedIds[i] },
        data: { displayOrder: i + 1 },
      });
    }
  });

  await createAuditLog(adminUserId, 'REORDER_STAGES', 'EXAM_STAGE', patternId, null, { orderedIds });
  return { success: true };
}

// -----------------------------------------------------------------------------
// PAPER OPERATIONS
// -----------------------------------------------------------------------------

export async function createPaper(stageId: string, payload: any, adminUserId: string): Promise<any> {
  const stage = await prisma.examStage.findUnique({
    where: { id: stageId },
    include: { examPattern: true },
  });
  if (!stage) {
    const err: any = new Error('Exam stage not found');
    err.code = 'EXAM_STAGE_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (stage.examPattern.status === 'PUBLISHED') {
    const err: any = new Error('Published exam patterns are immutable.');
    err.code = 'EXAM_PATTERN_PUBLISHED_IMMUTABLE';
    err.status = 400;
    throw err;
  }

  const existingCode = await prisma.examPaper.findFirst({
    where: { examStageId: stageId, code: payload.code },
  });
  if (existingCode) {
    const err: any = new Error(`Paper code ${payload.code} already exists in this stage`);
    err.code = 'EXAM_PAPER_CODE_EXISTS';
    err.status = 400;
    throw err;
  }

  const paper = await prisma.examPaper.create({
    data: {
      examStageId: stageId,
      code: payload.code,
      assessmentMode: payload.assessmentMode,
      nameEn: payload.nameEn,
      nameKn: payload.nameKn,
      shortNameEn: payload.shortNameEn || null,
      shortNameKn: payload.shortNameKn || null,
      descriptionEn: payload.descriptionEn || null,
      descriptionKn: payload.descriptionKn || null,
      instructionsEn: payload.instructionsEn || null,
      instructionsKn: payload.instructionsKn || null,
      mediumRule: payload.mediumRule || 'BILINGUAL',
      mediumInstructionsEn: payload.mediumInstructionsEn || null,
      mediumInstructionsKn: payload.mediumInstructionsKn || null,
      displayOrder: payload.displayOrder,
      durationMinutes: payload.durationMinutes !== undefined ? payload.durationMinutes : null,
      totalQuestions: payload.totalQuestions !== undefined ? payload.totalQuestions : null,
      questionsToAnswer: payload.questionsToAnswer !== undefined ? payload.questionsToAnswer : null,
      totalMarks: payload.totalMarks,
      isQualifying: payload.isQualifying || false,
      contributesToStageMerit: payload.contributesToStageMerit !== undefined ? payload.contributesToStageMerit : true,
      qualifyingRuleType: payload.qualifyingRuleType || 'NONE',
      qualifyingValue: payload.qualifyingValue !== undefined ? payload.qualifyingValue : null,
      defaultNegativeMarkingType: payload.defaultNegativeMarkingType || 'NONE',
      defaultNegativeMarkingValue: payload.defaultNegativeMarkingValue !== undefined ? payload.defaultNegativeMarkingValue : null,
      defaultNegativeFractionNumerator: payload.defaultNegativeFractionNumerator !== undefined ? payload.defaultNegativeFractionNumerator : null,
      defaultNegativeFractionDenominator: payload.defaultNegativeFractionDenominator !== undefined ? payload.defaultNegativeFractionDenominator : null,
      calculatorEnabled: payload.calculatorEnabled || false,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
    },
  });

  await createAuditLog(adminUserId, 'CREATE_PAPER', 'EXAM_PAPER', paper.id, null, paper);
  return paper;
}

export async function updatePaper(stageId: string, paperId: string, payload: any, adminUserId: string): Promise<any> {
  const stage = await prisma.examStage.findUnique({
    where: { id: stageId },
    include: { examPattern: true },
  });
  if (!stage || stage.examPattern.status === 'PUBLISHED') {
    const err: any = new Error('Published exam patterns are immutable.');
    err.code = 'EXAM_PATTERN_PUBLISHED_IMMUTABLE';
    err.status = 400;
    throw err;
  }

  const paper = await prisma.examPaper.findFirst({
    where: { id: paperId, examStageId: stageId },
  });
  if (!paper) {
    const err: any = new Error('Paper not found');
    err.code = 'EXAM_PAPER_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const updated = await prisma.examPaper.update({
    where: { id: paperId },
    data: {
      ...(payload.code ? { code: payload.code } : {}),
      ...(payload.assessmentMode ? { assessmentMode: payload.assessmentMode } : {}),
      ...(payload.nameEn ? { nameEn: payload.nameEn } : {}),
      ...(payload.nameKn ? { nameKn: payload.nameKn } : {}),
      ...(payload.shortNameEn !== undefined ? { shortNameEn: payload.shortNameEn } : {}),
      ...(payload.shortNameKn !== undefined ? { shortNameKn: payload.shortNameKn } : {}),
      ...(payload.descriptionEn !== undefined ? { descriptionEn: payload.descriptionEn } : {}),
      ...(payload.descriptionKn !== undefined ? { descriptionKn: payload.descriptionKn } : {}),
      ...(payload.instructionsEn !== undefined ? { instructionsEn: payload.instructionsEn } : {}),
      ...(payload.instructionsKn !== undefined ? { instructionsKn: payload.instructionsKn } : {}),
      ...(payload.mediumRule ? { mediumRule: payload.mediumRule } : {}),
      ...(payload.mediumInstructionsEn !== undefined ? { mediumInstructionsEn: payload.mediumInstructionsEn } : {}),
      ...(payload.mediumInstructionsKn !== undefined ? { mediumInstructionsKn: payload.mediumInstructionsKn } : {}),
      ...(payload.displayOrder ? { displayOrder: payload.displayOrder } : {}),
      ...(payload.durationMinutes !== undefined ? { durationMinutes: payload.durationMinutes } : {}),
      ...(payload.totalQuestions !== undefined ? { totalQuestions: payload.totalQuestions } : {}),
      ...(payload.questionsToAnswer !== undefined ? { questionsToAnswer: payload.questionsToAnswer } : {}),
      ...(payload.totalMarks !== undefined ? { totalMarks: payload.totalMarks } : {}),
      ...(payload.isQualifying !== undefined ? { isQualifying: payload.isQualifying } : {}),
      ...(payload.contributesToStageMerit !== undefined ? { contributesToStageMerit: payload.contributesToStageMerit } : {}),
      ...(payload.qualifyingRuleType ? { qualifyingRuleType: payload.qualifyingRuleType } : {}),
      ...(payload.qualifyingValue !== undefined ? { qualifyingValue: payload.qualifyingValue } : {}),
      ...(payload.defaultNegativeMarkingType ? { defaultNegativeMarkingType: payload.defaultNegativeMarkingType } : {}),
      ...(payload.defaultNegativeMarkingValue !== undefined ? { defaultNegativeMarkingValue: payload.defaultNegativeMarkingValue } : {}),
      ...(payload.defaultNegativeFractionNumerator !== undefined ? { defaultNegativeFractionNumerator: payload.defaultNegativeFractionNumerator } : {}),
      ...(payload.defaultNegativeFractionDenominator !== undefined ? { defaultNegativeFractionDenominator: payload.defaultNegativeFractionDenominator } : {}),
      ...(payload.calculatorEnabled !== undefined ? { calculatorEnabled: payload.calculatorEnabled } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      version: { increment: 1 },
    },
  });

  await createAuditLog(adminUserId, 'UPDATE_PAPER', 'EXAM_PAPER', paperId, paper, updated);
  return updated;
}

export async function deleteDraftPaper(stageId: string, paperId: string, adminUserId: string): Promise<{ success: boolean }> {
  const stage = await prisma.examStage.findUnique({
    where: { id: stageId },
    include: { examPattern: true },
  });
  if (!stage || stage.examPattern.status === 'PUBLISHED') {
    const err: any = new Error('Published exam patterns are immutable.');
    err.code = 'EXAM_PATTERN_PUBLISHED_IMMUTABLE';
    err.status = 400;
    throw err;
  }

  const paper = await prisma.examPaper.findFirst({
    where: { id: paperId, examStageId: stageId },
  });
  if (!paper) {
    const err: any = new Error('Paper not found');
    err.code = 'EXAM_PAPER_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  await prisma.examPaper.delete({ where: { id: paperId } });
  await createAuditLog(adminUserId, 'DELETE_PAPER', 'EXAM_PAPER', paperId, paper, null);
  return { success: true };
}

export async function reorderPapers(stageId: string, orderedIds: string[], adminUserId: string): Promise<{ success: boolean }> {
  const stage = await prisma.examStage.findUnique({
    where: { id: stageId },
    include: { examPattern: true },
  });
  if (!stage || stage.examPattern.status === 'PUBLISHED') {
    const err: any = new Error('Published exam patterns are immutable.');
    err.code = 'EXAM_PATTERN_PUBLISHED_IMMUTABLE';
    err.status = 400;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.examPaper.update({
        where: { id: orderedIds[i] },
        data: { displayOrder: i + 1 },
      });
    }
  });

  await createAuditLog(adminUserId, 'REORDER_PAPERS', 'EXAM_PAPER', stageId, null, { orderedIds });
  return { success: true };
}

// -----------------------------------------------------------------------------
// SECTION OPERATIONS
// -----------------------------------------------------------------------------

export async function createSection(paperId: string, payload: any, adminUserId: string): Promise<any> {
  const paper = await prisma.examPaper.findUnique({
    where: { id: paperId },
    include: { examStage: { include: { examPattern: true } } },
  });
  if (!paper) {
    const err: any = new Error('Exam paper not found');
    err.code = 'EXAM_PAPER_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (paper.examStage.examPattern.status === 'PUBLISHED') {
    const err: any = new Error('Published exam patterns are immutable.');
    err.code = 'EXAM_PATTERN_PUBLISHED_IMMUTABLE';
    err.status = 400;
    throw err;
  }

  const existingCode = await prisma.examPaperSection.findFirst({
    where: { examPaperId: paperId, code: payload.code },
  });
  if (existingCode) {
    const err: any = new Error(`Section code ${payload.code} already exists in this paper`);
    err.code = 'EXAM_SECTION_CODE_EXISTS';
    err.status = 400;
    throw err;
  }

  const calculatedTotalMarks = (Number(payload.questionsToAnswer) || 0) * (Number(payload.marksPerQuestion) || 0);

  const section = await prisma.examPaperSection.create({
    data: {
      examPaperId: paperId,
      code: payload.code,
      questionFormat: payload.questionFormat,
      nameEn: payload.nameEn,
      nameKn: payload.nameKn,
      descriptionEn: payload.descriptionEn || null,
      descriptionKn: payload.descriptionKn || null,
      instructionsEn: payload.instructionsEn || null,
      instructionsKn: payload.instructionsKn || null,
      displayOrder: payload.displayOrder,
      totalQuestions: payload.totalQuestions,
      questionsToAnswer: payload.questionsToAnswer,
      marksPerQuestion: payload.marksPerQuestion,
      calculatedTotalMarks,
      durationMinutes: payload.durationMinutes !== undefined ? payload.durationMinutes : null,
      negativeMarkingType: payload.negativeMarkingType || null,
      negativeMarkingValue: payload.negativeMarkingValue !== undefined ? payload.negativeMarkingValue : null,
      negativeFractionNumerator: payload.negativeFractionNumerator !== undefined ? payload.negativeFractionNumerator : null,
      negativeFractionDenominator: payload.negativeFractionDenominator !== undefined ? payload.negativeFractionDenominator : null,
      isQualifying: payload.isQualifying || false,
      qualifyingRuleType: payload.qualifyingRuleType || 'NONE',
      qualifyingValue: payload.qualifyingValue !== undefined ? payload.qualifyingValue : null,
      contributesToPaperMerit: payload.contributesToPaperMerit !== undefined ? payload.contributesToPaperMerit : true,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
    },
  });

  await createAuditLog(adminUserId, 'CREATE_SECTION', 'EXAM_SECTION', section.id, null, section);
  return section;
}

export async function updateSection(paperId: string, sectionId: string, payload: any, adminUserId: string): Promise<any> {
  const paper = await prisma.examPaper.findUnique({
    where: { id: paperId },
    include: { examStage: { include: { examPattern: true } } },
  });
  if (!paper || paper.examStage.examPattern.status === 'PUBLISHED') {
    const err: any = new Error('Published exam patterns are immutable.');
    err.code = 'EXAM_PATTERN_PUBLISHED_IMMUTABLE';
    err.status = 400;
    throw err;
  }

  const section = await prisma.examPaperSection.findFirst({
    where: { id: sectionId, examPaperId: paperId },
  });
  if (!section) {
    const err: any = new Error('Section not found');
    err.code = 'EXAM_SECTION_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const qToAnswer = payload.questionsToAnswer !== undefined ? payload.questionsToAnswer : section.questionsToAnswer;
  const mPerQ = payload.marksPerQuestion !== undefined ? payload.marksPerQuestion : Number(section.marksPerQuestion);
  const calculatedTotalMarks = qToAnswer * mPerQ;

  const updated = await prisma.examPaperSection.update({
    where: { id: sectionId },
    data: {
      ...(payload.code ? { code: payload.code } : {}),
      ...(payload.questionFormat ? { questionFormat: payload.questionFormat } : {}),
      ...(payload.nameEn ? { nameEn: payload.nameEn } : {}),
      ...(payload.nameKn ? { nameKn: payload.nameKn } : {}),
      ...(payload.descriptionEn !== undefined ? { descriptionEn: payload.descriptionEn } : {}),
      ...(payload.descriptionKn !== undefined ? { descriptionKn: payload.descriptionKn } : {}),
      ...(payload.instructionsEn !== undefined ? { instructionsEn: payload.instructionsEn } : {}),
      ...(payload.instructionsKn !== undefined ? { instructionsKn: payload.instructionsKn } : {}),
      ...(payload.displayOrder ? { displayOrder: payload.displayOrder } : {}),
      ...(payload.totalQuestions !== undefined ? { totalQuestions: payload.totalQuestions } : {}),
      ...(payload.questionsToAnswer !== undefined ? { questionsToAnswer: payload.questionsToAnswer } : {}),
      ...(payload.marksPerQuestion !== undefined ? { marksPerQuestion: payload.marksPerQuestion } : {}),
      calculatedTotalMarks,
      ...(payload.durationMinutes !== undefined ? { durationMinutes: payload.durationMinutes } : {}),
      ...(payload.negativeMarkingType !== undefined ? { negativeMarkingType: payload.negativeMarkingType } : {}),
      ...(payload.negativeMarkingValue !== undefined ? { negativeMarkingValue: payload.negativeMarkingValue } : {}),
      ...(payload.negativeFractionNumerator !== undefined ? { negativeFractionNumerator: payload.negativeFractionNumerator } : {}),
      ...(payload.negativeFractionDenominator !== undefined ? { negativeFractionDenominator: payload.negativeFractionDenominator } : {}),
      ...(payload.isQualifying !== undefined ? { isQualifying: payload.isQualifying } : {}),
      ...(payload.qualifyingRuleType ? { qualifyingRuleType: payload.qualifyingRuleType } : {}),
      ...(payload.qualifyingValue !== undefined ? { qualifyingValue: payload.qualifyingValue } : {}),
      ...(payload.contributesToPaperMerit !== undefined ? { contributesToPaperMerit: payload.contributesToPaperMerit } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      version: { increment: 1 },
    },
  });

  await createAuditLog(adminUserId, 'UPDATE_SECTION', 'EXAM_SECTION', sectionId, section, updated);
  return updated;
}

export async function deleteDraftSection(paperId: string, sectionId: string, adminUserId: string): Promise<{ success: boolean }> {
  const paper = await prisma.examPaper.findUnique({
    where: { id: paperId },
    include: { examStage: { include: { examPattern: true } } },
  });
  if (!paper || paper.examStage.examPattern.status === 'PUBLISHED') {
    const err: any = new Error('Published exam patterns are immutable.');
    err.code = 'EXAM_PATTERN_PUBLISHED_IMMUTABLE';
    err.status = 400;
    throw err;
  }

  const section = await prisma.examPaperSection.findFirst({
    where: { id: sectionId, examPaperId: paperId },
  });
  if (!section) {
    const err: any = new Error('Section not found');
    err.code = 'EXAM_SECTION_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  await prisma.examPaperSection.delete({ where: { id: sectionId } });
  await createAuditLog(adminUserId, 'DELETE_SECTION', 'EXAM_SECTION', sectionId, section, null);
  return { success: true };
}

export async function reorderSections(paperId: string, orderedIds: string[], adminUserId: string): Promise<{ success: boolean }> {
  const paper = await prisma.examPaper.findUnique({
    where: { id: paperId },
    include: { examStage: { include: { examPattern: true } } },
  });
  if (!paper || paper.examStage.examPattern.status === 'PUBLISHED') {
    const err: any = new Error('Published exam patterns are immutable.');
    err.code = 'EXAM_PATTERN_PUBLISHED_IMMUTABLE';
    err.status = 400;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.examPaperSection.update({
        where: { id: orderedIds[i] },
        data: { displayOrder: i + 1 },
      });
    }
  });

  await createAuditLog(adminUserId, 'REORDER_SECTIONS', 'EXAM_SECTION', paperId, null, { orderedIds });
  return { success: true };
}

// -----------------------------------------------------------------------------
// PUBLIC LOCALIZED SERIALIZER
// -----------------------------------------------------------------------------

export async function serializePublicExamPattern(slug: string, language: 'en' | 'kn'): Promise<PublicLocalizedPatternResponse> {
  const seo = await prisma.examSEO.findFirst({
    where: {
      OR: [{ slugEn: slug }, { slugKn: slug }],
    },
    include: {
      examCycle: {
        include: {
          patterns: {
            where: { isCurrent: true, status: 'PUBLISHED' },
            include: {
              stages: {
                where: { isActive: true },
                orderBy: { displayOrder: 'asc' },
                include: {
                  papers: {
                    where: { isActive: true },
                    orderBy: { displayOrder: 'asc' },
                    include: {
                      sections: {
                        where: { isActive: true },
                        orderBy: { displayOrder: 'asc' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!seo || !seo.examCycle) {
    const err: any = new Error('Exam cycle not found for slug');
    err.code = 'EXAM_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const cycle = seo.examCycle;
  if (cycle.status !== 'PUBLISHED' || cycle.visibility === 'PRIVATE') {
    const err: any = new Error('Exam cycle is not publicly accessible');
    err.code = 'EXAM_NOT_ACCESSIBLE';
    err.status = 404;
    throw err;
  }

  const currentPattern = cycle.patterns[0];
  if (!currentPattern) {
    const err: any = new Error('No published exam pattern available for this exam');
    err.code = 'EXAM_PATTERN_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const totals = calculateExamPatternTotals(currentPattern);
  const isKn = language === 'kn';

  return {
    patternId: currentPattern.id,
    revisionNumber: currentPattern.revisionNumber,
    title: isKn ? currentPattern.titleKn : currentPattern.titleEn,
    description: isKn ? currentPattern.descriptionKn : currentPattern.descriptionEn,
    generalInstructions: isKn ? currentPattern.generalInstructionsKn : currentPattern.generalInstructionsEn,
    language,
    totals,
    stages: currentPattern.stages.map((stage) => ({
      id: stage.id,
      code: stage.code,
      stageType: stage.stageType,
      name: isKn ? stage.nameKn : stage.nameEn,
      shortName: isKn ? stage.shortNameKn : stage.shortNameEn,
      description: isKn ? stage.descriptionKn : stage.descriptionEn,
      instructions: isKn ? stage.instructionsKn : stage.instructionsEn,
      displayOrder: stage.displayOrder,
      isQualifying: stage.isQualifying,
      contributesToFinalMerit: stage.contributesToFinalMerit,
      qualificationRuleType: stage.qualificationRuleType,
      qualificationValue: stage.qualificationValue ? Number(stage.qualificationValue) : null,
      qualificationRule: isKn ? stage.qualificationRuleKn : stage.qualificationRuleEn,
      papers: stage.papers.map((paper) => {
        let negSummary = 'No negative marking';
        if (paper.defaultNegativeMarkingType === 'FIXED_MARKS') {
          negSummary = `Fixed -${paper.defaultNegativeMarkingValue} marks per wrong answer`;
        } else if (paper.defaultNegativeMarkingType === 'PERCENTAGE_OF_QUESTION_MARKS') {
          negSummary = `-${paper.defaultNegativeMarkingValue}% of question marks per wrong answer`;
        } else if (paper.defaultNegativeMarkingType === 'FRACTION_OF_QUESTION_MARKS') {
          negSummary = `-${paper.defaultNegativeFractionNumerator}/${paper.defaultNegativeFractionDenominator} of question marks per wrong answer`;
        }

        return {
          id: paper.id,
          code: paper.code,
          assessmentMode: paper.assessmentMode,
          name: isKn ? paper.nameKn : paper.nameEn,
          shortName: isKn ? paper.shortNameKn : paper.shortNameEn,
          description: isKn ? paper.descriptionKn : paper.descriptionEn,
          instructions: isKn ? paper.instructionsKn : paper.instructionsEn,
          mediumRule: paper.mediumRule,
          mediumInstructions: isKn ? paper.mediumInstructionsKn : paper.mediumInstructionsEn,
          displayOrder: paper.displayOrder,
          durationMinutes: paper.durationMinutes,
          totalQuestions: paper.totalQuestions,
          questionsToAnswer: paper.questionsToAnswer,
          totalMarks: Number(paper.totalMarks),
          isQualifying: paper.isQualifying,
          contributesToStageMerit: paper.contributesToStageMerit,
          qualifyingRuleType: paper.qualifyingRuleType,
          qualifyingValue: paper.qualifyingValue ? Number(paper.qualifyingValue) : null,
          negativeMarkingSummary: negSummary,
          sections: paper.sections.map((sec) => {
            let secNegSummary = negSummary;
            if (sec.negativeMarkingType === 'NONE') {
              secNegSummary = 'No negative marking';
            } else if (sec.negativeMarkingType === 'FIXED_MARKS') {
              secNegSummary = `Fixed -${sec.negativeMarkingValue} marks per wrong answer`;
            } else if (sec.negativeMarkingType === 'PERCENTAGE_OF_QUESTION_MARKS') {
              secNegSummary = `-${sec.negativeMarkingValue}% of question marks per wrong answer`;
            } else if (sec.negativeMarkingType === 'FRACTION_OF_QUESTION_MARKS') {
              secNegSummary = `-${sec.negativeFractionNumerator}/${sec.negativeFractionDenominator} of question marks per wrong answer`;
            }

            return {
              id: sec.id,
              code: sec.code,
              questionFormat: sec.questionFormat,
              name: isKn ? sec.nameKn : sec.nameEn,
              description: isKn ? sec.descriptionKn : sec.descriptionEn,
              instructions: isKn ? sec.instructionsKn : sec.instructionsEn,
              displayOrder: sec.displayOrder,
              totalQuestions: sec.totalQuestions,
              questionsToAnswer: sec.questionsToAnswer,
              marksPerQuestion: Number(sec.marksPerQuestion),
              calculatedTotalMarks: Number(sec.calculatedTotalMarks),
              durationMinutes: sec.durationMinutes,
              negativeMarkingSummary: secNegSummary,
              isQualifying: sec.isQualifying,
              contributesToPaperMerit: sec.contributesToPaperMerit,
            };
          }),
        };
      }),
    })),
  };
}

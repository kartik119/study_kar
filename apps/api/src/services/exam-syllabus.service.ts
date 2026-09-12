import { prisma } from '@study-karnataka/database';
import {
  ExamSyllabusStatus,
  ExamSyllabusNodeType,
  ExamSyllabusScopeType,
  SyllabusLanguageReadiness,
  SyllabusCalculatedTotals,
  SyllabusValidationResult,
  SyllabusValidationIssue,
  PublicSyllabusResponse,
  PublicSyllabusNode,
  Language,
} from '@study-karnataka/shared-types';
import { calculateNodeReadiness } from '@study-karnataka/validation';

export const MAX_TREE_DEPTH = 8;

export interface CreateSyllabusDTO {
  examPatternId: string;
  titleEn: string;
  titleKn: string;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  generalInstructionsEn?: string | null;
  generalInstructionsKn?: string | null;
  sourceResourceId?: string | null;
  sourceReference?: string | null;
}

export interface CreateNodeDTO {
  parentId?: string | null;
  code: string;
  nodeType: ExamSyllabusNodeType;
  scopeType?: ExamSyllabusScopeType;
  examStageId?: string | null;
  examPaperId?: string | null;
  nameEn: string;
  nameKn: string;
  shortNameEn?: string | null;
  shortNameKn?: string | null;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  officialTextEn?: string | null;
  officialTextKn?: string | null;
  sourceReference?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

async function createAuditLog(
  adminUserId: string | null | undefined,
  action: string,
  recordType: string,
  recordId: string,
  previousValue?: any,
  newValue?: any,
  reason?: string
) {
  if (!adminUserId) return;
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action,
        module: 'EXAMS_SYLLABUS',
        recordType,
        recordId,
        previousValue: previousValue ? JSON.parse(JSON.stringify(previousValue)) : undefined,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : undefined,
        reason,
      },
    });
  } catch (err) {
    console.error('Failed to create syllabus audit log:', err);
  }
}

function checkSyllabusEditable(status: ExamSyllabusStatus) {
  // Direct editing allowed for all syllabus revisions - keep it simple for admin management
  return;
}

// -----------------------------------------------------------------------------
// REVISION SERVICES
// -----------------------------------------------------------------------------

export async function fetchSyllabi(examCycleId: string) {
  return prisma.examSyllabus.findMany({
    where: { examCycleId },
    include: {
      examPattern: {
        select: { id: true, revisionNumber: true, status: true, isCurrent: true },
      },
    },
    orderBy: { revisionNumber: 'desc' },
  });
}

export async function fetchSyllabusById(examCycleId: string, syllabusId: string): Promise<any> {
  const syllabus = await prisma.examSyllabus.findFirst({
    where: { id: syllabusId, examCycleId },
    include: {
      examPattern: {
        include: {
          stages: {
            include: { papers: true },
          },
        },
      },
      nodes: {
        orderBy: [{ depth: 'asc' }, { displayOrder: 'asc' }],
      },
      sourceSyllabus: {
        select: { id: true, revisionNumber: true },
      },
    },
  });

  if (!syllabus) {
    const error: any = new Error(`Exam Syllabus revision ${syllabusId} not found`);
    error.code = 'EXAM_SYLLABUS_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const validation = await validateSyllabusTree(syllabus.id);
  const totals = await calculateSyllabusSummary(syllabus.id);

  return {
    ...syllabus,
    validation,
    totals,
  };
}

export async function createSyllabus(examCycleId: string, dto: CreateSyllabusDTO, adminUserId?: string) {
  const examCycle = await prisma.examCycle.findUnique({ where: { id: examCycleId } });
  if (!examCycle) {
    const error: any = new Error(`Exam Cycle ${examCycleId} not found`);
    error.code = 'EXAM_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const examPattern = await prisma.examPattern.findFirst({
    where: { id: dto.examPatternId, examCycleId },
  });
  if (!examPattern) {
    const error: any = new Error('Exam pattern revision must belong to the same Exam Cycle');
    error.code = 'EXAM_SYLLABUS_PATTERN_MISMATCH';
    error.status = 400;
    throw error;
  }

  const latestSyllabus = await prisma.examSyllabus.findFirst({
    where: { examCycleId },
    orderBy: { revisionNumber: 'desc' },
  });

  const revisionNumber = (latestSyllabus?.revisionNumber || 0) + 1;

  const newSyllabus = await prisma.examSyllabus.create({
    data: {
      examCycleId,
      examPatternId: dto.examPatternId,
      revisionNumber,
      titleEn: dto.titleEn,
      titleKn: dto.titleKn,
      descriptionEn: dto.descriptionEn,
      descriptionKn: dto.descriptionKn,
      generalInstructionsEn: dto.generalInstructionsEn,
      generalInstructionsKn: dto.generalInstructionsKn,
      sourceResourceId: dto.sourceResourceId,
      sourceReference: dto.sourceReference,
      status: 'DRAFT',
      isCurrent: false,
      createdByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
    },
  });

  await createAuditLog(adminUserId, 'CREATE_SYLLABUS', 'ExamSyllabus', newSyllabus.id, null, newSyllabus);

  return newSyllabus;
}

export async function updateSyllabus(
  examCycleId: string,
  syllabusId: string,
  dto: Partial<CreateSyllabusDTO> & { version?: number },
  adminUserId?: string
) {
  const existing = await prisma.examSyllabus.findFirst({ where: { id: syllabusId, examCycleId } });
  if (!existing) {
    const error: any = new Error('Syllabus revision not found');
    error.code = 'EXAM_SYLLABUS_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  checkSyllabusEditable(existing.status);

  if (dto.version !== undefined && existing.version !== dto.version) {
    const error: any = new Error('Conflict: Syllabus revision was modified by another request');
    error.code = 'EXAM_SYLLABUS_VERSION_CONFLICT';
    error.status = 409;
    throw error;
  }

  if (dto.examPatternId && dto.examPatternId !== existing.examPatternId) {
    const targetPattern = await prisma.examPattern.findFirst({
      where: { id: dto.examPatternId, examCycleId },
    });
    if (!targetPattern) {
      const error: any = new Error('Target pattern revision must belong to the same Exam Cycle');
      error.code = 'EXAM_SYLLABUS_PATTERN_MISMATCH';
      error.status = 400;
      throw error;
    }
  }

  const updated = await prisma.examSyllabus.update({
    where: { id: syllabusId },
    data: {
      titleEn: dto.titleEn,
      titleKn: dto.titleKn,
      descriptionEn: dto.descriptionEn,
      descriptionKn: dto.descriptionKn,
      generalInstructionsEn: dto.generalInstructionsEn,
      generalInstructionsKn: dto.generalInstructionsKn,
      sourceResourceId: dto.sourceResourceId,
      sourceReference: dto.sourceReference,
      examPatternId: dto.examPatternId,
      updatedByAdminId: adminUserId,
      version: { increment: 1 },
    },
  });

  await createAuditLog(adminUserId, 'UPDATE_SYLLABUS', 'ExamSyllabus', updated.id, existing, updated);

  return updated;
}

export async function deleteDraftSyllabus(examCycleId: string, syllabusId: string, adminUserId?: string) {
  const existing = await prisma.examSyllabus.findFirst({ where: { id: syllabusId, examCycleId } });
  if (!existing) {
    const error: any = new Error('Syllabus revision not found');
    error.code = 'EXAM_SYLLABUS_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  if (existing.status !== 'DRAFT' && existing.status !== 'CHANGES_REQUESTED') {
    const error: any = new Error('Only DRAFT or CHANGES_REQUESTED syllabus revisions can be deleted');
    error.code = 'EXAM_SYLLABUS_PUBLISHED_IMMUTABLE';
    error.status = 400;
    throw error;
  }

  await prisma.examSyllabus.delete({ where: { id: syllabusId } });

  await createAuditLog(adminUserId, 'DELETE_DRAFT_SYLLABUS', 'ExamSyllabus', syllabusId, existing, null);

  return { success: true };
}

export async function cloneSyllabusRevision(
  examCycleId: string,
  sourceSyllabusId: string,
  targetPatternId?: string,
  adminUserId?: string
) {
  const source = await prisma.examSyllabus.findFirst({
    where: { id: sourceSyllabusId, examCycleId },
    include: {
      nodes: {
        orderBy: [{ depth: 'asc' }, { displayOrder: 'asc' }],
      },
    },
  });

  if (!source) {
    const error: any = new Error('Source syllabus revision not found');
    error.code = 'EXAM_SYLLABUS_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  let finalPatternId = source.examPatternId;
  if (targetPatternId) {
    const pattern = await prisma.examPattern.findFirst({ where: { id: targetPatternId, examCycleId } });
    if (!pattern) {
      const error: any = new Error('Target pattern revision must belong to the same Exam Cycle');
      error.code = 'EXAM_SYLLABUS_PATTERN_MISMATCH';
      error.status = 400;
      throw error;
    }
    finalPatternId = targetPatternId;
  }

  const latestSyllabus = await prisma.examSyllabus.findFirst({
    where: { examCycleId },
    orderBy: { revisionNumber: 'desc' },
  });

  const nextRevisionNumber = (latestSyllabus?.revisionNumber || 0) + 1;

  // Transactional deep clone
  return prisma.$transaction(async (tx) => {
    const newSyllabus = await tx.examSyllabus.create({
      data: {
        examCycleId,
        examPatternId: finalPatternId,
        revisionNumber: nextRevisionNumber,
        sourceSyllabusId: source.id,
        titleEn: source.titleEn,
        titleKn: source.titleKn,
        descriptionEn: source.descriptionEn,
        descriptionKn: source.descriptionKn,
        generalInstructionsEn: source.generalInstructionsEn,
        generalInstructionsKn: source.generalInstructionsKn,
        sourceResourceId: source.sourceResourceId,
        sourceReference: source.sourceReference,
        status: 'DRAFT',
        isCurrent: false,
        createdByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
      },
    });

    // Map old Node ID -> new Node ID
    const nodeIdMap = new Map<string, string>();

    // Map old Stage ID -> new Stage ID if target pattern is different
    const stageIdMap = new Map<string, string>();
    const paperIdMap = new Map<string, string>();

    if (finalPatternId !== source.examPatternId) {
      const [sourcePattern, targetPattern] = await Promise.all([
        tx.examPattern.findUnique({
          where: { id: source.examPatternId },
          include: { stages: { include: { papers: true } } },
        }),
        tx.examPattern.findUnique({
          where: { id: finalPatternId },
          include: { stages: { include: { papers: true } } },
        }),
      ]);

      if (sourcePattern && targetPattern) {
        const targetStageByCode = new Map(targetPattern.stages.map((s) => [s.code, s.id]));
        for (const sStage of sourcePattern.stages) {
          const tStageId = targetStageByCode.get(sStage.code);
          if (tStageId) {
            stageIdMap.set(sStage.id, tStageId);
          }
          const targetPaperByCode = new Map(
            targetPattern.stages.flatMap((st) => st.papers).map((p) => [p.code, p.id])
          );
          for (const sPaper of sStage.papers) {
            const tPaperId = targetPaperByCode.get(sPaper.code);
            if (tPaperId) {
              paperIdMap.set(sPaper.id, tPaperId);
            }
          }
        }
      }
    }

    for (const oldNode of source.nodes) {
      let parentId: string | null = null;
      if (oldNode.parentId) {
        const mappedParentId = nodeIdMap.get(oldNode.parentId);
        if (!mappedParentId) {
          throw new Error(`Failed to map parent node ID ${oldNode.parentId} for node ${oldNode.code}`);
        }
        parentId = mappedParentId;
      }

      let examStageId = oldNode.examStageId;
      if (examStageId && finalPatternId !== source.examPatternId) {
        examStageId = stageIdMap.get(examStageId) || null;
      }

      let examPaperId = oldNode.examPaperId;
      if (examPaperId && finalPatternId !== source.examPatternId) {
        examPaperId = paperIdMap.get(examPaperId) || null;
      }

      const clonedNode = await tx.examSyllabusNode.create({
        data: {
          examSyllabusId: newSyllabus.id,
          parentId,
          code: oldNode.code,
          nodeType: oldNode.nodeType,
          scopeType: oldNode.scopeType,
          examStageId,
          examPaperId,
          nameEn: oldNode.nameEn,
          nameKn: oldNode.nameKn,
          shortNameEn: oldNode.shortNameEn,
          shortNameKn: oldNode.shortNameKn,
          descriptionEn: oldNode.descriptionEn,
          descriptionKn: oldNode.descriptionKn,
          officialTextEn: oldNode.officialTextEn,
          officialTextKn: oldNode.officialTextKn,
          sourceReference: oldNode.sourceReference,
          displayOrder: oldNode.displayOrder,
          depth: oldNode.depth,
          isActive: oldNode.isActive,
        },
      });

      nodeIdMap.set(oldNode.id, clonedNode.id);
    }

    await createAuditLog(
      adminUserId,
      'CLONE_SYLLABUS_REVISION',
      'ExamSyllabus',
      newSyllabus.id,
      { sourceRevision: source.revisionNumber },
      { newRevision: newSyllabus.revisionNumber, nodeCount: source.nodes.length }
    );

    return tx.examSyllabus.findUnique({
      where: { id: newSyllabus.id },
      include: {
        nodes: true,
      },
    });
  });
}

// -----------------------------------------------------------------------------
// NODE SERVICES
// -----------------------------------------------------------------------------

export async function fetchSyllabusNodes(syllabusId: string) {
  return prisma.examSyllabusNode.findMany({
    where: { examSyllabusId: syllabusId },
    include: {
      examStage: { select: { id: true, code: true, nameEn: true, nameKn: true } },
      examPaper: { select: { id: true, code: true, nameEn: true, nameKn: true } },
    },
    orderBy: [{ depth: 'asc' }, { displayOrder: 'asc' }],
  });
}

export async function createSyllabusNode(syllabusId: string, dto: CreateNodeDTO, adminUserId?: string) {
  const syllabus = await prisma.examSyllabus.findUnique({ where: { id: syllabusId } });
  if (!syllabus) {
    const error: any = new Error('Syllabus revision not found');
    error.code = 'EXAM_SYLLABUS_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  checkSyllabusEditable(syllabus.status);

  // Validate Code Uniqueness in Syllabus
  const codeCheck = await prisma.examSyllabusNode.findFirst({
    where: { examSyllabusId: syllabusId, code: dto.code },
  });
  if (codeCheck) {
    const error: any = new Error(`Node code '${dto.code}' already exists in this syllabus revision`);
    error.code = 'EXAM_SYLLABUS_NODE_CODE_EXISTS';
    error.status = 400;
    throw error;
  }

  let depth = 1;
  if (dto.parentId) {
    const parent = await prisma.examSyllabusNode.findFirst({
      where: { id: dto.parentId, examSyllabusId: syllabusId },
    });
    if (!parent) {
      const error: any = new Error('Parent node not found in this syllabus revision');
      error.code = 'EXAM_SYLLABUS_INVALID_PARENT';
      error.status = 400;
      throw error;
    }
    depth = parent.depth + 1;
    if (depth > MAX_TREE_DEPTH) {
      const error: any = new Error(`Maximum tree depth of ${MAX_TREE_DEPTH} exceeded`);
      error.code = 'EXAM_SYLLABUS_MAX_DEPTH_EXCEEDED';
      error.status = 400;
      throw error;
    }
  }

  // Validate Scope
  if (dto.scopeType === 'STAGE' && dto.examStageId) {
    const stage = await prisma.examStage.findFirst({
      where: { id: dto.examStageId, examPatternId: syllabus.examPatternId },
    });
    if (!stage) {
      const error: any = new Error('Referenced Exam Stage does not belong to the linked Pattern revision');
      error.code = 'EXAM_SYLLABUS_CROSS_PATTERN_SCOPE';
      error.status = 400;
      throw error;
    }
  }

  if (dto.scopeType === 'PAPER' && dto.examPaperId) {
    const paper = await prisma.examPaper.findFirst({
      where: { id: dto.examPaperId },
      include: { examStage: true },
    });
    if (!paper || paper.examStage.examPatternId !== syllabus.examPatternId) {
      const error: any = new Error('Referenced Exam Paper does not belong to the linked Pattern revision');
      error.code = 'EXAM_SYLLABUS_CROSS_PATTERN_SCOPE';
      error.status = 400;
      throw error;
    }
  }

  // Calculate Next Display Order
  let displayOrder = dto.displayOrder;
  if (!displayOrder) {
    const siblingCount = await prisma.examSyllabusNode.count({
      where: {
        examSyllabusId: syllabusId,
        parentId: dto.parentId || null,
      },
    });
    displayOrder = siblingCount + 1;
  }

  const newNode = await prisma.examSyllabusNode.create({
    data: {
      examSyllabusId: syllabusId,
      parentId: dto.parentId || null,
      code: dto.code,
      nodeType: dto.nodeType,
      scopeType: dto.scopeType || 'GLOBAL',
      examStageId: dto.examStageId || null,
      examPaperId: dto.examPaperId || null,
      nameEn: dto.nameEn,
      nameKn: dto.nameKn,
      shortNameEn: dto.shortNameEn,
      shortNameKn: dto.shortNameKn,
      descriptionEn: dto.descriptionEn,
      descriptionKn: dto.descriptionKn,
      officialTextEn: dto.officialTextEn,
      officialTextKn: dto.officialTextKn,
      sourceReference: dto.sourceReference,
      displayOrder,
      depth,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    },
  });

  await createAuditLog(adminUserId, 'CREATE_SYLLABUS_NODE', 'ExamSyllabusNode', newNode.id, null, newNode);

  return newNode;
}

export async function updateSyllabusNode(
  syllabusId: string,
  nodeId: string,
  dto: Partial<CreateNodeDTO> & { version?: number },
  adminUserId?: string
) {
  const syllabus = await prisma.examSyllabus.findUnique({ where: { id: syllabusId } });
  if (!syllabus) {
    const error: any = new Error('Syllabus revision not found');
    error.code = 'EXAM_SYLLABUS_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  checkSyllabusEditable(syllabus.status);

  const existing = await prisma.examSyllabusNode.findFirst({
    where: { id: nodeId, examSyllabusId: syllabusId },
  });
  if (!existing) {
    const error: any = new Error('Syllabus node not found');
    error.code = 'EXAM_SYLLABUS_NODE_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  if (dto.version !== undefined && existing.version !== dto.version) {
    const error: any = new Error('Conflict: Node was modified by another request');
    error.code = 'EXAM_SYLLABUS_VERSION_CONFLICT';
    error.status = 409;
    throw error;
  }

  if (dto.code && dto.code !== existing.code) {
    const codeCheck = await prisma.examSyllabusNode.findFirst({
      where: { examSyllabusId: syllabusId, code: dto.code, NOT: { id: nodeId } },
    });
    if (codeCheck) {
      const error: any = new Error(`Node code '${dto.code}' already exists in this syllabus revision`);
      error.code = 'EXAM_SYLLABUS_NODE_CODE_EXISTS';
      error.status = 400;
      throw error;
    }
  }

  const updated = await prisma.examSyllabusNode.update({
    where: { id: nodeId },
    data: {
      code: dto.code,
      nodeType: dto.nodeType,
      scopeType: dto.scopeType,
      examStageId: dto.examStageId,
      examPaperId: dto.examPaperId,
      nameEn: dto.nameEn,
      nameKn: dto.nameKn,
      shortNameEn: dto.shortNameEn,
      shortNameKn: dto.shortNameKn,
      descriptionEn: dto.descriptionEn,
      descriptionKn: dto.descriptionKn,
      officialTextEn: dto.officialTextEn,
      officialTextKn: dto.officialTextKn,
      sourceReference: dto.sourceReference,
      displayOrder: dto.displayOrder,
      isActive: dto.isActive,
      version: { increment: 1 },
    },
  });

  await createAuditLog(adminUserId, 'UPDATE_SYLLABUS_NODE', 'ExamSyllabusNode', updated.id, existing, updated);

  return updated;
}

export async function moveSyllabusNode(
  syllabusId: string,
  nodeId: string,
  targetParentId: string | null | undefined,
  newDisplayOrder?: number,
  adminUserId?: string
) {
  const syllabus = await prisma.examSyllabus.findUnique({ where: { id: syllabusId } });
  if (!syllabus) {
    const error: any = new Error('Syllabus revision not found');
    error.code = 'EXAM_SYLLABUS_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  checkSyllabusEditable(syllabus.status);

  const node = await prisma.examSyllabusNode.findFirst({
    where: { id: nodeId, examSyllabusId: syllabusId },
  });
  if (!node) {
    const error: any = new Error('Syllabus node not found');
    error.code = 'EXAM_SYLLABUS_NODE_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  if (targetParentId === nodeId) {
    const error: any = new Error('A node cannot be its own parent');
    error.code = 'EXAM_SYLLABUS_CIRCULAR_REFERENCE';
    error.status = 400;
    throw error;
  }

  let newDepth = 1;
  if (targetParentId) {
    const targetParent = await prisma.examSyllabusNode.findFirst({
      where: { id: targetParentId, examSyllabusId: syllabusId },
    });
    if (!targetParent) {
      const error: any = new Error('Target parent node not found');
      error.code = 'EXAM_SYLLABUS_INVALID_PARENT';
      error.status = 400;
      throw error;
    }

    // Check circular reference: target parent cannot be a descendant of node
    let curr: any = targetParent;
    while (curr && curr.parentId) {
      if (curr.parentId === nodeId) {
        const error: any = new Error('Cannot move a node to one of its own descendants');
        error.code = 'EXAM_SYLLABUS_CIRCULAR_REFERENCE';
        error.status = 400;
        throw error;
      }
      curr = await prisma.examSyllabusNode.findUnique({ where: { id: curr.parentId } });
    }

    newDepth = targetParent.depth + 1;
  }

  // Calculate depth delta and verify subtree max depth
  const depthDelta = newDepth - node.depth;
  const allNodes = await prisma.examSyllabusNode.findMany({ where: { examSyllabusId: syllabusId } });

  // Get max depth in subtree
  function getSubtreeMaxDepth(parentId: string): number {
    const children = allNodes.filter((n) => n.parentId === parentId);
    let max = 0;
    for (const child of children) {
      const childMax = getSubtreeMaxDepth(child.id);
      if (childMax > max) max = childMax;
    }
    return children.length > 0 ? max + 1 : 0;
  }

  const subtreeHeight = getSubtreeMaxDepth(node.id);
  if (newDepth + subtreeHeight > MAX_TREE_DEPTH) {
    const error: any = new Error(`Moving this subtree exceeds the maximum tree depth of ${MAX_TREE_DEPTH}`);
    error.code = 'EXAM_SYLLABUS_MAX_DEPTH_EXCEEDED';
    error.status = 400;
    throw error;
  }

  // Transactionally update depths for node and all descendants
  return prisma.$transaction(async (tx) => {
    // Helper to update depth recursively
    async function updateDepthsRecursively(pId: string, currentDepth: number) {
      const children = await tx.examSyllabusNode.findMany({ where: { parentId: pId, examSyllabusId: syllabusId } });
      for (const child of children) {
        const updatedDepth = currentDepth + 1;
        await tx.examSyllabusNode.update({
          where: { id: child.id },
          data: { depth: updatedDepth },
        });
        await updateDepthsRecursively(child.id, updatedDepth);
      }
    }

    const updatedNode = await tx.examSyllabusNode.update({
      where: { id: nodeId },
      data: {
        parentId: targetParentId || null,
        depth: newDepth,
        displayOrder: newDisplayOrder || node.displayOrder,
      },
    });

    await updateDepthsRecursively(nodeId, newDepth);

    await createAuditLog(
      adminUserId,
      'MOVE_SYLLABUS_NODE',
      'ExamSyllabusNode',
      nodeId,
      { parentId: node.parentId, depth: node.depth },
      { parentId: targetParentId, depth: newDepth }
    );

    return updatedNode;
  });
}

export async function reorderSyllabusNodes(
  syllabusId: string,
  orderedIds: string[],
  adminUserId?: string
) {
  const syllabus = await prisma.examSyllabus.findUnique({ where: { id: syllabusId } });
  if (!syllabus) {
    const error: any = new Error('Syllabus revision not found');
    error.code = 'EXAM_SYLLABUS_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  checkSyllabusEditable(syllabus.status);

  return prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.examSyllabusNode.update({
        where: { id: orderedIds[i] },
        data: { displayOrder: i + 1 },
      });
    }

    await createAuditLog(
      adminUserId,
      'REORDER_SYLLABUS_NODES',
      'ExamSyllabusNode',
      syllabusId,
      null,
      { count: orderedIds.length }
    );

    return { success: true };
  });
}

export async function deleteSyllabusNode(syllabusId: string, nodeId: string, adminUserId?: string) {
  const syllabus = await prisma.examSyllabus.findUnique({ where: { id: syllabusId } });
  if (!syllabus) {
    const error: any = new Error('Syllabus revision not found');
    error.code = 'EXAM_SYLLABUS_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  checkSyllabusEditable(syllabus.status);

  const node = await prisma.examSyllabusNode.findFirst({
    where: { id: nodeId, examSyllabusId: syllabusId },
    include: { children: true },
  });

  if (!node) {
    const error: any = new Error('Syllabus node not found');
    error.code = 'EXAM_SYLLABUS_NODE_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  if (node.children.length > 0) {
    const error: any = new Error(
      `Node has ${node.children.length} direct children. Use delete-subtree with explicit confirmation to delete.`
    );
    error.code = 'EXAM_SYLLABUS_SUBTREE_DELETE_CONFIRMATION_REQUIRED';
    error.status = 400;
    throw error;
  }

  await prisma.examSyllabusNode.delete({ where: { id: nodeId } });

  await createAuditLog(adminUserId, 'DELETE_SYLLABUS_NODE', 'ExamSyllabusNode', nodeId, node, null);

  return { success: true };
}

export async function deleteSubtreeNodes(syllabusId: string, nodeId: string, adminUserId?: string) {
  const syllabus = await prisma.examSyllabus.findUnique({ where: { id: syllabusId } });
  if (!syllabus) {
    const error: any = new Error('Syllabus revision not found');
    error.code = 'EXAM_SYLLABUS_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  checkSyllabusEditable(syllabus.status);

  const rootNode = await prisma.examSyllabusNode.findFirst({
    where: { id: nodeId, examSyllabusId: syllabusId },
  });

  if (!rootNode) {
    const error: any = new Error('Syllabus node not found');
    error.code = 'EXAM_SYLLABUS_NODE_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  // Get all descendant node IDs
  const allNodes = await prisma.examSyllabusNode.findMany({ where: { examSyllabusId: syllabusId } });

  function getDescendantIds(pId: string): string[] {
    const children = allNodes.filter((n) => n.parentId === pId);
    let ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      ids = ids.concat(getDescendantIds(child.id));
    }
    return ids;
  }

  const idsToDelete = [nodeId, ...getDescendantIds(nodeId)];

  await prisma.$transaction(async (tx) => {
    await tx.examSyllabusNode.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    await createAuditLog(
      adminUserId,
      'DELETE_SUBTREE',
      'ExamSyllabusNode',
      nodeId,
      { rootCode: rootNode.code },
      { deletedCount: idsToDelete.length }
    );
  });

  return { success: true, deletedCount: idsToDelete.length };
}

export async function setNodeActiveState(
  syllabusId: string,
  nodeId: string,
  isActive: boolean,
  adminUserId?: string
) {
  const syllabus = await prisma.examSyllabus.findUnique({ where: { id: syllabusId } });
  if (!syllabus) {
    const error: any = new Error('Syllabus revision not found');
    error.code = 'EXAM_SYLLABUS_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  checkSyllabusEditable(syllabus.status);

  const updated = await prisma.examSyllabusNode.update({
    where: { id: nodeId },
    data: { isActive },
  });

  await createAuditLog(
    adminUserId,
    isActive ? 'ACTIVATE_NODE' : 'DEACTIVATE_NODE',
    'ExamSyllabusNode',
    nodeId,
    null,
    { isActive }
  );

  return updated;
}

// -----------------------------------------------------------------------------
// VALIDATION & SUMMARY SERVICES
// -----------------------------------------------------------------------------

export async function validateSyllabusTree(syllabusId: string): Promise<SyllabusValidationResult> {
  const syllabus = await prisma.examSyllabus.findUnique({
    where: { id: syllabusId },
    include: {
      nodes: true,
      examPattern: {
        include: {
          stages: {
            include: { papers: true },
          },
        },
      },
    },
  });

  if (!syllabus) {
    return {
      isValid: false,
      isPublishable: false,
      issues: [
        {
          code: 'EXAM_SYLLABUS_NOT_FOUND',
          severity: 'ERROR',
          message: 'Syllabus revision not found',
        },
      ],
    };
  }

  const issues: SyllabusValidationIssue[] = [];
  const nodes = syllabus.nodes || [];

  // Check Title
  if (!syllabus.titleEn?.trim()) {
    issues.push({
      code: 'EXAM_SYLLABUS_TITLE_MISSING_EN',
      severity: 'ERROR',
      field: 'titleEn',
      message: 'English syllabus title is required',
    });
  }
  if (!syllabus.titleKn?.trim()) {
    issues.push({
      code: 'EXAM_SYLLABUS_TITLE_MISSING_KN',
      severity: 'ERROR',
      field: 'titleKn',
      message: 'Kannada syllabus title is required',
    });
  }

  // Check At Least One Active Root Node
  const rootNodes = nodes.filter((n) => !n.parentId && n.isActive);
  if (rootNodes.length === 0) {
    issues.push({
      code: 'EXAM_SYLLABUS_ORPHAN_NODE',
      severity: 'ERROR',
      message: 'Syllabus tree must contain at least one active root node',
    });
  }

  // Code Uniqueness & Depth & Scope & Bilingual Check
  const codeSet = new Set<string>();
  const validStageIds = new Set(syllabus.examPattern.stages.map((s) => s.id));
  const validPaperIds = new Set(syllabus.examPattern.stages.flatMap((s) => s.papers).map((p) => p.id));

  for (const node of nodes) {
    // Unique Code
    if (codeSet.has(node.code)) {
      issues.push({
        code: 'EXAM_SYLLABUS_NODE_CODE_EXISTS',
        severity: 'ERROR',
        nodeId: node.id,
        nodeCode: node.code,
        message: `Duplicate node code '${node.code}' found`,
      });
    }
    codeSet.add(node.code);

    // Depth Check
    if (node.depth > MAX_TREE_DEPTH) {
      issues.push({
        code: 'EXAM_SYLLABUS_MAX_DEPTH_EXCEEDED',
        severity: 'ERROR',
        nodeId: node.id,
        nodeCode: node.code,
        message: `Node '${node.code}' depth (${node.depth}) exceeds max limit of ${MAX_TREE_DEPTH}`,
      });
    }

    // Active Child with Inactive Parent Check
    if (node.isActive && node.parentId) {
      const parent = nodes.find((n) => n.id === node.parentId);
      if (parent && !parent.isActive) {
        issues.push({
          code: 'EXAM_SYLLABUS_ACTIVE_CHILD_INACTIVE_PARENT',
          severity: 'WARNING',
          nodeId: node.id,
          nodeCode: node.code,
          message: `Active node '${node.code}' has an inactive parent node '${parent.code}'`,
        });
      }
    }

    // Scope Validation
    if (node.scopeType === 'STAGE' && node.examStageId) {
      if (!validStageIds.has(node.examStageId)) {
        issues.push({
          code: 'EXAM_SYLLABUS_CROSS_PATTERN_SCOPE',
          severity: 'ERROR',
          nodeId: node.id,
          nodeCode: node.code,
          message: `Node '${node.code}' references a Stage outside the linked Pattern revision`,
        });
      }
    }

    if (node.scopeType === 'PAPER' && node.examPaperId) {
      if (!validPaperIds.has(node.examPaperId)) {
        issues.push({
          code: 'EXAM_SYLLABUS_CROSS_PATTERN_SCOPE',
          severity: 'ERROR',
          nodeId: node.id,
          nodeCode: node.code,
          message: `Node '${node.code}' references a Paper outside the linked Pattern revision`,
        });
      }
    }

    // Bilingual Check
    if (!node.nameEn?.trim()) {
      issues.push({
        code: 'EXAM_SYLLABUS_NODE_NAME_MISSING_EN',
        severity: 'ERROR',
        nodeId: node.id,
        nodeCode: node.code,
        field: 'nameEn',
        message: `Node '${node.code}' is missing English name`,
      });
    }
    if (!node.nameKn?.trim()) {
      issues.push({
        code: 'EXAM_SYLLABUS_NODE_NAME_MISSING_KN',
        severity: 'ERROR',
        nodeId: node.id,
        nodeCode: node.code,
        field: 'nameKn',
        message: `Node '${node.code}' is missing Kannada name`,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === 'ERROR');
  return {
    isValid: errors.length === 0,
    isPublishable: errors.length === 0,
    issues,
  };
}

export async function calculateSyllabusSummary(syllabusId: string): Promise<SyllabusCalculatedTotals> {
  const syllabus = await prisma.examSyllabus.findUnique({
    where: { id: syllabusId },
    include: { nodes: true },
  });

  if (!syllabus) {
    return {
      totalNodes: 0,
      activeNodes: 0,
      inactiveNodes: 0,
      rootNodesCount: 0,
      maxTreeDepth: 0,
      subjectsCount: 0,
      sectionsCount: 0,
      unitsCount: 0,
      topicsCount: 0,
      subtopicsCount: 0,
      knowledgeAreasCount: 0,
      globalScopedCount: 0,
      stageScopedCount: 0,
      paperScopedCount: 0,
      englishCompleteCount: 0,
      kannadaCompleteCount: 0,
      bothCompleteCount: 0,
      incompleteCount: 0,
      validationIssueCount: 0,
      publicationReadiness: 'INCOMPLETE',
    };
  }

  const nodes = syllabus.nodes || [];
  let maxDepth = 0;
  let enCount = 0;
  let knCount = 0;
  let bothCount = 0;
  let incCount = 0;

  for (const node of nodes) {
    if (node.depth > maxDepth) maxDepth = node.depth;
    const readiness = calculateNodeReadiness(node);
    if (readiness === 'BOTH_COMPLETE') bothCount++;
    else if (readiness === 'ENGLISH_COMPLETE') enCount++;
    else if (readiness === 'KANNADA_COMPLETE') knCount++;
    else incCount++;
  }

  const validation = await validateSyllabusTree(syllabusId);

  let publicationReadiness: SyllabusLanguageReadiness = 'INCOMPLETE';
  if (nodes.length > 0) {
    if (bothCount === nodes.length) publicationReadiness = 'BOTH_COMPLETE';
    else if (bothCount + enCount === nodes.length) publicationReadiness = 'ENGLISH_COMPLETE';
    else if (bothCount + knCount === nodes.length) publicationReadiness = 'KANNADA_COMPLETE';
  }

  return {
    totalNodes: nodes.length,
    activeNodes: nodes.filter((n) => n.isActive).length,
    inactiveNodes: nodes.filter((n) => !n.isActive).length,
    rootNodesCount: nodes.filter((n) => !n.parentId).length,
    maxTreeDepth: maxDepth,
    subjectsCount: nodes.filter((n) => n.nodeType === 'SUBJECT').length,
    sectionsCount: nodes.filter((n) => n.nodeType === 'SECTION').length,
    unitsCount: nodes.filter((n) => n.nodeType === 'UNIT').length,
    topicsCount: nodes.filter((n) => n.nodeType === 'TOPIC').length,
    subtopicsCount: nodes.filter((n) => n.nodeType === 'SUBTOPIC').length,
    knowledgeAreasCount: nodes.filter((n) => n.nodeType === 'KNOWLEDGE_AREA').length,
    globalScopedCount: nodes.filter((n) => n.scopeType === 'GLOBAL').length,
    stageScopedCount: nodes.filter((n) => n.scopeType === 'STAGE').length,
    paperScopedCount: nodes.filter((n) => n.scopeType === 'PAPER').length,
    englishCompleteCount: enCount,
    kannadaCompleteCount: knCount,
    bothCompleteCount: bothCount,
    incompleteCount: incCount,
    validationIssueCount: validation.issues.length,
    publicationReadiness,
  };
}

// -----------------------------------------------------------------------------
// WORKFLOW SERVICES
// -----------------------------------------------------------------------------

export async function triggerSyllabusWorkflow(
  examCycleId: string,
  syllabusId: string,
  action: 'submit-review' | 'request-changes' | 'approve' | 'publish',
  adminUserId?: string
) {
  const syllabus = await prisma.examSyllabus.findFirst({
    where: { id: syllabusId, examCycleId },
    include: {
      examCycle: true,
      examPattern: true,
    },
  });

  if (!syllabus) {
    const error: any = new Error('Syllabus revision not found');
    error.code = 'EXAM_SYLLABUS_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const validation = await validateSyllabusTree(syllabusId);

  switch (action) {
    case 'submit-review': {
      if (syllabus.status !== 'DRAFT' && syllabus.status !== 'CHANGES_REQUESTED') {
        const error: any = new Error(`Cannot submit for review from status ${syllabus.status}`);
        error.code = 'EXAM_SYLLABUS_INVALID_TRANSITION';
        error.status = 400;
        throw error;
      }
      if (!validation.isValid) {
        const error: any = new Error('Syllabus has validation errors and cannot be submitted for review');
        error.code = 'EXAM_SYLLABUS_INCOMPLETE';
        error.status = 400;
        error.details = validation.issues;
        throw error;
      }

      const updated = await prisma.examSyllabus.update({
        where: { id: syllabusId },
        data: {
          status: 'REVIEW_PENDING',
          reviewSubmittedAt: new Date(),
          updatedByAdminId: adminUserId,
        },
      });
      await createAuditLog(adminUserId, 'SUBMIT_SYLLABUS_REVIEW', 'ExamSyllabus', syllabusId, syllabus, updated);
      return updated;
    }

    case 'request-changes': {
      if (syllabus.status !== 'REVIEW_PENDING') {
        const error: any = new Error('Only REVIEW_PENDING syllabus revisions can have changes requested');
        error.code = 'EXAM_SYLLABUS_INVALID_TRANSITION';
        error.status = 400;
        throw error;
      }

      const updated = await prisma.examSyllabus.update({
        where: { id: syllabusId },
        data: {
          status: 'CHANGES_REQUESTED',
          reviewedAt: new Date(),
          reviewedByAdminId: adminUserId,
          updatedByAdminId: adminUserId,
        },
      });
      await createAuditLog(adminUserId, 'REQUEST_SYLLABUS_CHANGES', 'ExamSyllabus', syllabusId, syllabus, updated);
      return updated;
    }

    case 'approve': {
      if (syllabus.status !== 'REVIEW_PENDING') {
        const error: any = new Error('Only REVIEW_PENDING syllabus revisions can be approved');
        error.code = 'EXAM_SYLLABUS_INVALID_TRANSITION';
        error.status = 400;
        throw error;
      }
      if (!validation.isValid) {
        const error: any = new Error('Syllabus has validation errors and cannot be approved');
        error.code = 'EXAM_SYLLABUS_INCOMPLETE';
        error.status = 400;
        throw error;
      }

      const updated = await prisma.examSyllabus.update({
        where: { id: syllabusId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedByAdminId: adminUserId,
          updatedByAdminId: adminUserId,
        },
      });
      await createAuditLog(adminUserId, 'APPROVE_SYLLABUS', 'ExamSyllabus', syllabusId, syllabus, updated);
      return updated;
    }

    case 'publish': {
      if (syllabus.status !== 'APPROVED') {
        const error: any = new Error('Only APPROVED syllabus revisions can be published');
        error.code = 'EXAM_SYLLABUS_NOT_APPROVED';
        error.status = 400;
        throw error;
      }

      if (syllabus.examPattern.status !== 'PUBLISHED' || !syllabus.examPattern.isCurrent) {
        const error: any = new Error(
          'Linked Exam Pattern revision must be current and PUBLISHED before publishing a Syllabus'
        );
        error.code = 'EXAM_SYLLABUS_PATTERN_MISMATCH';
        error.status = 400;
        throw error;
      }

      if (syllabus.examCycle.status === 'DRAFT') {
        const error: any = new Error('Parent Exam Cycle cannot be in DRAFT status when publishing a Syllabus');
        error.code = 'EXAM_SYLLABUS_INVALID_TRANSITION';
        error.status = 400;
        throw error;
      }

      // Transactional Publication
      return prisma.$transaction(async (tx) => {
        // 1. Archive previously current syllabus
        await tx.examSyllabus.updateMany({
          where: { examCycleId, isCurrent: true, id: { not: syllabusId } },
          data: {
            isCurrent: false,
            status: 'ARCHIVED',
            archivedAt: new Date(),
          },
        });

        // 2. Publish target syllabus
        const published = await tx.examSyllabus.update({
          where: { id: syllabusId },
          data: {
            status: 'PUBLISHED',
            isCurrent: true,
            publishedAt: new Date(),
            publishedByAdminId: adminUserId,
            updatedByAdminId: adminUserId,
          },
        });

        await createAuditLog(adminUserId, 'PUBLISH_SYLLABUS', 'ExamSyllabus', syllabusId, syllabus, published);

        return published;
      });
    }

    default:
      throw new Error(`Unsupported workflow action ${action}`);
  }
}

// -----------------------------------------------------------------------------
// PUBLIC LOCALIZED API
// -----------------------------------------------------------------------------

export async function fetchPublicSyllabus(
  examSlug: string,
  language: Language = 'en',
  filters?: { stage?: string; paper?: string }
): Promise<PublicSyllabusResponse> {
  const seo = await prisma.examSEO.findFirst({
    where: {
      OR: [{ slugEn: examSlug }, { slugKn: examSlug }],
    },
    include: {
      examCycle: {
        include: {
          syllabi: {
            where: { status: 'PUBLISHED', isCurrent: true },
            include: {
              examPattern: true,
              nodes: {
                where: { isActive: true },
                include: {
                  examStage: true,
                  examPaper: true,
                },
                orderBy: [{ depth: 'asc' }, { displayOrder: 'asc' }],
              },
            },
          },
        },
      },
    },
  });

  if (!seo || !seo.examCycle) {
    const error: any = new Error(`Exam with slug '${examSlug}' not found`);
    error.code = 'EXAM_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const examCycle = seo.examCycle;

  // Visibility Check: PRIVATE cycles hidden
  if (examCycle.visibility === 'PRIVATE') {
    const error: any = new Error(`Exam with slug '${examSlug}' not found`);
    error.code = 'EXAM_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const publishedSyllabus = examCycle.syllabi[0];
  if (!publishedSyllabus) {
    const error: any = new Error(`No published syllabus available for exam '${examSlug}'`);
    error.code = 'EXAM_SYLLABUS_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const nodes = publishedSyllabus.nodes || [];

  // Filter by stage/paper if supplied
  let filteredNodes = nodes;
  if (filters?.stage) {
    filteredNodes = filteredNodes.filter(
      (n) => n.scopeType === 'GLOBAL' || n.examStage?.code.toLowerCase() === filters.stage?.toLowerCase()
    );
  }
  if (filters?.paper) {
    filteredNodes = filteredNodes.filter(
      (n) => n.scopeType === 'GLOBAL' || n.examPaper?.code.toLowerCase() === filters.paper?.toLowerCase()
    );
  }

  // Build Public Tree Hierarchy
  function buildPublicTree(parentId: string | null): PublicSyllabusNode[] {
    const children = filteredNodes.filter((n) => (n.parentId || null) === parentId);
    return children.map((n) => ({
      id: n.id,
      code: n.code,
      nodeType: n.nodeType,
      name: language === 'kn' ? n.nameKn : n.nameEn,
      shortName: language === 'kn' ? n.shortNameKn : n.shortNameEn,
      description: language === 'kn' ? n.descriptionKn : n.descriptionEn,
      officialText: language === 'kn' ? n.officialTextKn : n.officialTextEn,
      scopeType: n.scopeType,
      stageCode: n.examStage?.code || null,
      paperCode: n.examPaper?.code || null,
      displayOrder: n.displayOrder,
      depth: n.depth,
      sourceReference: n.sourceReference,
      children: buildPublicTree(n.id),
    }));
  }

  const tree = buildPublicTree(null);

  return {
    syllabusId: publishedSyllabus.id,
    examCycleId: examCycle.id,
    examSlug,
    examTitle: language === 'kn' ? examCycle.titleKn : examCycle.titleEn,
    syllabusRevisionNumber: publishedSyllabus.revisionNumber,
    patternRevisionNumber: publishedSyllabus.examPattern.revisionNumber,
    language,
    title: language === 'kn' ? publishedSyllabus.titleKn : publishedSyllabus.titleEn,
    description: language === 'kn' ? publishedSyllabus.descriptionKn : publishedSyllabus.descriptionEn,
    generalInstructions:
      language === 'kn' ? publishedSyllabus.generalInstructionsKn : publishedSyllabus.generalInstructionsEn,
    tree,
  };
}

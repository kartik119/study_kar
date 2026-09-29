import { Prisma, WorkAssignment, WorkAssignmentStatus, WorkAssignmentPriority } from '@prisma/client';
import { prisma } from '@study-karnataka/database';
import { CreateWorkAssignmentDto, UpdateWorkAssignmentDto } from '../dto/work-assignment.dto';

export class WorkAssignmentService {
  async getAssignments(filters: any, page: number = 1, limit: number = 10) {
    const where: Prisma.WorkAssignmentWhereInput = {};

    if (filters.search) {
      where.OR = [
        { assignmentCode: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { assignee: { fullName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    if (filters.assignmentType) where.assignmentType = filters.assignmentType;
    if (filters.roleId) where.roleId = filters.roleId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.examScopeId) {
      where.examScopes = { some: { examProgrammeId: filters.examScopeId } };
    }

    const [total, data] = await Promise.all([
      prisma.workAssignment.count({ where }),
      prisma.workAssignment.findMany({
        where,
        include: {
          assignee: { select: { id: true, fullName: true, avatarUrl: true, adminProfile: true } },
          role: { select: { id: true, name: true, code: true } },
          reportingManager: { select: { id: true, fullName: true, avatarUrl: true } },
          examScopes: { include: { examProgramme: { select: { id: true, nameEn: true } } } },
          modules: true,
          targetStudents: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAssignmentById(id: string) {
    const assignment = await prisma.workAssignment.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, avatarUrl: true, email: true, adminProfile: true } },
        role: { select: { id: true, name: true, code: true } },
        reportingManager: { select: { id: true, fullName: true, avatarUrl: true } },
        examScopes: { include: { examProgramme: { select: { id: true, nameEn: true, code: true } } } },
        modules: true,
        targetStudents: { include: { student: { select: { id: true, fullName: true, email: true } } } },
      },
    });
    if (!assignment) throw new Error('Assignment not found');
    return assignment;
  }

  async createAssignment(data: CreateWorkAssignmentDto, createdBy: string) {
    // Basic validation logic
    const assignee = await prisma.adminUser.findUnique({
      where: { id: data.assigneeId },
      include: { adminRoles: true, moduleAccess: true, examScopes: true, mentorProfile: true },
    });
    if (!assignee || !assignee.isActive) throw new Error('Assignee is invalid or inactive');

    const hasRole = assignee.adminRoles.some((r: any) => r.roleId === data.roleId);
    if (!hasRole) throw new Error('Assignee does not have the specified role');

    // MENTOR CAPACITY CHECK
    if (data.assignmentType === 'STUDENT_MENTORSHIP' && data.targetStudentIds && data.targetStudentIds.length > 0) {
      if (assignee.mentorProfile?.maxCapacity) {
         const currentAssigned = await prisma.workAssignmentStudent.count({
           where: {
             assignment: {
               assigneeId: data.assigneeId,
               status: { in: ['ACTIVE', 'IN_PROGRESS', 'PENDING_REVIEW'] }
             }
           }
         });
         const newUniqueCapacity = currentAssigned + data.targetStudentIds.length; // Simplified for now
         if (newUniqueCapacity > assignee.mentorProfile.maxCapacity) {
           throw new Error(`Exceeds mentor capacity. Current: ${currentAssigned}, Max: ${assignee.mentorProfile.maxCapacity}`);
         }
      }
    }

    // Auto-generate assignment code if not provided (placeholder logic)
    const count = await prisma.workAssignment.count();
    const assignmentCode = `WA-${1000 + count + 1}`;

    return await prisma.$transaction(async (tx: any) => {
      const assignment = await tx.workAssignment.create({
        data: {
          assignmentCode,
          title: data.title,
          description: data.description,
          assignmentType: data.assignmentType,
          assigneeId: data.assigneeId,
          roleId: data.roleId,
          reportingManagerId: data.reportingManagerId,
          priority: data.priority || WorkAssignmentPriority.MEDIUM,
          status: data.status || WorkAssignmentStatus.SCHEDULED,
          startDate: new Date(data.startDate),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          visibleToAssignee: data.visibleToAssignee ?? true,
          reviewRequired: data.reviewRequired ?? false,
          autoNotifyAssignee: data.autoNotifyAssignee ?? true,
          escalateIfOverdue: data.escalateIfOverdue ?? false,
          slaValue: data.slaValue,
          slaUnit: data.slaUnit,
          instructions: data.instructions,
          internalNotes: data.internalNotes,
          createdBy,
          
          modules: {
            create: data.moduleCodes?.map((code) => ({ moduleCode: code })) || [],
          },
          examScopes: {
            create: data.examScopeIds?.map((id) => ({ examProgrammeId: id })) || [],
          },
          targetStudents: {
            create: data.targetStudentIds?.map((id) => ({ studentId: id })) || [],
          },
          targetStudyMaterials: {
            create: data.targetStudyMaterialIds?.map((id) => ({ studyMaterialId: id })) || [],
          },
          targetMcqQuestions: {
            create: data.targetMcqQuestionIds?.map((id) => ({ mcqQuestionId: id })) || [],
          },
          targetCurrentAffairs: {
            create: data.targetCurrentAffairIds?.map((id) => ({ currentAffairId: id })) || [],
          },
        },
      });

      // Audit Log
      await tx.adminAuditLog.create({
        data: {
          adminUserId: createdBy,
          action: 'WORK_ASSIGNMENT_CREATED',
          module: 'TEAM',
          recordType: 'WorkAssignment',
          recordId: assignment.id,
          newValue: JSON.parse(JSON.stringify(assignment)),
          reason: 'Created assignment',
        }
      });

      return assignment;
    });
  }

  async updateStatus(id: string, status: WorkAssignmentStatus, adminId: string, comments?: string) {
    const assignment = await prisma.workAssignment.findUnique({ where: { id } });
    if (!assignment) throw new Error('Assignment not found');

    const updateData: any = { status };
    if (status === 'COMPLETED') updateData.completedAt = new Date();
    if (status === 'CANCELLED') updateData.cancelledAt = new Date();
    if (status === 'PENDING_REVIEW') updateData.submittedForReviewAt = new Date();

    // STATUS WORKFLOW VALIDATION
    if (status === 'COMPLETED' && assignment.reviewRequired && assignment.status !== 'PENDING_REVIEW') {
      throw new Error('Assignment requires review before completion');
    }
    if (status === 'PENDING_REVIEW' && assignment.status !== 'IN_PROGRESS') {
      throw new Error('Can only submit for review from IN_PROGRESS state');
    }
    if (status === 'IN_PROGRESS' && assignment.status === 'PENDING_REVIEW' && !comments) {
      throw new Error('Returning for changes requires comments');
    }

    return await prisma.$transaction(async (tx: any) => {
      const updated = await tx.workAssignment.update({
        where: { id },
        data: updateData,
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId: adminId,
          action: 'WORK_ASSIGNMENT_STATUS_CHANGED',
          module: 'TEAM',
          recordType: 'WorkAssignment',
          recordId: id,
          previousValue: { status: assignment.status },
          newValue: { status: updated.status },
          reason: comments || `Status changed to ${status}`,
        }
      });

      return updated;
    });
  }

  async reassign(id: string, newAssigneeId: string, adminId: string, comments?: string) {
    const assignment = await prisma.workAssignment.findUnique({ where: { id }, include: { role: true } });
    if (!assignment) throw new Error('Assignment not found');

    const newAssignee = await prisma.adminUser.findUnique({
      where: { id: newAssigneeId },
      include: { adminRoles: true }
    });
    if (!newAssignee || !newAssignee.isActive) throw new Error('New assignee is invalid or inactive');
    
    const hasRole = newAssignee.adminRoles.some((r: any) => r.roleId === assignment.roleId);
    if (!hasRole) throw new Error('New assignee does not have the required role');

    return await prisma.$transaction(async (tx: any) => {
      const updated = await tx.workAssignment.update({
        where: { id },
        data: { assigneeId: newAssigneeId }
      });
      
      await tx.adminAuditLog.create({
        data: {
          adminUserId: adminId,
          action: 'WORK_ASSIGNMENT_REASSIGNED',
          module: 'TEAM',
          recordType: 'WorkAssignment',
          recordId: id,
          previousValue: { assigneeId: assignment.assigneeId },
          newValue: { assigneeId: newAssigneeId },
          reason: comments || 'Reassigned',
        }
      });
      return updated;
    });
  }

  async getKpis() {
    const total = await prisma.workAssignment.count();
    const active = await prisma.workAssignment.count({
      where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
    });
    const pendingReview = await prisma.workAssignment.count({
      where: { status: 'PENDING_REVIEW' },
    });
    const overdue = await prisma.workAssignment.count({
      where: {
        dueDate: { lt: new Date() },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    return {
      total,
      active,
      pendingReview,
      overdue,
    };
  }
}

export const workAssignmentService = new WorkAssignmentService();

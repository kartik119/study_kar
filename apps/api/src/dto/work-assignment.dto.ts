import { WorkAssignmentStatus, WorkAssignmentPriority } from '@prisma/client';

export interface CreateWorkAssignmentDto {
  title: string;
  description?: string;
  assignmentType: string;
  assigneeId: string;
  roleId: string;
  reportingManagerId?: string;
  priority?: WorkAssignmentPriority;
  status?: WorkAssignmentStatus;
  startDate: string;
  dueDate?: string;
  visibleToAssignee?: boolean;
  reviewRequired?: boolean;
  autoNotifyAssignee?: boolean;
  escalateIfOverdue?: boolean;
  slaValue?: number;
  slaUnit?: string;
  instructions?: string;
  internalNotes?: string;
  moduleCodes?: string[];
  examScopeIds?: string[];
  targetStudentIds?: string[];
  targetStudyMaterialIds?: string[];
  targetMcqQuestionIds?: string[];
  targetCurrentAffairIds?: string[];
}

export interface UpdateWorkAssignmentDto extends Partial<CreateWorkAssignmentDto> {}

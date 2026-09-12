/**
 * Study Karnataka Shared Types
 */

export type Language = 'en' | 'kn';

export enum PreparationLanguage {
  ENGLISH = 'en',
  KANNADA = 'kn',
}

export type OtpPurpose = 'STUDENT_REGISTRATION' | 'STUDENT_LOGIN' | 'GUARDIAN_CONSENT';
export type SessionPlatform = 'WEB' | 'ANDROID' | 'IOS' | 'ADMIN_WEB';
export type ConsentStatus = 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REVOKED';

export type PermissionKey =
  | 'dashboard.view'
  | 'exams.view'
  | 'exams.create'
  | 'exams.update'
  | 'exams.submit_review'
  | 'exams.review'
  | 'exams.approve'
  | 'exams.publish'
  | 'exams.close'
  | 'exams.archive'
  | 'exams.authorities.manage'
  | 'exams.programmes.manage'
  | 'exams.stages.manage'
  | 'exams.papers.manage'
  | 'exams.pattern.manage'
  | 'exams.syllabus.manage'
  | 'exams.analytics.view'
  | 'study_materials.view'
  | 'mcq_tests.view'
  | 'test_series.view'
  | 'test_series.create'
  | 'test_series.edit'
  | 'test_series.submit_review'
  | 'test_series.review'
  | 'test_series.approve'
  | 'test_series.publish'
  | 'test_series.archive'
  | 'ranked_tests.view'
  | 'ranked_tests.create'
  | 'ranked_tests.edit'
  | 'ranked_tests.activate'
  | 'ranked_tests.close'
  | 'ranked_tests.attempts.view'
  | 'ranked_tests.attempts.invalidate'
  | 'ranked_tests.results.generate'
  | 'ranked_tests.results.publish'
  | 'ranked_tests.archive'
  | 'study_plans.view'
  | 'students.view'
  | 'current_affairs.view'
  | 'quick_revision.view'
  | 'subscriptions_payments.view'
  | 'team.view'
  | 'support.view'
  | 'settings.view'
  | 'students.sensitive_dob.view'
  | 'students.sensitive_guardian.view'
  | 'auth.sessions.view'
  | 'auth.sessions.revoke'
  | 'admin.roles.view'
  | 'admin.roles.manage'
  | 'audit_logs.view'
  | 'academic_taxonomy.manage'
  | 'study_materials.create'
  | 'study_materials.update'
  | 'study_materials.archive'
  | 'study_materials.delete_draft'
  | 'study_materials.submit_review'
  | 'study_materials.review'
  | 'study_materials.approve'
  | 'study_materials.publish'
  | 'study_materials.access.manage'
  | 'tests.view'
  | 'tests.create'
  | 'tests.edit'
  | 'tests.submit_review'
  | 'tests.review'
  | 'tests.approve'
  | 'tests.publish'
  | 'tests.archive'
  | 'study_materials.access.preview'
  | 'study_materials.access.override'
  | 'mcq.view'
  | 'mcq.create'
  | 'mcq.edit'
  | 'mcq.submit_review'
  | 'mcq.review'
  | 'mcq.approve'
  | 'mcq.archive'
  | 'performance_analytics.view'
  | 'student_performance.view'
  | 'performance_analytics.rebuild';

export interface StudentLanguagePreference {
  language: PreparationLanguage;
  isLocked: boolean;
  lockedAt?: Date | string | null;
}

export enum SystemRole {
  SUPER_ADMIN = 'Super Admin',
  CONTENT_MANAGER = 'Content Manager',
  CONTENT_REVIEWER = 'Content Reviewer',
  SUPPORT_EXECUTIVE = 'Support Executive',
}

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type AccountType = 'STUDENT' | 'ADMIN';

export type AuditLogAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PERMISSION_CHANGE'
  | 'VIEW_SENSITIVE';

export interface Role {
  id: string;
  name: SystemRole | string;
  description?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Permission {
  id: string;
  code: PermissionKey | string;
  name: string;
  description?: string | null;
}

export interface StudentProfile {
  id: string;
  userId: string;
  dateOfBirth: Date | string;
  age?: number;
  isMinor?: boolean;
  preparationLanguage: PreparationLanguage;
  preparationLanguageLockedAt?: Date | string | null;
  profileCompletedAt?: Date | string | null;
  guardianConsent?: GuardianConsent | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GuardianConsent {
  id: string;
  studentUserId: string;
  guardianName: string;
  guardianRelationship: string;
  guardianMobile: string;
  consentStatus: ConsentStatus;
  consentRequestedAt: Date | string;
  consentVerifiedAt?: Date | string | null;
  verificationMethod?: string | null;
}

export interface User {
  id: string;
  email?: string | null;
  mobile?: string | null;
  fullName: string;
  accountType: AccountType;
  accountStatus: AccountStatus;
  preparationLanguage: PreparationLanguage;
  isLanguageLocked: boolean;
  isActive: boolean;
  emailVerifiedAt?: Date | string | null;
  mobileVerifiedAt?: Date | string | null;
  lastLoginAt?: Date | string | null;
  studentProfile?: StudentProfile | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  accountStatus: AccountStatus;
  isActive: boolean;
  roles: Role[];
  permissions?: PermissionKey[];
  lastLoginAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceId?: string | null;
  deviceName?: string | null;
  platform: SessionPlatform;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date | string;
  lastUsedAt: Date | string;
  createdAt: Date | string;
}

export interface AdminAuditLog {
  id: string;
  adminUserId: string;
  action: AuditLogAction | string;
  module: string;
  recordType?: string | null;
  recordId?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date | string;
}

export interface TokenPayload {
  userId: string;
  accountType: AccountType;
  roles?: string[];
  permissions?: PermissionKey[];
  sessionId: string;
}

export interface UserAuthResponse {
  user: User | AdminUser;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: PaginationMeta | Record<string, unknown>;
  timestamp: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  api: boolean;
  database: boolean;
  version: string;
  environment: string;
  timestamp: string;
}

export * from './exam.types';
export * from './exam-pattern.types';
export * from './exam-syllabus.types';
export * from './exam-analytics.types';
export * from './academic-taxonomy.types';
export * from './study-material.types';
export * from './mcq.types';
export * from './test.types';
export * from './test-series.types';
export * from './ranked-test.types';
export * from './topic-practice.types';
export * from './performance-analytics.types';

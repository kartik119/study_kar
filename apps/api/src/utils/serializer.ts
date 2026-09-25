// @ts-nocheck
import { PermissionKey } from '@study-karnataka/shared-types';
import { calculateAge, isMinor } from '@study-karnataka/validation';

export function serializeStudent(
  user: any,
  requesterPermissions: PermissionKey[] = [],
  isSelf = false
): Record<string, unknown> {
  const canViewDob = isSelf || requesterPermissions.includes('students.sensitive_dob.view');
  const canViewGuardian = isSelf || requesterPermissions.includes('students.sensitive_guardian.view');

  const profile = user.studentProfile || {};
  const dob = profile.dateOfBirth;

  const activePlan = user.studyPlans?.find((p: any) => p.status === 'ACTIVE') || user.studyPlans?.[0];
  const planName = activePlan ? (activePlan.template?.titleEn || activePlan.plannerRule?.name || activePlan.examCycle?.titleEn || 'Custom Study Plan') : null;
  const chosenExam = activePlan?.examCycle?.titleEn || null;

  let planDetails = null;
  if (activePlan) {
    const tasks = activePlan.tasks || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => !!t.actualCompletionDate).length;
    const overdueTasks = tasks.filter((t: any) => !t.actualCompletionDate && t.studyPlanDay?.date && new Date(t.studyPlanDay.date) < new Date()).length;
    
    planDetails = {
      startDate: activePlan.planStartDate,
      targetDate: activePlan.examDate || activePlan.estimatedConceptCompletionDate,
      overallCompletion: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      tasksCompleted: completedTasks,
      tasksPending: totalTasks - completedTasks,
      overdueTasks: overdueTasks,
      totalTasks: totalTasks
    };
  }

  const result: Record<string, unknown> = {
    id: user.id,
    fullName: user.fullName,
    mobile: user.mobile ? `${user.mobile.slice(0, 3)}****${user.mobile.slice(7)}` : null,
    accountType: user.accountType,
    accountStatus: user.accountStatus,
    preparationLanguage: profile.preparationLanguage || user.preparationLanguage,
    isLanguageLocked: !!profile.preparationLanguageLockedAt || user.isLanguageLocked,
    preparationLanguageLockedAt: profile.preparationLanguageLockedAt || null,
    profileCompletedAt: profile.profileCompletedAt || null,
    createdAt: user.createdAt,
    studyPlanName: planName,
    chosenExam: chosenExam,
    planDetails: planDetails,
  };

  if (dob && canViewDob) {
    result.dateOfBirth = dob;
    result.age = calculateAge(dob);
    result.isMinor = isMinor(dob);
  }

  if (user.guardianConsents && user.guardianConsents.length > 0 && canViewGuardian) {
    const activeConsent = user.guardianConsents[0];
    result.guardianConsent = {
      id: activeConsent.id,
      guardianName: activeConsent.guardianName,
      guardianRelationship: activeConsent.guardianRelationship,
      guardianMobile: activeConsent.guardianMobile ? `${activeConsent.guardianMobile.slice(0, 3)}****${activeConsent.guardianMobile.slice(7)}` : null,
      consentStatus: activeConsent.consentStatus,
      consentRequestedAt: activeConsent.consentRequestedAt,
      consentVerifiedAt: activeConsent.consentVerifiedAt,
    };
  }

  return result;
}

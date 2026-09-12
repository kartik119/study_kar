import { z } from 'zod';

// Regex Rules
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
export const OTP_REGEX = /^\d{6}$/;

// Base Schemas
export const IndianMobileNumberSchema = z
  .string()
  .trim()
  .regex(INDIAN_MOBILE_REGEX, 'Invalid Indian 10-digit mobile number. Must start with 6, 7, 8, or 9');

export const OtpCodeSchema = z
  .string()
  .trim()
  .regex(OTP_REGEX, 'OTP must be a 6-digit numeric code');

export const EmailSchema = z.string().trim().email('Invalid email address format');

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long');

export const PreparationLanguageSchema = z.enum(['en', 'kn'], {
  errorMap: () => ({ message: 'Preparation language must be Kannada (kn) or English (en)' }),
});

export const DateOfBirthSchema = z.preprocess((arg) => {
  if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
  return arg;
}, z.date({ invalid_type_error: 'Invalid date of birth' }).max(new Date(), 'Date of birth cannot be in the future'));

export const UUIDSchema = z.string().uuid('Invalid UUID identifier');

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Age Calculation Utilities
export function calculateAge(dobInput: Date | string): number {
  const dob = typeof dobInput === 'string' ? new Date(dobInput) : dobInput;
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

export function isMinor(dobInput: Date | string): boolean {
  return calculateAge(dobInput) < 18;
}

// Language Lock Helpers
export function canUpdatePreparationLanguage(isLocked: boolean): boolean {
  return !isLocked;
}

export function validateLanguageUpdate(
  currentLanguage: string,
  newLanguage: string,
  isLocked: boolean
): { allowed: boolean; reason?: string } {
  if (isLocked) {
    return {
      allowed: false,
      reason: 'Preparation language is locked for active study plan.',
    };
  }
  return { allowed: true };
}

// Student Registration & Auth Schemas
export const RequestOtpSchema = z.object({
  mobile: IndianMobileNumberSchema,
  purpose: z.enum(['STUDENT_REGISTRATION', 'STUDENT_LOGIN', 'GUARDIAN_CONSENT']),
});

export const VerifyOtpSchema = z.object({
  mobile: IndianMobileNumberSchema,
  otp: OtpCodeSchema,
  purpose: z.enum(['STUDENT_REGISTRATION', 'STUDENT_LOGIN', 'GUARDIAN_CONSENT']),
});

export const GuardianDetailsSchema = z.object({
  guardianName: z.string().trim().min(2, 'Guardian name is required'),
  guardianRelationship: z.string().trim().min(2, 'Guardian relationship is required (e.g. Father, Mother, Legal Guardian)'),
  guardianMobile: IndianMobileNumberSchema,
});

export const StudentRegistrationSchema = z
  .object({
    mobile: IndianMobileNumberSchema,
    fullName: z.string().trim().min(2, 'Full name is required'),
    dateOfBirth: DateOfBirthSchema,
    preparationLanguage: PreparationLanguageSchema,
    email: EmailSchema.optional().or(z.literal('')),
    guardianDetails: GuardianDetailsSchema.optional(),
  })
  .refine(
    (data) => {
      const minor = isMinor(data.dateOfBirth);
      if (minor) {
        return data.guardianDetails !== undefined && data.guardianDetails !== null;
      }
      return true;
    },
    {
      message: 'Guardian details are required for students under 18 years of age',
      path: ['guardianDetails'],
    }
  );

export const AdminLoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export const UpdatePreparationLanguageSchema = z.object({
  preparationLanguage: PreparationLanguageSchema,
});

export * from './exam';
export * from './exam-pattern';
export * from './exam-syllabus';
export * from './exam-analytics';
export * from './academic-taxonomy';
export * from './study-material';
export * from './mcq';
export * from './test';
export * from './test-series';
export * from './ranked-test';

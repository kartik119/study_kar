# Development Prompt 2 — Authentication, Student Registration, DOB, Locked Preparation Language and Role-Based Access Checkpoint

## 1. Summary of Changes
Development Prompt 2 implements the complete authentication, student profile lifecycle, age verification, minor guardian consent workflow, locked preparation language mechanism, and granular RBAC security architecture across the Study Karnataka monorepo platform.

### Key Deliverables Completed & Verified:
1. **Database Schema & Migrations (`packages/database`)**:
   - Added models: `StudentProfile`, `OTPChallenge`, `UserSession`, `GuardianConsent`, `AdminAuditLog`.
   - Updated `User` and `AdminUser` models with auth metadata (`failedLoginCount`, `lockedUntil`, `lastLoginAt`).
   - Defined 19 granular system permissions mapped across 4 system roles (`Super Admin`, `Content Manager`, `Content Reviewer`, `Support Executive`).
   - Seeded initial permissions and Bootstrap Super Admin (`admin@studykarnataka.com`) driven dynamically via `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`.
   - Migration file generated and committed: `packages/database/prisma/migrations/20260804170000_authentication_student_profile_and_rbac/migration.sql`.

2. **Validation & Shared Utilities (`packages/validation` & `packages/shared-types`)**:
   - Timezone-safe `calculateAge(dob)` and `isMinor(dob)` age calculation functions.
   - Unit test suite (`packages/validation/src/__tests__/age.test.ts`) covering leap year boundaries, birthday today/tomorrow, and minor threshold checks (14 passing unit tests).
   - Zod validation schemas for Indian mobile (`/^[6-9]\d{9}$/`), 6-digit OTP, date of birth, guardian details, and preparation language update.

3. **Backend API Endpoints (`apps/api`)**:
   - OTP Service (`/auth/student/otp/request`, `/auth/student/otp/verify`) with rate limiting, cooldown, and 5-attempt brute-force protection.
   - Under-18 Guardian Consent workflow (`/auth/guardian/otp/request`, `/auth/guardian/otp/verify`).
   - Admin Login (`/auth/admin/login`) with bcrypt password comparison, failed attempt tracking, and 15-minute lockout after 5 consecutive failures.
   - Session Management (`/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `/auth/sessions`, `DELETE /auth/sessions/:sessionId`).
   - Student Profile & Language endpoints (`/students/me`, `PATCH /students/me/preparation-language`, `POST /students/me/preparation-language/lock`).
   - Serialization utility stripping DOB & guardian info for unauthorized administrative roles (`Content Manager`, `Content Reviewer`).

4. **Sensitive Student-Data Access Controls & Audit Logging**:
   - **Super Admin**: Has full read access to student DOB (`dateOfBirth`) and guardian consent details (`guardianConsent`).
   - **Support Executive**: Has read-only access to DOB and guardian details; every access to sensitive student profile creates a security entry in `AdminAuditLog` (`action = 'SENSITIVE_DATA_ACCESS'`).
   - **Content Manager**: Lacks `students.view` and sensitive permissions; attempts to access student profiles return `403 Forbidden` and serialization strips DOB and guardian details.
   - **Content Reviewer**: Lacks `students.view` and sensitive permissions; attempts to access student profiles return `403 Forbidden` and serialization strips DOB and guardian details.

5. **Frontend Applications (`apps/admin-web`, `apps/student-web`, `apps/mobile`, `apps/public-web`)**:
   - `admin-web`: Login screen with show/hide password toggle, lockout error alerts, and permission-filtered sidebar navigation matching user role permissions (`admin@studykarnataka.com`).
   - `student-web`: Mobile OTP flow, registration form with mandatory DOB & preparation language selection, minor guardian consent step, and language lock controls.
   - `mobile`: Native Expo screens for mobile entry, OTP verification, registration, language selection, minor consent state, and authenticated student dashboard.

---

## 2. Environment Variables Verified
- `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/study_karnataka?schema=public"`
- `JWT_ACCESS_SECRET="sk_dev_access_secret_key_2026_super_secure_900s"`
- `JWT_REFRESH_SECRET="sk_dev_refresh_secret_key_2026_super_secure_7d"`
- `BOOTSTRAP_ADMIN_EMAIL="admin@studykarnataka.com"`
- `BOOTSTRAP_ADMIN_PASSWORD="Admin@StudyKar2026"`

---

## 3. Database Migration & Seed Verification
- Migration Path: `packages/database/prisma/migrations/20260804170000_authentication_student_profile_and_rbac/migration.sql`
- Deployment status: `pnpm db:migrate:deploy` executed cleanly (`No pending migrations`).
- Seed status: `pnpm db:seed` verified 4 roles (`Super Admin`, `Content Manager`, `Content Reviewer`, `Support Executive`), 19 permissions, role-permission mappings, and bootstrap admin (`admin@studykarnataka.com`).

---

## 4. Test & Workspace Build Verification Results
- `pnpm lint`: Passed (10 of 10 workspace projects clean)
- `pnpm typecheck`: Passed (10 of 10 workspace projects clean)
- `pnpm test`: Passed (7 API integration tests, 14 validation unit tests, admin route tests, and mobile tests clean)
- `pnpm --filter @study-karnataka/mobile type-check`: Passed
- `pnpm --filter @study-karnataka/mobile test`: Passed
- `pnpm build`: Passed (All packages and 5 applications built cleanly)

---

## 5. Visual Artifacts
- **Adult Registration Form**:
  [Adult Registration](file:///Users/kanishk/LGM%20SK/docs/checkpoints/screenshots/prompt-02/adult_registration.png)

- **Minor Registration Form**:
  [Minor Registration](file:///Users/kanishk/LGM%20SK/docs/checkpoints/screenshots/prompt-02/minor_registration.png)

- **Guardian Consent Pending Workflow**:
  [Guardian Consent Pending](file:///Users/kanishk/LGM%20SK/docs/checkpoints/screenshots/prompt-02/guardian_consent_pending.png)

- **Locked Preparation Language**:
  [Locked Preparation Language](file:///Users/kanishk/LGM%20SK/docs/checkpoints/screenshots/prompt-02/locked_preparation_language.png)

---

## 6. Security and Privacy Verification Commit
- **Commit Message**: `chore: close Prompt 2 security and privacy verification`
- **Git Status**: clean

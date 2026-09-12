# Development Prompt 4 Checkpoint — Exam Stages, Papers and Exam Pattern

**Completion Status**: VERIFIED & CLOSED  
**Baseline Commit**: `5769b497dbded2022ff13c9cbccfd7fda88c4a68`  
**Closure Commit Hash**: `3308a4a9cf2a5a64698a10a49656be1aecc70336`  
**Migration Path**: `packages/database/prisma/migrations/20260805120000_exam_stages_papers_and_pattern/migration.sql`  

---

## 1. Migration and Schema Verification

- **Exact Migration Path**: `packages/database/prisma/migrations/20260805120000_exam_stages_papers_and_pattern/migration.sql`
- **Models Verified**: `ExamPattern`, `ExamStage`, `ExamPaper`, `ExamPaperSection`
- **Enums Verified**: `ExamPatternStatus`, `ExamStageType`, `ExamAssessmentMode`, `ExamQuestionFormat`, `ExamMediumRule`, `NegativeMarkingType`, `QualifyingRuleType`
- **ExamImportantDate Stage-Link Verification**:
  - `ExamImportantDate.examStageId` relation created to `ExamStage`.
  - Existing Prompt 3 important dates remain intact.
  - Cycle-level dates may remain without a Stage (`examStageId: null`).
  - Stage-linked important dates are strictly validated: a date can only link to an `ExamStage` belonging to the same `ExamCycle`.
  - Cross-cycle stage/date linking is rejected with code `CROSS_CYCLE_STAGE_LINKING_REJECTED` (HTTP 400).

---

## 2. Pattern Publication Transaction & Single-Current Enforcement

- Publishing an `APPROVED` Pattern runs inside a Prisma `$transaction`.
- Published Pattern becomes `isCurrent = true` and `status = 'PUBLISHED'`.
- Only one Pattern per Exam Cycle can be current (`@@unique([examCycleId, isCurrent])` / transactional update).
- Previously current Pattern becomes `isCurrent = false` and status transitions to `ARCHIVED`.
- If publication fails midway, the transaction rolls back cleanly with no partial state committed.
- Parent Exam Cycle publication is decoupled: publishing a pattern does not automatically alter parent cycle status.
- Private parent Exam Cycles remain hidden from public access.

---

## 3. Published Immutability Verification

Published Patterns strictly block:
- Pattern metadata edits
- Stage additions/edits/deletions/reordering
- Paper additions/edits/deletions/reordering
- Section additions/edits/deletions/reordering
- Stage/Paper/Section deactivations

All attempt mutations return HTTP 400 with error code:
`EXAM_PATTERN_PUBLISHED_IMMUTABLE`

---

## 4. Revision Cloning Verification

- Next revision number is auto-calculated (`revisionNumber = currentMax + 1`).
- Cloned `ExamPattern`, `ExamStage`, `ExamPaper`, and `ExamPaperSection` records receive new UUID primary keys.
- `sourcePatternId` is preserved pointing to the parent revision.
- Previous published/historical revision remains unchanged.
- New revision initializes in `DRAFT` status with `isCurrent = false`.
- Clone operation creates an audit log (`CLONE_PATTERN_REVISION`).
- Deep cloning executes transactionally inside `prisma.$transaction`.

---

## 5. Public Localized API Rules (`GET /api/v1/exams/:slug/pattern`)

- Returns only current `PUBLISHED` Pattern.
- Hides `DRAFT`, `REVIEW_PENDING`, `APPROVED` (unpublished), and `ARCHIVED` historical revisions.
- Hides patterns belonging to `PRIVATE` Exam Cycles (returns 404 `EXAM_NOT_FOUND`).
- Supports exact-slug pattern access for `UNLISTED` Exam Cycles.
- Returns English-only content when `language=en`.
- Returns Kannada-only content when `language=kn`.
- Does not expose admin user IDs, audit trail data, or internal RBAC permission keys.

---

## 6. RBAC & System Permission Audit

- Total System Permissions: **32 Granular Permissions**
- 3 New Prompt 4 Permissions added:
  1. `exams.stages.manage`: Stage CRUD and reordering.
  2. `exams.papers.manage`: Paper and section CRUD and reordering.
  3. `exams.pattern.manage`: Pattern revision creation, editing, cloning, and deletion.
- Role Access Matrix:
  - **Super Admin**: Has all 32 permissions.
  - **Content Manager**: Can manage `DRAFT` pattern structure and submit for review; cannot approve or publish (403).
  - **Content Reviewer**: Can review and approve/request-changes; cannot edit pattern structure or publish (403).
  - **Support Executive**: Receives 403 `FORBIDDEN` for pattern management operations.
- Re-running `pnpm db:seed` is idempotent: total permissions remain exactly **32** with zero duplicate entries.

---

## 7. Screenshot Artifact Evidence (19 Required Views)

Saved in `docs/checkpoints/screenshots/prompt-04/`:

1. `01-exam-stages-page.png`: Exam Stages management list view.
2. `02-exam-stage-form-prelims.png`: Stage modal form for Preliminary exam.
3. `03-exam-stage-form-mains.png`: Stage modal form for Main exam.
4. `04-exam-stage-reordering.png`: Stage sequence reordering interface.
5. `05-exam-pattern-builder-draft-revision1.png`: Interactive pattern builder with Revision 1 in DRAFT.
6. `06-exam-pattern-paper-form-objective.png`: Paper form for Objective paper.
7. `07-exam-pattern-paper-form-descriptive.png`: Paper form for Descriptive paper.
8. `08-exam-pattern-section-form-mcq.png`: Section form with auto-calculated total marks.
9. `09-exam-pattern-rollup-calculator.png`: Mark and question rollup calculator summary.
10. `10-exam-pattern-negative-marking-rules.png`: Negative marking rules configuration panel.
11. `11-exam-pattern-bilingual-readiness-panel.png`: Bilingual readiness status panel.
12. `12-exam-pattern-validation-review-panel.png`: Validation review panel.
13. `13-exam-pattern-workflow-review-pending.png`: Pattern in REVIEW_PENDING status.
14. `14-exam-pattern-workflow-changes-requested.png`: Pattern in CHANGES_REQUESTED status.
15. `15-exam-pattern-workflow-approved.png`: Pattern in APPROVED status.
16. `16-exam-pattern-published-immutable-view.png`: Published pattern in read-only state.
17. `17-exam-pattern-clone-revision2-draft.png`: Cloned Revision 2 in DRAFT status.
18. `18-public-localized-api-english-response.png`: Public API English response payload.
19. `19-public-localized-api-kannada-response.png`: Public API Kannada response payload.

---

## 8. Final Monorepo Validation Results

| Step | Command | Result |
| :--- | :--- | :--- |
| 1 | `pnpm db:migrate:deploy` | **PASSED** (4 migrations applied, 0 pending) |
| 2 | `pnpm db:seed` | **PASSED** (32 permissions, 4 roles, admin seeded) |
| 3 | `pnpm lint` | **PASSED** (0 errors) |
| 4 | `pnpm typecheck` | **PASSED** (0 errors across monorepo) |
| 5 | `pnpm test` | **PASSED** (all 33 API tests, 26 validation tests, 5 admin-web tests) |
| 6 | `pnpm build` | **PASSED** (0 build errors) |
| 7 | `pnpm --filter @study-karnataka/mobile type-check` | **PASSED** (0 errors) |
| 8 | `pnpm --filter @study-karnataka/mobile test` | **PASSED** (2 tests passed) |

---

## 9. Final Repository State

- **Branch**: `main`
- **Git Status**: `nothing to commit, working tree clean`
- **Latest Commit**: `3308a4a9cf2a5a64698a10a49656be1aecc70336`
- **Commit Message**: `chore: close Prompt 4 pattern verification`

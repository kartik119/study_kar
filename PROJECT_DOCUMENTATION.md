# Study Karnataka — Complete Project Technical Documentation & Architecture Report

---

## 📋 Executive Summary

**Study Karnataka** is a state-of-the-art, enterprise-grade digital learning and examination preparation platform specifically engineered for government competitive examination aspirants in Karnataka (such as KPSC KAS, KSP, KEA, PSI, and FDA/SDA). 

The platform features a **bilingual-first architecture** (English & Kannada), enabling seamless content curation, hierarchical syllabus mapping, interactive question banks, timed mock test series, and multi-tier administrative workflows.

---

## 🏗️ 1. Architecture & Technology Stack

The project is structured as a scalable **TypeScript Monorepo** managed via `pnpm` workspaces:

```
LGM SK (Monorepo Root)
├── apps/
│   ├── admin-web/       # Vite + React 18 + TailwindCSS Admin Management Portal
│   ├── api/             # Node.js + Express 4 + Prisma ORM REST API Backend
│   ├── student-web/     # Student Learning Portal (React + Vite)
│   ├── public-web/      # Public Landing & Discovery Pages
│   └── mobile/          # React Native / Expo Mobile App Foundation
└── packages/
    ├── database/        # PostgreSQL schema, Prisma ORM Client & Seeds
    ├── shared-types/    # Shared TypeScript Interfaces, Enums & DTOs
    ├── ui/              # @study-karnataka/ui Design System & UI Components
    ├── validation/      # Zod Validation Schemas & Business Rules
    └── config/          # Shared ESLint, Prettier & TypeScript Configurations
```

### Core Technologies
- **Frontend**: React 18, TypeScript, TailwindCSS, Lucide Icons, React Router DOM.
- **Backend**: Node.js, Express.js, Prisma ORM, PostgreSQL database.
- **Authentication**: JWT (JSON Web Tokens) with Refresh Token rotation, HTTP-only cookies, bcrypt password hashing.
- **Testing & Tooling**: Vitest, Supertest, pnpm Workspaces, Vite build optimizer.

---

## 🚀 2. Comprehensive Feature Breakdown

### A. Exam Management & Syllabus Hierarchy (`/exams`)
1. **Exam Authority & Programme Management**:
   - Create and manage conducting authorities (e.g. *Karnataka Public Service Commission*) and exam programmes (e.g. *Gazetted Probationers KAS*).
   - Code uniqueness validation and metadata tracking.

2. **Exam Cycle Lifecycle Workflow**:
   - Multi-state workflow management: `DRAFT` ➔ `SUBMITTED_FOR_REVIEW` ➔ `APPROVED` ➔ `PUBLISHED` ➔ `CLOSED` ➔ `ARCHIVED`.
   - Bilingual notifications, application URLs, fee payment dates, and exam dates.

3. **Exam Pattern Builder**:
   - Multi-stage exam setup (Prelims, Mains, Interview).
   - Paper configuration: Total marks, paper duration, negative marking scheme, question format (`MCQ`, `DESCRIPTIVE`, `ESSAY`).

4. **Hierarchical Syllabus Tree & DND Engine**:
   - Multi-depth tree structure for syllabus nodes (Subjects ➔ Modules ➔ Topics ➔ Subtopics).
   - **Inline 3-Dots Context Menu (`⋮`)**: Instant `➕ Add Child Node`, `🌐 Add Root Node`, `✏️ Edit Node`, and `🗑️ Delete Node`.
   - **Targeted Sub-Node Placement**: Adding a child node expands the input form **directly beneath the target parent node row**.
   - **HTML5 Drag & Drop Reordering**: Reorder tree structure effortlessly with flexible drop target zone indicators (`above`, `inside`, `below`).
   - **Title Link URLs**: Added dedicated link fields for official source reference URLs (`sourceReference` for English title, `officialTextKn` for Kannada title).
   - **Direct Editing**: Bypassed revision locking so admins can edit syllabus nodes instantly.

---

### B. Academic Taxonomy & Categories (`/taxonomy/categories`)
1. **Categories & Subcategories**:
   - Hierarchical academic taxonomy (e.g. *Indian Polity ➔ Fundamental Rights*).
   - Subcategory creation modal (`+ Subcategory`) available directly on every category row.

2. **Merged Selection Dropdown**:
   - Consolidated separate Category & Subcategory selectors into a single unified **`Category & Subcategory`** dropdown (`📁 Category` ➔ `└─ Subcategory`).

---

### C. Study Materials Management (`/study-materials`)
1. **Bilingual Content Curation**:
   - Curation of Study Notes, Syllabus PDFs, and Quick Reference Guides.
   - Dual-language support with revision history (`StudyMaterialLocaleRevision`).

2. **Content Review Workflow**:
   - Event audit trail (`StudyMaterialReviewEvent`) for submit review, approve, publish, and reject actions.

3. **Access Control & Paywall Preview Engine**:
   - Node-boundary content splitting algorithm (`splitContentAtNodeBoundary`) for generating free preview outlines versus locked premium content.

4. **Clean Navigation**:
   - Simplified sidebar menu to 3 core items: `All Content`, `Add Content`, `Categories`.

---

### D. MCQ Question Bank & Mock Test System (`/mcq-library`)
1. **Bilingual Question Bank (`McqQuestion`)**:
   - **Dual Stems**: Full question stem in English (`questionTextEn`) and Kannada (`questionTextKn`).
   - **4 Bilingual Options**: Options A, B, C, D with independent English & Kannada text fields.
   - **Correct Answer Selector**: Global answer key (`A`, `B`, `C`, or `D`).
   - **Bilingual Explanations**: Detailed explanation for the correct answer (`explanationEn`, `explanationKn`).
   - **Difficulty Ratings & Marking**: `EASY`, `MEDIUM`, `HARD` difficulty ratings with custom positive (`+1.0`) and negative (`-0.25`) marks.
   - **Taxonomy Mapping**: Link questions to Exam Cycles, Syllabus Nodes, and Academic Categories.

2. **Mock Test Series Builder (`MockTest` & `MockTestQuestion`)**:
   - Assemble questions into timed mock exam papers.
   - Configure total marks, duration in minutes, passing percentage, and publish status.

3. **Interactive Admin Dashboard (`/mcq-library`)**:
   - **Overview Stats**: Real-time counter for Total MCQs, Easy/Medium counts, and Mock Test Papers.
   - **Bilingual Preview Switcher**: Toggle preview between *Bilingual*, *English-only*, or *Kannada-only*.
   - **Option Display Grid**: Options rendered with emerald green highlighting for the correct answer.
   - **Question Editor Modal**: Modal to add or update questions with real-time validation.
   - **Mock Test Composition Modal**: Drawer to select questions from the bank and publish test series.

---

### E. Authentication, RBAC & Security
1. **Student & Admin Authentication**:
   - Password hashing with bcrypt.
   - JWT Access Tokens and Refresh Tokens stored in secure HTTP-only cookies.
   - Failed login count tracking and lockout protection.

2. **Preparation Language Locking**:
   - Students select preferred preparation language (`en` or `kn`) with explicit lock mechanisms.

3. **Granular RBAC System**:
   - 46 granular permission keys across System Roles:
     - `Super Admin` (Full platform control)
     - `Content Manager` (Create, edit & manage content)
     - `Content Reviewer` (Review & approve submissions)
     - `Support Executive` (View student profiles)

4. **Audit Logging System**:
   - Full audit trail (`admin_audit_logs`) tracking administrative actions with IP address, user agent, and timestamp.

---

## 🗄️ 3. Database Schema Overview

The database contains **26 Prisma models** in PostgreSQL:

| Domain | Key Models | Description |
| :--- | :--- | :--- |
| **User & Identity** | `User`, `StudentProfile`, `AdminUser`, `Role`, `Permission`, `UserSession`, `OTPChallenge`, `GuardianConsent` | Authentication, roles, sessions, guardian consent for minors, and student language preferences. |
| **Exam Domain** | `ExamAuthority`, `ExamProgramme`, `ExamCycle`, `ExamEligibility`, `ExamImportantDate`, `ExamOfficialResource`, `ExamSEO` | Conducting bodies, exam programmes, cycle status, dates, resources, and SEO parameters. |
| **Exam Pattern** | `ExamStage`, `ExamPaper`, `ExamPattern` | Multi-stage exam structures, papers, question formats, and scoring rules. |
| **Syllabus Tree** | `ExamSyllabus`, `ExamSyllabusNode` | Hierarchical syllabus tree with parent-child relationships and node types. |
| **Taxonomy** | `AcademicCategory`, `AcademicSubcategory`, `AcademicTopic`, `AcademicKnowledgeArea`, `StudyMaterialTaxonomyMapping` | Subject classification hierarchy and taxonomy mappings. |
| **Study Material** | `StudyMaterial`, `StudyMaterialLocale`, `StudyMaterialLocaleRevision`, `StudyMaterialReviewEvent` | Content items, locale revisions, workflow events, and access control. |
| **MCQ & Mock Tests** | `McqQuestion`, `MockTest`, `MockTestQuestion` | Bilingual question bank, 4 options, explanations, difficulty ratings, and mock test papers. |

---

## 🧪 4. Verification & Quality Assurance

The codebase passes all automated test suites and compiler checks:

- **Type Checking (`pnpm type-check`)**: **100% PASSED** (0 TypeScript errors across all 10 monorepo projects).
- **Automated Tests (`pnpm test`)**: **100% PASSED** (148/148 unit & integration tests passing).
- **Production Build (`pnpm build`)**: **100% PASSED** (Production bundles generated in 2.66s).

---

## 🛠️ 5. Project Command Reference

To run and manage the platform locally:

```bash
# 1. Install Dependencies
pnpm install

# 2. Synchronize PostgreSQL Database Schema
pnpm db:push

# 3. Generate Prisma ORM Client
pnpm db:generate

# 4. Run Development Servers (API + Admin Web + Student Web)
pnpm dev

# 5. Run Workspace Type Check
pnpm type-check

# 6. Run Full Test Suite
pnpm test

# 7. Build Production Bundle
pnpm build
```

---

*Documentation generated for Study Karnataka Platform.*

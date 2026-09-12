# Study Karnataka — Local Demo Dataset & UI Walkthrough

> [!CAUTION]
> **DEMO DATA ONLY — NOT FOR PRODUCTION**
> Never run the demo seeder on a production database or automated test environment.

---

## 1. Quick Start

### Seeding Demo Data
To seed the local development database with demonstration records:

```bash
ALLOW_DEMO_SEED=true pnpm db:seed:demo
```

> **Note:** The environment variable `ALLOW_DEMO_SEED=true` is **strictly required**. The seeder will refuse to run if `NODE_ENV=production` or if configured to run against the automated test database.

### Removing Demo Data
To safely remove all demo records while preserving legitimate baseline development data (`KPSC`, `KAS_GP`, `KAS_2026_GP`):

```bash
pnpm db:demo:cleanup
```

### Running the Application
Start the API backend and Admin Panel:

```bash
pnpm dev
```

Log in as the Super Admin:
- **Email:** `admin@studykarnataka.com`
- **Password:** `Admin@StudyKar2026`

---

## 2. Recommended Walkthrough Order

### A. Exams & Syllabus Module (`/exams`)
1. **All Exams (`/exams`)**:
   - Observe `Demo KAS Gazetted Probationers Exam 2026` (`DEMO_KAS_2026`).
2. **Exam Detail (`/exams/:examId`)**:
   - Inspect eligibility criteria, important dates, and official links.
3. **Exam Stages & Pattern (`/exams/:examId/pattern`)**:
   - **Pattern Revision 1 (PUBLISHED)**: View Preliminary Exam (Paper 1 & Paper 2 with negative marking), Main Exam (Essay, GS1, GS2), and Interview.
   - **Pattern Revision 2 (DRAFT)**: Toggle revision selector to demonstrate draft workflow status.
4. **Exam Syllabus (`/exams/syllabus?examId=<id>`)**:
   - **Syllabus Revision 1 (PUBLISHED)**: Inspect 15-node bilingual tree (History, Indian Polity, Geography, Current Affairs) with `GLOBAL`, `STAGE`, and `PAPER` scope tags.
   - **Syllabus Revision 2 (DRAFT)**: View editable draft revision selector.
5. **Exam Analytics (`/exams/analytics`)**:
   - View real computed analytics generated dynamically from demo pattern and syllabus structures.

### B. Study Materials Module (`/study-materials`)
1. **All Content (`/study-materials`)**:
   - Inspect 4 demo Study Materials demonstrating distinct workflows and access models.
2. **Free Study Material (`DEMO_SM_001`)**:
   - *"Introduction to Karnataka History"* — Free access, mapped to History → Karnataka History taxonomy.
3. **Paid Study Material (`DEMO_SM_002`)**:
   - *"Anglo-Mysore Relations — Detailed Notes"* — Paid access with paywall configuration.
4. **Freemium Study Material (`DEMO_SM_003`)**:
   - *"Fundamental Rights — Study Notes"* — Freemium access with configured section preview boundaries.
5. **Review Queue & Independent Content (`DEMO_SM_004`)**:
   - *"Karnataka Geography — Rivers"* — Demonstrates **REVIEW_PENDING** (EN) / **CHANGES_REQUESTED** (KN) workflow status with reviewer comment and **ZERO taxonomy mappings** ("Not Mapped").

### C. Academic Taxonomy (`/study-materials/categories`)
1. View Categories (`DEMO_HISTORY`, `DEMO_POLITY`), Subcategories, Topics, and Knowledge Areas.

---

## 3. Demo Dataset Mapping Matrix

| Demo Code | Title | Access Type | Workflow Status | Taxonomy Mapping | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DEMO_KPSC` | KPSC — Demo Authority | — | Active | — | Authority Shell |
| `DEMO_KAS` | KAS — Demo Programme | — | Active | — | Programme Shell |
| `DEMO_KAS_2026` | Demo KAS Exam 2026 | — | PUBLISHED | — | Exam Cycle Shell |
| `DEMO_SM_001` | Intro to Karnataka History | FREE | PUBLISHED | Mapped | Free Content Demo |
| `DEMO_SM_002` | Anglo-Mysore Notes | PAID | PUBLISHED | Unmapped | Paywall & Paid Demo |
| `DEMO_SM_003` | Fundamental Rights Notes | FREEMIUM | PUBLISHED | Mapped | Preview Boundary Demo |
| `DEMO_SM_004` | Karnataka Geography Rivers | FREE | REVIEW PENDING | **Not Mapped (0)** | Independent Content & Review Queue Demo |

---

## 4. Safety & Idempotency Verification

- **Idempotency**: Running `ALLOW_DEMO_SEED=true pnpm db:seed:demo` multiple times produces **0 duplicate records**.
- **Isolation**: Cleanup (`pnpm db:demo:cleanup`) deletes **ONLY** records with `DEMO_` prefixes and never touches baseline records or production tables.

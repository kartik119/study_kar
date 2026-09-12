# Study Karnataka — Version 2 (v2) Clean State Backup

This directory contains the clean state backup created after wiping all MCQ content, Study Material content, and Academic Taxonomy.

## Included Files

- `study_karnataka_db.sql`: Complete PostgreSQL database dump reflecting the clean state.
  - Academic categories: 0 (fresh start)
  - Academic subcategories: 0 (fresh start)
  - MCQ questions: 0 (fresh start, next sequence code: `MCQ_000001`)
  - Study materials: 0 (fresh start)
  - Admin & user accounts: Preserved
  - Exam authorities, programmes, and syllabus nodes: Preserved
- `project_source_v2.zip`: Clean archive of the complete monorepo source code (`apps`, `packages`, `docs`, `scripts`, configs).

## How to Restore v2 State Anytime

To restore the database to this exact v2 state at any point:
```powershell
$env:PGPASSWORD="Kanishk~1122"
psql -h localhost -p 5432 -U postgres -d study_karnataka -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql -h localhost -p 5432 -U postgres -d study_karnataka -q -f "v2-backup/study_karnataka_db.sql"
```

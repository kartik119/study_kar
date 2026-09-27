const { Client } = require('pg');
require('dotenv').config({ path: '.env' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const sql = `
    CREATE TABLE IF NOT EXISTS "StudyMaterialExamMapping" (
      "id" TEXT NOT NULL,
      "studyMaterialId" TEXT NOT NULL,
      "examCycleId" TEXT NOT NULL,
      "createdByAdminId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StudyMaterialExamMapping_pkey" PRIMARY KEY ("id")
    );
    ALTER TABLE "StudyMaterialExamMapping" DROP CONSTRAINT IF EXISTS "StudyMaterialExamMapping_studyMaterialId_fkey";
    ALTER TABLE "StudyMaterialExamMapping" DROP CONSTRAINT IF EXISTS "StudyMaterialExamMapping_examCycleId_fkey";
    ALTER TABLE "StudyMaterialExamMapping" ADD CONSTRAINT "StudyMaterialExamMapping_studyMaterialId_fkey" FOREIGN KEY ("studyMaterialId") REFERENCES "study_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "StudyMaterialExamMapping" ADD CONSTRAINT "StudyMaterialExamMapping_examCycleId_fkey" FOREIGN KEY ("examCycleId") REFERENCES "exam_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    DROP INDEX IF EXISTS "StudyMaterialExamMapping_studyMaterialId_examCycleId_key";
    CREATE UNIQUE INDEX "StudyMaterialExamMapping_studyMaterialId_examCycleId_key" ON "StudyMaterialExamMapping"("studyMaterialId", "examCycleId");
    DROP INDEX IF EXISTS "StudyMaterialExamMapping_studyMaterialId_idx";
    CREATE INDEX "StudyMaterialExamMapping_studyMaterialId_idx" ON "StudyMaterialExamMapping"("studyMaterialId");
    DROP INDEX IF EXISTS "StudyMaterialExamMapping_examCycleId_idx";
    CREATE INDEX "StudyMaterialExamMapping_examCycleId_idx" ON "StudyMaterialExamMapping"("examCycleId");
  `;
  await client.query(sql);
  console.log('Table created successfully');
  await client.end();
}
run().catch(console.error);

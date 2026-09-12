import { prisma } from './index';

export async function cleanupVisualDemoSyllabus() {
  const syllabusId = '0d46a9b5-0b60-4027-a1d4-d452dc044609';

  console.log(`Cleaning up VISUAL_DEMO_ nodes from Syllabus Revision 4 (${syllabusId})...`);

  const deletedNodes = await prisma.examSyllabusNode.deleteMany({
    where: {
      examSyllabusId: syllabusId,
      code: { startsWith: 'VISUAL_DEMO_' },
    },
  });

  console.log(`
=====================================================
Visual Demo Syllabus Cleanup Complete!
=====================================================
Deleted Nodes Count: ${deletedNodes.count}
Syllabus Revision ${syllabusId} preserved.
=====================================================
  `);
}

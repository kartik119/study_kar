import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plan = await prisma.studentStudyPlan.findFirst({
    where: { student: { accountType: 'STUDENT' } },
    include: {
      tasks: {
        select: { taskType: true }
      }
    }
  });

  if (!plan) {
    console.log("No plan found");
    return;
  }

  const counts: Record<string, number> = {};
  for (const t of plan.tasks) {
    counts[t.taskType] = (counts[t.taskType] || 0) + 1;
  }
  console.log("Task Breakdown for Plan:", plan.id);
  console.log(counts);
}

main().catch(console.error).finally(() => prisma.$disconnect());

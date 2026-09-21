const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const nodes = await prisma.examSyllabusNode.findMany({
    select: { nodeType: true, isActive: true }
  });
  const summary = nodes.reduce((acc, n) => {
    const key = `${n.nodeType}-${n.isActive}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log(summary);
}
main().catch(console.error).finally(()=>prisma.$disconnect());

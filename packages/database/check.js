const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.examCycle.findMany({ include: { syllabi: true } }).then(c => console.log(JSON.stringify(c, null, 2))).catch(console.error).finally(()=>prisma.$disconnect());

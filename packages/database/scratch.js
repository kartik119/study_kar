const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const logs = await p.adminAuditLog.findMany({
    select: { module: true, action: true },
    distinct: ['module', 'action'],
    take: 100
  });
  console.log(JSON.stringify(logs, null, 2));
}

run().catch(console.error).finally(() => p.$disconnect());

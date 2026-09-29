const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function forceReset() {
  const email = 'admin@studykarnataka.in';
  const plainPassword = 'Admin@StudyKar2026';
  
  const user = await prisma.adminUser.findFirst({
    where: { email }
  });
  
  if (!user) {
    console.log(`User ${email} not found!`);
    return;
  }
  
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { passwordHash, accountStatus: 'ACTIVE' }
  });
  
  console.log('Password successfully force-reset and account activated for:', email);
}

forceReset().catch(console.error).finally(() => prisma.$disconnect());

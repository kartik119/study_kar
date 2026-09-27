const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });
const p = new PrismaClient();
p.currentAffairExam.count()
  .then(c => {
    console.log('current_affair_exams exists! count =', c);
  })
  .catch(console.error)
  .finally(() => p.$disconnect());

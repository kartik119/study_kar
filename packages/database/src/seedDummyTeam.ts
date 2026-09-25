import { prisma } from './index';
import bcrypt from 'bcryptjs';

async function seedDummyTeam() {
  console.log('Seeding dummy team members...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const dummyUsers = [
    {
      email: 'john.doe@studykarnataka.com',
      fullName: 'John Doe',
      department: 'Content Team',
      designation: 'Content Creator',
      employeeId: 'EMP001',
    },
    {
      email: 'jane.smith@studykarnataka.com',
      fullName: 'Jane Smith',
      department: 'Review Team',
      designation: 'Reviewer',
      employeeId: 'EMP002',
    },
    {
      email: 'robert.brown@studykarnataka.com',
      fullName: 'Robert Brown',
      department: 'Admin',
      designation: 'Manager',
      employeeId: 'EMP003',
    },
    {
      email: 'emily.davis@studykarnataka.com',
      fullName: 'Emily Davis',
      department: 'Support',
      designation: 'Support Agent',
      employeeId: 'EMP004',
    }
  ];

  for (const user of dummyUsers) {
    const adminUser = await prisma.adminUser.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
      },
      create: {
        email: user.email,
        fullName: user.fullName,
        passwordHash,
        accountStatus: 'ACTIVE',
      },
    });

    await prisma.adminProfile.upsert({
      where: { adminUserId: adminUser.id },
      update: {
        department: user.department,
        designation: user.designation,
        employeeId: user.employeeId,
      },
      create: {
        adminUserId: adminUser.id,
        department: user.department,
        designation: user.designation,
        employeeId: user.employeeId,
      }
    });
  }

  console.log('Successfully added dummy team members!');
}

seedDummyTeam()
  .catch((e) => {
    console.error('Error seeding dummy team:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

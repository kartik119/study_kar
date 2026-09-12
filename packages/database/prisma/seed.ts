import { seedDatabase } from '../src/seed';

async function main() {
  console.log('Seeding initial system roles and permissions...');
  await seedDatabase();
  console.log('Seeding completed successfully.');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Seeding error:', e);
      process.exit(1);
    });
}

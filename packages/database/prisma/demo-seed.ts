import { seedDemoDatabase } from '../src/demoSeed';

async function main() {
  // 1. Requirement: ALLOW_DEMO_SEED=true
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    console.error('Error: ALLOW_DEMO_SEED=true is required to run the demo seeder.');
    console.error('Example: ALLOW_DEMO_SEED=true pnpm db:seed:demo');
    process.exit(1);
  }

  // 2. Requirement: Reject NODE_ENV=production
  if (process.env.NODE_ENV === 'production') {
    console.error('Error: Demo seeding is strictly forbidden in production!');
    process.exit(1);
  }

  // 3. Requirement: Reject TEST_DATABASE_URL or test environment
  const dbUrl = process.env.DATABASE_URL || '';
  const testDbUrl = process.env.TEST_DATABASE_URL || '';
  if ((testDbUrl && dbUrl === testDbUrl) || dbUrl.includes('study_karnataka_test')) {
    console.error('Error: Demo seeding must not run on the automated test database.');
    process.exit(1);
  }

  await seedDemoDatabase();
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Demo seeding error:', e);
    process.exit(1);
  });
}

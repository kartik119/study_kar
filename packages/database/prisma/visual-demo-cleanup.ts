import { cleanupVisualDemoSyllabus } from '../src/visualDemoCleanup';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Error: Demo cleanup is strictly forbidden in production!');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL || '';
  const testDbUrl = process.env.TEST_DATABASE_URL || '';
  if ((testDbUrl && dbUrl === testDbUrl) || dbUrl.includes('study_karnataka_test')) {
    console.error('Error: Demo cleanup must not run on the automated test database.');
    process.exit(1);
  }

  await cleanupVisualDemoSyllabus();
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Visual demo cleanup error:', e);
    process.exit(1);
  });
}

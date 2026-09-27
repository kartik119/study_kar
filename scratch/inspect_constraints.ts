import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { prisma } from '@study-karnataka/database';

async function main() {
  const fkeys: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      tc.table_schema, 
      tc.constraint_name, 
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'student_subscriptions'
  `);
  console.log('Foreign keys on student_subscriptions:', fkeys);

  const enumValues: any[] = await prisma.$queryRawUnsafe(`
    SELECT e.enumlabel
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'SubscriptionStatus'
  `);
  console.log('SubscriptionStatus enum values:', enumValues);

  const allTypes: any[] = await prisma.$queryRawUnsafe(`
    SELECT typname FROM pg_type WHERE typname ILIKE '%subscription%' OR typname ILIKE '%payment%'
  `);
  console.log('Matching enum types:', allTypes);
}

main().catch(console.error).finally(() => prisma.$disconnect());

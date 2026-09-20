// One-shot script to enable RLS on all public tables
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔒 Enabling Row Level Security on all public tables...\n');

  // Get all tables in the public schema
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  console.log(`Found ${tables.length} tables:\n`);

  let success = 0;
  let failed = 0;

  for (const { tablename } of tables) {
    try {
      // Use raw SQL — format with quoting to handle mixed case table names
      await prisma.$executeRawUnsafe(
        `ALTER TABLE public."${tablename}" ENABLE ROW LEVEL SECURITY`
      );
      console.log(`  ✅ ${tablename}`);
      success++;
    } catch (err: any) {
      console.error(`  ❌ ${tablename}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🎉 Done! ${success} tables secured, ${failed} failed.`);
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

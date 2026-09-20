import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const callLogs = await prisma.callLog.count();
  const leads = await prisma.lead.count();
  const users = await prisma.user.count();
  console.log(`Total CallLogs: ${callLogs}`);
  console.log(`Total Leads: ${leads}`);
  console.log(`Total Users: ${users}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

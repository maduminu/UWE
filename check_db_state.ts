import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.callLog.count();
  console.log(`Total CallLogs: ${count}`);

  const todayLogs = await prisma.callLog.count({
    where: {
      calledAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    }
  });
  console.log(`Today's CallLogs: ${todayLogs}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

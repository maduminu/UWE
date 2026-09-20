import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.callLog.findMany({
    where: {
      calledAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    },
    select: { id: true, adminId: true, adminName: true, outcome: true }
  });
  console.log(logs);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const leads = await prisma.lead.findMany({
    select: { id: true, name: true, email: true, phone: true, status: true },
  });

  const slips = await prisma.paymentSlip.findMany({
    select: { id: true, studentName: true, studentEmail: true, status: true },
  });

  const applications = await prisma.jobApplication.findMany({
    select: { id: true, name: true, email: true, status: true },
  });

  console.log({ leads, slips, applications });
}

check().catch(console.error).finally(() => prisma.$disconnect());

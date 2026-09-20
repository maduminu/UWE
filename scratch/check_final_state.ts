import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const admins = await prisma.adminUser.findMany({ select: { email: true, name: true, role: true } });
  const users = await prisma.user.findMany({ select: { email: true, name: true, enrolledCourseSlugs: true, xp: true } });
  const questions = await prisma.mastermindQuestion.findMany({ select: { id: true, question: true, authorName: true } });

  console.log('👑 Admin Users:', admins);
  console.log('🎓 Students:', users);
  console.log('💬 Mastermind Questions Count:', questions.length);
}

check().catch(console.error).finally(() => prisma.$disconnect());

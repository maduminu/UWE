import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The 6 verified bcrypt-secured student accounts to keep
const PRESERVED_STUDENT_EMAILS = [
  'sadun@gmail.com',
  'dilani.silva@gmail.com',
  'kaveesha.w@gmail.com',
  'pasan.m@yahoo.com',
  'isuru.k@gmail.com',
  'lahiru.g@yahoo.com',
];

// The Super Admin account to keep
const PRESERVED_ADMIN_EMAIL = 'admin@uwe.lk';

async function sanitizeDatabase() {
  console.log('🛡️ Starting UWE Database Legacy Data Sanitization...');

  // 1. Audit before counts
  const beforeCounts = {
    adminUsers: await prisma.adminUser.count(),
    users: await prisma.user.count(),
    leads: await prisma.lead.count(),
    slips: await prisma.paymentSlip.count(),
    applications: await prisma.jobApplication.count(),
    questions: await prisma.mastermindQuestion.count(),
    replies: await prisma.mastermindReply.count(),
    tokens: await prisma.refreshToken.count(),
  };
  console.log('📊 Current Counts (Before):', beforeCounts);

  // 2. Verify Super Admin exists
  const superAdmin = await prisma.adminUser.findUnique({
    where: { email: PRESERVED_ADMIN_EMAIL },
  });

  if (!superAdmin) {
    throw new Error(`CRITICAL: Super Admin ${PRESERVED_ADMIN_EMAIL} not found! Aborting.`);
  }
  console.log(`✅ Verified Super Admin: ${superAdmin.email} (${superAdmin.name}) [${superAdmin.role}]`);

  // 3. Delete unverified/legacy Admin accounts
  const deletedAdmins = await prisma.adminUser.deleteMany({
    where: {
      email: { not: PRESERVED_ADMIN_EMAIL },
    },
  });
  console.log(`🧹 Deleted ${deletedAdmins.count} legacy plaintext admin accounts.`);

  // 4. Delete unverified/legacy student accounts
  // First, find IDs of users to be deleted to safely clean dependent rows
  const usersToDelete = await prisma.user.findMany({
    where: {
      email: { notIn: PRESERVED_STUDENT_EMAILS },
    },
    select: { id: true, email: true },
  });
  const userIdsToDelete = usersToDelete.map((u) => u.id);

  console.log(`🔍 Identified ${userIdsToDelete.length} legacy/seed students for removal.`);

  // Delete orphaned video progress & certificates for deleted users
  if (userIdsToDelete.length > 0) {
    const deletedProgress = await prisma.videoProgress.deleteMany({
      where: { userId: { in: userIdsToDelete } },
    });
    console.log(`🧹 Deleted ${deletedProgress.count} video progress records for removed students.`);

    const deletedCerts = await prisma.certificate.deleteMany({
      where: { userId: { in: userIdsToDelete } },
    });
    console.log(`🧹 Deleted ${deletedCerts.count} certificates for removed students.`);
  }

  // Delete the legacy/seed students
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: { notIn: PRESERVED_STUDENT_EMAILS },
    },
  });
  console.log(`🧹 Deleted ${deletedUsers.count} legacy/seed student accounts.`);

  // 5. Clean up test spam from Mastermind Q&A
  // Delete replies on questions to be cleaned first
  const testQuestions = await prisma.mastermindQuestion.findMany({
    where: {
      OR: [
        { authorName: { contains: 'test', mode: 'insensitive' } },
        { question: { contains: 'test', mode: 'insensitive' } },
        { question: { contains: 'Stress', mode: 'insensitive' } },
        { question: { contains: 'Bench', mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });
  const testQuestionIds = testQuestions.map((q) => q.id);

  if (testQuestionIds.length > 0) {
    await prisma.mastermindReply.deleteMany({
      where: { questionId: { in: testQuestionIds } },
    });
    const deletedQuestions = await prisma.mastermindQuestion.deleteMany({
      where: { id: { in: testQuestionIds } },
    });
    console.log(`🧹 Deleted ${deletedQuestions.count} automated test questions & replies from Mastermind Q&A.`);
  }

  // Also clean any orphan replies
  await prisma.mastermindReply.deleteMany({
    where: {
      OR: [
        { authorName: { contains: 'test', mode: 'insensitive' } },
        { body: { contains: 'test', mode: 'insensitive' } },
      ],
    },
  });

  // 6. Clean legacy/dummy payment slips
  const deletedSlips = await prisma.paymentSlip.deleteMany({
    where: {
      studentEmail: {
        notIn: [...PRESERVED_STUDENT_EMAILS, 'madu@gmail.com'],
      },
    },
  });
  console.log(`🧹 Deleted ${deletedSlips.count} legacy/test payment slips.`);

  // 7. Clean legacy/dummy leads
  const deletedLeads = await prisma.lead.deleteMany({
    where: {
      email: {
        notIn: [...PRESERVED_STUDENT_EMAILS, 'madu@gmail.com'],
      },
    },
  });
  console.log(`🧹 Deleted ${deletedLeads.count} legacy/test CRM leads.`);

  // 8. Clean test job applications (preserving job vacancies)
  const deletedApps = await prisma.jobApplication.deleteMany({});
  console.log(`🧹 Deleted ${deletedApps.count} test job applications.`);

  // 9. Reset job vacancy hiredCount to 0 to align with clean state
  await prisma.jobVacancy.updateMany({
    data: {
      hiredCount: 0,
      hiringStatus: 'HIRING',
    },
  });
  console.log(`🔄 Reset job vacancies to OPEN with 0 hires.`);

  // 10. Flush stale refresh tokens
  const deletedTokens = await prisma.refreshToken.deleteMany({});
  console.log(`🧹 Flushed ${deletedTokens.count} stale refresh token sessions.`);

  // 11. Final counts after sanitization
  const afterCounts = {
    adminUsers: await prisma.adminUser.count(),
    users: await prisma.user.count(),
    leads: await prisma.lead.count(),
    slips: await prisma.paymentSlip.count(),
    applications: await prisma.jobApplication.count(),
    questions: await prisma.mastermindQuestion.count(),
    replies: await prisma.mastermindReply.count(),
    tokens: await prisma.refreshToken.count(),
    courses: await prisma.course.count(),
    batches: await prisma.courseBatch.count(),
    reviews: await prisma.courseReview.count(),
  };

  console.log('\n✨ Database Sanitization Complete! Summary of After Counts:');
  console.table(afterCounts);

  // Print remaining users & admin
  const remainingAdmins = await prisma.adminUser.findMany({ select: { email: true, name: true, role: true } });
  const remainingUsers = await prisma.user.findMany({ select: { email: true, name: true } });

  console.log('👑 Retained Admin:', remainingAdmins);
  console.log('🎓 Retained Students:', remainingUsers);
}

sanitizeDatabase()
  .catch((e) => {
    console.error('❌ Sanitization failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting UWE Database Seed Process...');

  // 1. Seed Admin User Account (Admin HQ Gateway Credentials)
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@uwe.lk' },
    update: { passwordHash: 'admin1234' },
    create: {
      email: 'admin@uwe.lk',
      name: 'Command HQ Chief Admin',
      passwordHash: 'admin1234',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('✅ Admin User Account Seeded:', admin.email, '(Password: admin1234)');

  // 2. Seed Courses
  await prisma.course.upsert({
    where: { slug: 'bmb' },
    update: { price: 12500 },
    create: {
      slug: 'bmb',
      title: 'Blind Mind Breaker (BMB)',
      subtitle: 'Subconscious Mind Optimization Protocol',
      badge: 'MIND DIVISION',
      category: 'MIND',
      description: 'Deconstruct subconscious mental barriers, eliminate fear responses, and install peak-performance neural patterns.',
      price: 12500,
      currency: 'RS.',
      duration: '5 Days Intensive',
      isFeatured: true,
    },
  });

  await prisma.course.upsert({
    where: { slug: 'leadership' },
    update: { price: 100000 },
    create: {
      slug: 'leadership',
      title: 'UWE Leadership Academy',
      subtitle: 'Command & Control Tactical Training',
      badge: 'COMMAND DIVISION',
      category: 'COMMAND',
      description: 'High-stakes executive command drills, crisis response management, and voice authority optimization.',
      price: 100000,
      currency: 'RS.',
      duration: '4-Week Tactical Program',
      isFeatured: true,
    },
  });

  await prisma.course.upsert({
    where: { slug: 'ignit' },
    update: { price: 45000 },
    create: {
      slug: 'ignit',
      title: 'UWE IGNIT Accelerator',
      subtitle: 'Sri Lankan Entrepreneurial Incubator',
      badge: 'ENTERPRISE DIVISION',
      category: 'ENTERPRISE',
      description: 'Venture scaling, pitch deck engineering, and angel investor syndicate connections.',
      price: 45000,
      currency: 'RS.',
      duration: '8-Week Incubator',
      isFeatured: true,
    },
  });

  console.log('✅ Courses Seeded (BMB: 12,500, Leadership: 100,000, IGNIT: 45,000)');

  // 3. Seed Student User Account
  const student = await prisma.user.upsert({
    where: { email: 'operative@uwe.lk' },
    update: {},
    create: {
      email: 'operative@uwe.lk',
      name: 'Operative Alex',
      phone: '071 709 6386',
      passwordHash: 'password123',
      isEnrolled: true,
      enrolledCourseSlugs: 'bmb,leadership,ignit',
    },
  });

  console.log('✅ Student User Account Seeded:', student.email);

  // 4. Seed Working Demo Videos (Public Media Vault)
  console.log('🎬 Seeding Working Demo Videos into Supabase Database...');
  await prisma.demoVideo.deleteMany({}); // refresh demo reels

  const demoVideos = [
    {
      title: 'BMB Subconscious Paradigm Shift',
      subtitle: 'Mind Optimization Protocol Demonstration',
      duration: '03:45',
      posterUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
      badge: 'BMB MIND DIVISION',
      category: 'BMB' as const,
      description: 'Live demonstration of subconscious fear response deconstruction and neuro-anchoring protocols.',
      isFeatured: true,
      sortOrder: 1,
    },
    {
      title: 'Tactical Crisis Simulation & Voice Command',
      subtitle: 'High-Stakes Leadership Drill',
      duration: '03:45',
      posterUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
      badge: 'COMMAND DIVISION',
      category: 'LEADERSHIP' as const,
      description: 'High-stakes leadership drills executing real-time crisis management and command authority under pressure.',
      isFeatured: true,
      sortOrder: 2,
    },
    {
      title: 'UWE IGNIT Pitch Night & Venture Syndicate',
      subtitle: 'Enterprise Incubator Showcase',
      duration: '03:45',
      posterUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=800&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
      badge: 'ENTERPRISE DIVISION',
      category: 'IGNIT' as const,
      description: 'Graduates pitching high-growth Sri Lankan ventures to angel investors and venture capitalists.',
      isFeatured: true,
      sortOrder: 3,
    },
    {
      title: 'Operative Transformation Case Study',
      subtitle: 'Executive Alumni Reel',
      duration: '03:45',
      posterUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
      badge: 'ALUMNI REEL',
      category: 'TESTIMONIAL' as const,
      description: 'Real feedback from executive operatives who underwent the 5-day BMB mind optimization program.',
      isFeatured: true,
      sortOrder: 4,
    },
    {
      title: 'Neural State Trigger Anchor Drill',
      subtitle: 'Focus Conditioning Protocol',
      duration: '03:45',
      posterUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
      badge: 'BMB ADVANCED',
      category: 'BMB' as const,
      description: 'Conditioning focus triggers to enter flow state in under 60 seconds.',
      isFeatured: false,
      sortOrder: 5,
    },
    {
      title: 'Executive Voice Projection Dynamics',
      subtitle: 'Acoustics & Presence Drill',
      duration: '03:45',
      posterUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
      badge: 'COMMAND DRILL',
      category: 'LEADERSHIP' as const,
      description: 'Vocal acoustics and commanding resonance for executive meetings.',
      isFeatured: false,
      sortOrder: 6,
    },
  ];

  for (const video of demoVideos) {
    await prisma.demoVideo.create({ data: video });
  }

  console.log(`✅ ${demoVideos.length} Demo Videos Seeded!`);

  // 5. Seed Program Video Series & Modules (Gated Category Modules)
  console.log('🎥 Seeding Gated Program Video Series & Modules into Supabase...');
  await prisma.programVideoModule.deleteMany({});
  await prisma.programVideoSeries.deleteMany({});

  const bmbSeries = await prisma.programVideoSeries.create({
    data: {
      courseSlug: 'bmb',
      seriesTitle: 'BMB 5-Day Subconscious Neural Rewiring Masterclass',
      category: 'Subconscious Mind Optimization',
      description: 'Step-by-step subconscious mind rewiring drills to eliminate fear responses and install peak focus.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
      modules: {
        create: [
          {
            episodeNumber: 1,
            title: 'Day 1: Deconstructing Subconscious Fear Traps',
            duration: '03:45',
            videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
            isFreePreview: true,
            description: 'Introduction to subconscious anxiety patterns (Free Public Preview).',
          },
          {
            episodeNumber: 2,
            title: 'Day 2: Neuro-Anchoring & Triggers Installation',
            duration: '03:45',
            videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
            isFreePreview: false,
            description: 'Installing peak emotional state anchors (Operative Login Required).',
          },
          {
            episodeNumber: 3,
            title: 'Day 3: Strategic Focus & Overthinking Elimination',
            duration: '03:45',
            videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
            isFreePreview: false,
            description: 'Calming central nervous system responses under high pressure.',
          },
        ],
      },
    },
  });

  const leadershipSeries = await prisma.programVideoSeries.create({
    data: {
      courseSlug: 'leadership',
      seriesTitle: 'Executive Command & Control Drills',
      category: 'Tactical Leadership',
      description: 'High-stakes executive command drills, crisis response management, and voice authority optimization.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
      sortOrder: 2,
      modules: {
        create: [
          {
            episodeNumber: 1,
            title: 'Module 1: Voice Projection & Command Authority',
            duration: '03:45',
            videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
            isFreePreview: true,
            description: 'Vocal acoustics and commanding presence (Free Public Preview).',
          },
          {
            episodeNumber: 2,
            title: 'Module 2: High-Stakes Crisis Simulation & Unit Dynamics',
            duration: '03:45',
            videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
            isFreePreview: false,
            description: 'Simulated high-pressure decision making under tight deadlines.',
          },
        ],
      },
    },
  });

  console.log(`✅ Program Video Series & Modules Seeded (${bmbSeries.seriesTitle}, ${leadershipSeries.seriesTitle})!`);

  // 6. Seed Job Vacancies & Applications
  console.log('💼 Seeding Job Vacancies & Recruitment Applications...');
  await prisma.jobApplication.deleteMany({});
  await prisma.jobVacancy.deleteMany({});

  await prisma.jobVacancy.create({
    data: {
      title: 'Sales & Growth Officer',
      department: 'Sales & Growth',
      employmentType: 'WORK_FROM_HOME',
      incomeText: 'RS. 45,000 - RS. 120,000 + High Commission',
      requirements: 'Strong interpersonal communication skills, basic WhatsApp fluency, self-motivated.',
      isActive: true,
      applications: {
        create: [
          {
            name: 'Kavindu Perera',
            phone: '071 709 6386',
            email: 'kavindu@gmail.com',
            experience: '2 years in direct sales and customer onboarding.',
            status: 'REVIEWED',
          },
          {
            name: 'Dilani Samarasinghe',
            phone: '077 412 8901',
            email: 'dilani@yahoo.com',
            experience: '1 year telesales experience.',
            status: 'APPLIED',
          },
        ],
      },
    },
  });

  await prisma.jobVacancy.create({
    data: {
      title: 'Mind Optimization Assistant Coach',
      department: 'Coaching & Training',
      employmentType: 'HYBRID',
      incomeText: 'RS. 80,000 + Performance Bonus',
      requirements: 'Psychology background, strong leadership presence, public speaking ability.',
      isActive: true,
    },
  });

  console.log('✅ Job Vacancies & Applications Seeded!');

  console.log('🎉 Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

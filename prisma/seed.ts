import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SEED) {
    console.error('🚫 FATAL: prisma/seed.ts is disabled in production to protect production data.');
    process.exit(1);
  }

  console.log('🌱 Starting UWE Database Seed — Full Realistic Data Set...');

  // ─────────────────────────────────────────────────────────────
  // CLEANUP: Remove existing data in correct dependency order
  // ─────────────────────────────────────────────────────────────
  console.log('🧹 Cleaning existing data...');
  await prisma.videoProgress.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.programVideoModule.deleteMany({});
  await prisma.programVideoSeries.deleteMany({});
  await prisma.jobApplication.deleteMany({});
  await prisma.jobVacancy.deleteMany({});
  await prisma.paymentSlip.deleteMany({});
  await prisma.courseReview.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.courseBatch.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.demoVideo.deleteMany({});
  await prisma.staffMember.deleteMany({});
  await prisma.announcementBanner.deleteMany({});
  await prisma.instructor.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.adminUser.deleteMany({});

  // ─────────────────────────────────────────────────────────────
  // 1. ADMIN USERS (4 roles)
  // ─────────────────────────────────────────────────────────────
  console.log('👑 Seeding Admin Users...');
  await prisma.adminUser.createMany({
    data: [
      {
        email: 'admin@uwe.lk',
        name: 'Ruwan Jayasinghe',
        passwordHash: 'admin1234',
        role: 'SUPER_ADMIN',
      },
      {
        email: 'commander@uwe.lk',
        name: 'Nimal Bandara',
        passwordHash: 'commander123',
        role: 'COMMANDER',
      },
      {
        email: 'coach@uwe.lk',
        name: 'Iresha Fernando',
        passwordHash: 'coach123',
        role: 'COACH',
      },
      {
        email: 'recruiter@uwe.lk',
        name: 'Tharindu Wijesinghe',
        passwordHash: 'recruiter123',
        role: 'RECRUITER',
      },
    ],
  });
  console.log('  ✅ 4 Admin Users created');

  // ─────────────────────────────────────────────────────────────
  // 2. STUDENT USERS (10 realistic Sri Lankan students)
  // ─────────────────────────────────────────────────────────────
  console.log('🎓 Seeding Student Users...');
  await prisma.user.createMany({
    data: [
      {
        email: 'kavindu.perera@gmail.com',
        name: 'Kavindu Perera',
        phone: '071 234 5678',
        passwordHash: 'password123',
        isEnrolled: true,
        enrolledCourseSlugs: 'bmb,leadership',
      },
      {
        email: 'dilani.silva@gmail.com',
        name: 'Dilani Silva',
        phone: '077 345 6789',
        passwordHash: 'password123',
        isEnrolled: true,
        enrolledCourseSlugs: 'bmb',
      },
      {
        email: 'sahan.rajapaksa@yahoo.com',
        name: 'Sahan Rajapaksa',
        phone: '076 456 7890',
        passwordHash: 'password123',
        isEnrolled: true,
        enrolledCourseSlugs: 'ignit',
      },
      {
        email: 'thilini.mendis@gmail.com',
        name: 'Thilini Mendis',
        phone: '070 567 8901',
        passwordHash: 'password123',
        isEnrolled: true,
        enrolledCourseSlugs: 'bmb,leadership,ignit',
      },
      {
        email: 'nuwan.jayawardena@hotmail.com',
        name: 'Nuwan Jayawardena',
        phone: '075 678 9012',
        passwordHash: 'password123',
        isEnrolled: true,
        enrolledCourseSlugs: 'leadership',
      },
      {
        email: 'rashmi.kumari@gmail.com',
        name: 'Rashmi Kumari',
        phone: '071 789 0123',
        passwordHash: 'password123',
        isEnrolled: true,
        enrolledCourseSlugs: 'bmb,ignit',
      },
      {
        email: 'chaminda.fernando@gmail.com',
        name: 'Chaminda Fernando',
        phone: '077 890 1234',
        passwordHash: 'password123',
        isEnrolled: false,
        enrolledCourseSlugs: '',
      },
      {
        email: 'sachini.liyanage@yahoo.com',
        name: 'Sachini Liyanage',
        phone: '076 901 2345',
        passwordHash: 'password123',
        isEnrolled: true,
        enrolledCourseSlugs: 'bmb',
      },
      {
        email: 'dinesh.wickramasinghe@gmail.com',
        name: 'Dinesh Wickramasinghe',
        phone: '070 012 3456',
        passwordHash: 'password123',
        isEnrolled: true,
        enrolledCourseSlugs: 'leadership,ignit',
      },
      {
        email: 'malsha.gunasekara@gmail.com',
        name: 'Malsha Gunasekara',
        phone: '075 123 4567',
        passwordHash: 'password123',
        isEnrolled: true,
        enrolledCourseSlugs: 'bmb,leadership,ignit',
      },
    ],
  });
  console.log('  ✅ 10 Student Users created');

  // ─────────────────────────────────────────────────────────────
  // 3. COURSES (3 programs)
  // ─────────────────────────────────────────────────────────────
  console.log('📚 Seeding Courses & Batches...');
  const bmb = await prisma.course.create({
    data: {
      slug: 'bmb',
      title: 'Blind Mind Breaker (BMB)',
      subtitle: 'Subconscious Mind Optimization Protocol',
      badge: 'MIND DIVISION',
      category: 'MIND',
      description: 'Deconstruct subconscious mental barriers, eliminate fear responses, and install peak-performance neural patterns through a 5-day intensive program.',
      price: 12500,
      currency: 'RS.',
      duration: '5 Days Intensive',
      isFeatured: true,
      batches: {
        create: [
          {
            batchNumber: 1,
            startDate: new Date('2026-08-25'),
            scheduleText: '2026-08-25 (Zoom Live)',
            totalSeats: 25,
            availableSeats: 14,
            status: 'UPCOMING',
          },
          {
            batchNumber: 2,
            startDate: new Date('2026-07-10'),
            scheduleText: '2026-07-10 (Zoom Live)',
            totalSeats: 25,
            availableSeats: 0,
            status: 'COMPLETED',
          },
        ],
      },
    },
  });

  const leadership = await prisma.course.create({
    data: {
      slug: 'leadership',
      title: 'UWE Leadership Academy',
      subtitle: 'Command & Control Tactical Training',
      badge: 'COMMAND DIVISION',
      category: 'COMMAND',
      description: 'High-stakes executive command drills, crisis response management, and voice authority optimization over 4 intensive weeks.',
      price: 100000,
      currency: 'RS.',
      duration: '4-Week Tactical Program',
      isFeatured: true,
      batches: {
        create: [
          {
            batchNumber: 1,
            startDate: new Date('2026-09-05'),
            scheduleText: '2026-09-05 (Zoom Live)',
            totalSeats: 15,
            availableSeats: 9,
            status: 'UPCOMING',
          },
          {
            batchNumber: 2,
            startDate: new Date('2026-06-20'),
            scheduleText: '2026-06-20 (Zoom Live)',
            totalSeats: 15,
            availableSeats: 2,
            status: 'ACTIVE',
          },
        ],
      },
    },
  });

  const ignit = await prisma.course.create({
    data: {
      slug: 'ignit',
      title: 'UWE IGNIT Accelerator',
      subtitle: 'Sri Lankan Entrepreneurial Incubator',
      badge: 'ENTERPRISE DIVISION',
      category: 'ENTERPRISE',
      description: 'Venture scaling, pitch deck engineering, and angel investor syndicate connections for ambitious Sri Lankan entrepreneurs.',
      price: 45000,
      currency: 'RS.',
      duration: '8-Week Incubator',
      isFeatured: true,
      batches: {
        create: [
          {
            batchNumber: 1,
            startDate: new Date('2026-09-20'),
            scheduleText: '2026-09-20 (Zoom Live)',
            totalSeats: 20,
            availableSeats: 12,
            status: 'UPCOMING',
          },
          {
            batchNumber: 2,
            startDate: new Date('2026-07-01'),
            scheduleText: '2026-07-01 (Zoom Live)',
            totalSeats: 20,
            availableSeats: 3,
            status: 'ACTIVE',
          },
        ],
      },
    },
  });

  console.log('  ✅ 3 Courses with 6 Batches created');

  // ─────────────────────────────────────────────────────────────
  // 4. LEADS (8 inquiries — mixed statuses)
  // ─────────────────────────────────────────────────────────────
  console.log('📋 Seeding Leads...');
  await prisma.lead.createMany({
    data: [
      {
        name: 'Amara Weerasinghe',
        phone: '071 222 3344',
        email: 'amara.w@gmail.com',
        courseId: bmb.id,
        courseSlug: 'bmb',
        inquiryType: 'BMB',
        message: 'I saw your Instagram ad about BMB. Can I join the next batch?',
        whatsappSent: true,
        status: 'NEW',
      },
      {
        name: 'Pasan Madhushanka',
        phone: '077 555 6677',
        email: 'pasan.m@yahoo.com',
        courseId: leadership.id,
        courseSlug: 'leadership',
        inquiryType: 'LEADERSHIP',
        message: 'I am a team leader at a logistics company. Interested in Leadership Academy for my team of 5.',
        whatsappSent: true,
        status: 'CONTACTED',
      },
      {
        name: 'Isuru Kavinda',
        phone: '076 111 2233',
        email: 'isuru.k@gmail.com',
        courseId: bmb.id,
        courseSlug: 'bmb',
        inquiryType: 'BMB',
        message: 'I want to overcome public speaking fear. Will BMB help?',
        whatsappSent: true,
        status: 'ENROLLED',
      },
      {
        name: 'Nethmi Senanayake',
        phone: '070 444 5566',
        email: 'nethmi.s@hotmail.com',
        courseId: ignit.id,
        courseSlug: 'ignit',
        inquiryType: 'IGNIT',
        message: 'I have a small handmade craft business. Can IGNIT help me scale online?',
        whatsappSent: true,
        status: 'NEW',
      },
      {
        name: 'Roshan de Zoysa',
        phone: '075 777 8899',
        email: 'roshan.dz@gmail.com',
        courseId: leadership.id,
        courseSlug: 'leadership',
        inquiryType: 'LEADERSHIP',
        message: 'I want to learn crisis management for my restaurant chain.',
        whatsappSent: true,
        status: 'ENROLLED',
      },
      {
        name: 'Sanduni Rathnayake',
        phone: '071 333 4455',
        email: 'sanduni.r@gmail.com',
        courseSlug: 'bmb',
        inquiryType: 'BMB',
        message: 'My friend did BMB and it changed her life. I want to join too.',
        whatsappSent: true,
        status: 'CONTACTED',
      },
      {
        name: 'Lahiru Gamage',
        phone: '077 999 0011',
        email: 'lahiru.g@yahoo.com',
        courseSlug: 'ignit',
        inquiryType: 'IGNIT',
        message: 'Looking for investor connections for my tech startup.',
        whatsappSent: true,
        status: 'REJECTED',
        notes: 'Not based in Sri Lanka — outside program scope.',
      },
      {
        name: 'Kaveesha Wijesuriya',
        phone: '076 666 7788',
        email: 'kaveesha.w@gmail.com',
        inquiryType: 'GENERAL',
        message: 'What programs do you offer for fresh graduates?',
        whatsappSent: false,
        status: 'NEW',
      },
    ],
  });
  console.log('  ✅ 8 Leads created');

  // ─────────────────────────────────────────────────────────────
  // 5. DEMO VIDEOS (6 public media vault)
  // ─────────────────────────────────────────────────────────────
  console.log('🎬 Seeding Demo Videos...');
  await prisma.demoVideo.createMany({
    data: [
      {
        title: 'BMB Subconscious Paradigm Shift',
        subtitle: 'Mind Optimization Protocol Demonstration',
        duration: '03:45',
        posterUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
        videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
        badge: 'BMB MIND DIVISION',
        category: 'BMB',
        description: 'Live demonstration of subconscious fear response deconstruction and neuro-anchoring protocols.',
        isFeatured: true,
        sortOrder: 1,
      },
      {
        title: 'Tactical Crisis Simulation & Voice Command',
        subtitle: 'High-Stakes Leadership Drill',
        duration: '04:12',
        posterUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
        videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
        badge: 'COMMAND DIVISION',
        category: 'LEADERSHIP',
        description: 'High-stakes leadership drills executing real-time crisis management and command authority under pressure.',
        isFeatured: true,
        sortOrder: 2,
      },
      {
        title: 'UWE IGNIT Pitch Night & Venture Syndicate',
        subtitle: 'Enterprise Incubator Showcase',
        duration: '05:30',
        posterUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=800&q=80',
        videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
        badge: 'ENTERPRISE DIVISION',
        category: 'IGNIT',
        description: 'Graduates pitching high-growth Sri Lankan ventures to angel investors and venture capitalists.',
        isFeatured: true,
        sortOrder: 3,
      },
      {
        title: 'Operative Transformation Case Study',
        subtitle: 'Executive Alumni Reel',
        duration: '02:58',
        posterUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
        videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
        badge: 'ALUMNI REEL',
        category: 'TESTIMONIAL',
        description: 'Real feedback from executive operatives who underwent the 5-day BMB mind optimization program.',
        isFeatured: true,
        sortOrder: 4,
      },
      {
        title: 'Neural State Trigger Anchor Drill',
        subtitle: 'Focus Conditioning Protocol',
        duration: '03:15',
        posterUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
        videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
        badge: 'BMB ADVANCED',
        category: 'BMB',
        description: 'Conditioning focus triggers to enter flow state in under 60 seconds.',
        isFeatured: false,
        sortOrder: 5,
      },
      {
        title: 'Executive Voice Projection Dynamics',
        subtitle: 'Acoustics & Presence Drill',
        duration: '04:40',
        posterUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
        videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
        badge: 'COMMAND DRILL',
        category: 'LEADERSHIP',
        description: 'Vocal acoustics and commanding resonance for executive meetings.',
        isFeatured: false,
        sortOrder: 6,
      },
    ],
  });
  console.log('  ✅ 6 Demo Videos created');

  // ─────────────────────────────────────────────────────────────
  // 6. PROGRAM VIDEO SERIES & MODULES (3 series, ~8 modules)
  // ─────────────────────────────────────────────────────────────
  console.log('🎥 Seeding Program Video Series & Modules...');
  await prisma.programVideoSeries.create({
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
            duration: '12:45',
            videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
            isFreePreview: true,
            description: 'Introduction to subconscious anxiety patterns and how they control decision making.',
          },
          {
            episodeNumber: 2,
            title: 'Day 2: Neuro-Anchoring & Triggers Installation',
            duration: '18:30',
            videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
            isFreePreview: false,
            description: 'Installing peak emotional state anchors through NLP-based conditioning.',
          },
          {
            episodeNumber: 3,
            title: 'Day 3: Strategic Focus & Overthinking Elimination',
            duration: '15:20',
            videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
            isFreePreview: false,
            description: 'Calming central nervous system responses under high pressure situations.',
          },
        ],
      },
    },
  });

  await prisma.programVideoSeries.create({
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
            duration: '14:10',
            videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
            isFreePreview: true,
            description: 'Vocal acoustics and commanding presence techniques for boardroom dominance.',
          },
          {
            episodeNumber: 2,
            title: 'Module 2: High-Stakes Crisis Simulation',
            duration: '22:05',
            videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
            isFreePreview: false,
            description: 'Simulated high-pressure decision making under tight deadlines with real case studies.',
          },
        ],
      },
    },
  });

  await prisma.programVideoSeries.create({
    data: {
      courseSlug: 'ignit',
      seriesTitle: 'IGNIT Venture Building Playbook',
      category: 'Entrepreneurial Incubation',
      description: 'From idea validation to pitch deck mastery — build a fundable Sri Lankan startup from scratch.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=800&q=80',
      sortOrder: 3,
      modules: {
        create: [
          {
            episodeNumber: 1,
            title: 'Week 1: Idea Validation & Market Analysis',
            duration: '16:30',
            videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
            isFreePreview: true,
            description: 'How to validate your business idea using lean methodology for the Sri Lankan market.',
          },
          {
            episodeNumber: 2,
            title: 'Week 2: Revenue Model Engineering',
            duration: '19:45',
            videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
            isFreePreview: false,
            description: 'Building sustainable revenue models and pricing strategies for local and export markets.',
          },
          {
            episodeNumber: 3,
            title: 'Week 3: Pitch Deck Mastery & Investor Readiness',
            duration: '21:15',
            videoUrl: 'https://www.youtube.com/watch?v=JQypYNVzS3Q',
            isFreePreview: false,
            description: 'Crafting a pitch deck that wins angel investor attention and closes seed funding.',
          },
        ],
      },
    },
  });
  console.log('  ✅ 3 Program Video Series with 8 Modules created');

  // ─────────────────────────────────────────────────────────────
  // 7. JOB VACANCIES (4) & APPLICATIONS (8)
  // ─────────────────────────────────────────────────────────────
  console.log('💼 Seeding Job Vacancies & Applications...');
  const salesJob = await prisma.jobVacancy.create({
    data: {
      title: 'Sales & Growth Officer',
      department: 'Sales & Growth',
      employmentType: 'WORK_FROM_HOME',
      incomeText: 'RS. 45,000 - RS. 120,000 + High Commission',
      requirements: 'Strong interpersonal communication skills, WhatsApp fluency, self-motivated with a target-driven mindset.',
      openPositions: 5,
      hiredCount: 2,
      hiringStatus: 'HIRING',
      isActive: true,
    },
  });

  const coachJob = await prisma.jobVacancy.create({
    data: {
      title: 'Mind Optimization Assistant Coach',
      department: 'Coaching & Training',
      employmentType: 'HYBRID',
      incomeText: 'RS. 80,000 + Performance Bonus',
      requirements: 'Psychology background or NLP certification, strong leadership presence, public speaking ability.',
      openPositions: 2,
      hiredCount: 1,
      hiringStatus: 'HIRING',
      isActive: true,
    },
  });

  const devJob = await prisma.jobVacancy.create({
    data: {
      title: 'Full-Stack Developer',
      department: 'Technology & Digital',
      employmentType: 'WORK_FROM_HOME',
      incomeText: 'RS. 100,000 - RS. 200,000',
      requirements: 'React, Node.js, TypeScript, PostgreSQL experience. 2+ years of professional development.',
      openPositions: 3,
      hiredCount: 0,
      hiringStatus: 'HIRING',
      isActive: true,
    },
  });

  const marketingJob = await prisma.jobVacancy.create({
    data: {
      title: 'Social Media & Content Strategist',
      department: 'Marketing & Branding',
      employmentType: 'FULL_TIME',
      incomeText: 'RS. 60,000 - RS. 90,000',
      requirements: 'Portfolio of social media campaigns, Canva/Figma skills, understanding of Sri Lankan market.',
      openPositions: 2,
      hiredCount: 2,
      hiringStatus: 'HIRING_FINISHED',
      isActive: false,
    },
  });

  await prisma.jobApplication.createMany({
    data: [
      {
        vacancyId: salesJob.id,
        name: 'Kasun Madushanka',
        phone: '071 112 3344',
        email: 'kasun.m@gmail.com',
        experience: '3 years in direct sales at Dialog Axiata, exceeded quarterly targets by 40%.',
        status: 'HIRED',
      },
      {
        vacancyId: salesJob.id,
        name: 'Sewwandi Perera',
        phone: '077 223 4455',
        email: 'sewwandi.p@yahoo.com',
        experience: '1 year as a telesales executive at a Colombo-based insurance firm.',
        status: 'HIRED',
      },
      {
        vacancyId: salesJob.id,
        name: 'Ravindu Dissanayake',
        phone: '076 334 5566',
        email: 'ravindu.d@gmail.com',
        experience: 'Fresh graduate from University of Kelaniya, Business Management degree.',
        status: 'SHORTLISTED',
      },
      {
        vacancyId: coachJob.id,
        name: 'Dr. Harsha Kumara',
        phone: '070 445 6677',
        email: 'harsha.k@gmail.com',
        experience: '5 years as a clinical psychologist at NHSL Colombo. Certified NLP Practitioner.',
        status: 'HIRED',
      },
      {
        vacancyId: coachJob.id,
        name: 'Priyanga Wickramaratne',
        phone: '075 556 7788',
        email: 'priyanga.w@hotmail.com',
        experience: '2 years as a life coach, specializing in mindset training for young professionals.',
        status: 'REVIEWED',
      },
      {
        vacancyId: devJob.id,
        name: 'Ashan Pathirana',
        phone: '071 667 8899',
        email: 'ashan.p@gmail.com',
        experience: '3 years full-stack developer at 99x Technology. React, Node.js, AWS.',
        status: 'SHORTLISTED',
      },
      {
        vacancyId: devJob.id,
        name: 'Ishara Gunaratne',
        phone: '077 778 9900',
        email: 'ishara.g@gmail.com',
        experience: 'Junior developer, 1 year experience with Vue.js and Express. SLIIT graduate.',
        status: 'APPLIED',
      },
      {
        vacancyId: marketingJob.id,
        name: 'Nadeesha Herath',
        phone: '076 889 0011',
        email: 'nadeesha.h@gmail.com',
        experience: '4 years managing social media for fashion brands. 50K+ followers managed.',
        status: 'HIRED',
      },
    ],
  });
  console.log('  ✅ 4 Job Vacancies with 8 Applications created');

  // ─────────────────────────────────────────────────────────────
  // 8. STAFF MEMBERS (6 — mixed departments)
  // ─────────────────────────────────────────────────────────────
  console.log('👥 Seeding Staff Members...');
  await prisma.staffMember.createMany({
    data: [
      {
        name: 'Ruwan Jayasinghe',
        role: 'Founder & Chief Commander',
        department: 'Executive Leadership',
        email: 'ruwan@uwe.lk',
        phone: '071 100 2000',
        bio: 'Visionary behind UWE Empire. 10+ years in mind optimization coaching and enterprise building.',
        isActive: true,
      },
      {
        name: 'Nimal Bandara',
        role: 'Head of Operations',
        department: 'Operations',
        email: 'nimal@uwe.lk',
        phone: '077 200 3000',
        bio: 'Manages day-to-day operations, batch scheduling, and student logistics across all divisions.',
        isActive: true,
      },
      {
        name: 'Iresha Fernando',
        role: 'Lead BMB Coach',
        department: 'Coaching & Training',
        email: 'iresha@uwe.lk',
        phone: '076 300 4000',
        bio: 'Certified NLP Master Practitioner. Coached 500+ students through subconscious rewiring protocols.',
        isActive: true,
      },
      {
        name: 'Tharindu Wijesinghe',
        role: 'Recruitment & Talent Manager',
        department: 'Human Resources',
        email: 'tharindu@uwe.lk',
        phone: '070 400 5000',
        bio: 'Handles all hiring, onboarding, and team expansion across the UWE ecosystem.',
        isActive: true,
      },
      {
        name: 'Amaya Rajapaksa',
        role: 'Digital Marketing Lead',
        department: 'Marketing & Branding',
        email: 'amaya@uwe.lk',
        phone: '075 500 6000',
        bio: 'Runs all social media campaigns, ad funnels, and brand identity across Instagram, TikTok, and Facebook.',
        isActive: true,
      },
      {
        name: 'Prasad Kumarasinghe',
        role: 'Platform Developer',
        department: 'Technology & Digital',
        email: 'prasad@uwe.lk',
        phone: '071 600 7000',
        bio: 'Full-stack developer responsible for the UWE platform, LMS, and payment integrations.',
        isActive: false,
      },
    ],
  });
  console.log('  ✅ 6 Staff Members created');

  // ─────────────────────────────────────────────────────────────
  // 9. ANNOUNCEMENT BANNERS (2 — 1 active, 1 inactive)
  // ─────────────────────────────────────────────────────────────
  console.log('📢 Seeding Announcement Banners...');
  await prisma.announcementBanner.createMany({
    data: [
      {
        message: '⚡ BMB BATCH 2026 — ONLY 14 SEATS REMAINING! REGISTRATION CLOSING SOON',
        badgeText: 'URGENT',
        bannerType: 'URGENT',
        isActive: true,
      },
      {
        message: '🎉 IGNIT Accelerator graduates raised RS. 2.5M+ in seed funding last quarter!',
        badgeText: 'NEWS',
        bannerType: 'PROMO',
        isActive: false,
      },
    ],
  });
  console.log('  ✅ 2 Announcement Banners created');

  // ─────────────────────────────────────────────────────────────
  // 10. PAYMENT SLIPS (6 — VERIFIED, PENDING, REJECTED)
  // ─────────────────────────────────────────────────────────────
  console.log('🏦 Seeding Payment Slips...');
  await prisma.paymentSlip.createMany({
    data: [
      {
        studentName: 'Kavindu Perera',
        studentPhone: '071 234 5678',
        studentEmail: 'kavindu.perera@gmail.com',
        courseSlug: 'bmb',
        slipUrl: 'https://placehold.co/400x600/1a1a2e/FFFFFF?text=Bank+Slip+001',
        amount: 12500,
        bankReference: 'BOC-2026-08-001',
        status: 'VERIFIED',
      },
      {
        studentName: 'Dilani Silva',
        studentPhone: '077 345 6789',
        studentEmail: 'dilani.silva@gmail.com',
        courseSlug: 'bmb',
        slipUrl: 'https://placehold.co/400x600/1a1a2e/FFFFFF?text=Bank+Slip+002',
        amount: 12500,
        bankReference: 'HNB-2026-08-015',
        status: 'VERIFIED',
      },
      {
        studentName: 'Nuwan Jayawardena',
        studentPhone: '075 678 9012',
        studentEmail: 'nuwan.jayawardena@hotmail.com',
        courseSlug: 'leadership',
        slipUrl: 'https://placehold.co/400x600/1a1a2e/FFFFFF?text=Bank+Slip+003',
        amount: 100000,
        bankReference: 'COMM-2026-08-042',
        status: 'VERIFIED',
      },
      {
        studentName: 'Sahan Rajapaksa',
        studentPhone: '076 456 7890',
        studentEmail: 'sahan.rajapaksa@yahoo.com',
        courseSlug: 'ignit',
        slipUrl: 'https://placehold.co/400x600/1a1a2e/FFFFFF?text=Bank+Slip+004',
        amount: 45000,
        bankReference: 'SAMP-2026-08-078',
        status: 'PENDING',
      },
      {
        studentName: 'Rashmi Kumari',
        studentPhone: '071 789 0123',
        studentEmail: 'rashmi.kumari@gmail.com',
        courseSlug: 'bmb',
        slipUrl: 'https://placehold.co/400x600/1a1a2e/FFFFFF?text=Bank+Slip+005',
        amount: 12500,
        bankReference: 'NSB-2026-08-103',
        status: 'PENDING',
      },
      {
        studentName: 'Chaminda Fernando',
        studentPhone: '077 890 1234',
        studentEmail: 'chaminda.fernando@gmail.com',
        courseSlug: 'leadership',
        slipUrl: 'https://placehold.co/400x600/1a1a2e/FFFFFF?text=Bank+Slip+006',
        amount: 100000,
        bankReference: 'PB-2026-07-221',
        status: 'REJECTED',
        notes: 'Blurred slip image — bank reference not readable. Asked student to re-upload.',
      },
    ],
  });
  console.log('  ✅ 6 Payment Slips created');

  // ─────────────────────────────────────────────────────────────
  // 11. COUPONS (4 — % and fixed discounts)
  // ─────────────────────────────────────────────────────────────
  console.log('🎟️ Seeding Coupons...');
  await prisma.coupon.createMany({
    data: [
      {
        code: 'EMPIRE20',
        discountPercent: 20,
        discountAmount: null,
        courseSlug: null,
        maxUses: 100,
        usedCount: 34,
        expiryDate: new Date('2026-12-31'),
        isActive: true,
        description: '20% off any program — early bird warrior discount.',
      },
      {
        code: 'BMB5000',
        discountPercent: null,
        discountAmount: 5000,
        courseSlug: 'bmb',
        maxUses: 50,
        usedCount: 12,
        expiryDate: new Date('2026-10-31'),
        isActive: true,
        description: 'RS. 5,000 flat off BMB registration — limited batch promo.',
      },
      {
        code: 'IGNIT30',
        discountPercent: 30,
        discountAmount: null,
        courseSlug: 'ignit',
        maxUses: 25,
        usedCount: 25,
        expiryDate: new Date('2026-09-30'),
        isActive: false,
        description: '30% off IGNIT Accelerator — fully redeemed.',
      },
      {
        code: 'WARRIOR50',
        discountPercent: 50,
        discountAmount: null,
        courseSlug: null,
        maxUses: 10,
        usedCount: 3,
        expiryDate: new Date('2026-11-15'),
        isActive: true,
        description: '50% off any program — VIP referral code for top alumni.',
      },
    ],
  });
  console.log('  ✅ 4 Coupons created');

  // ─────────────────────────────────────────────────────────────
  // 12. COURSE REVIEWS (5 — varied ratings)
  // ─────────────────────────────────────────────────────────────
  console.log('⭐ Seeding Course Reviews...');
  await prisma.courseReview.createMany({
    data: [
      {
        courseSlug: 'bmb',
        studentName: 'Kavindu Perera',
        studentRole: 'Software Engineer / BMB Cohort 12',
        rating: 5,
        title: 'Life-changing experience',
        comment: 'BMB completely rewired how I handle stress at work. I used to freeze during presentations — now I command the room. Ruwan sir is a genius.',
        isVerified: true,
        isApproved: true,
      },
      {
        courseSlug: 'bmb',
        studentName: 'Sachini Liyanage',
        studentRole: 'University Student / BMB Cohort 14',
        rating: 5,
        title: 'Conquered my social anxiety',
        comment: 'I could barely order food at a restaurant before BMB. After 5 days, I presented my thesis to 200 people. No exaggeration. This works.',
        isVerified: true,
        isApproved: true,
      },
      {
        courseSlug: 'leadership',
        studentName: 'Nuwan Jayawardena',
        studentRole: 'Operations Manager / Leadership Cohort 3',
        rating: 4,
        title: 'Practical leadership training',
        comment: 'The crisis simulation drills were incredibly realistic. My team management has improved 10x. Only wish it was longer than 4 weeks.',
        isVerified: true,
        isApproved: true,
      },
      {
        courseSlug: 'ignit',
        studentName: 'Sahan Rajapaksa',
        studentRole: 'Startup Founder / IGNIT Cohort 2',
        rating: 5,
        title: 'Got funded within 3 months',
        comment: 'IGNIT connected me with angel investors I never would have found on my own. My edtech startup raised RS. 1.2M seed round. Worth every rupee.',
        isVerified: true,
        isApproved: true,
      },
      {
        courseSlug: 'leadership',
        studentName: 'Dinesh Wickramasinghe',
        studentRole: 'Restaurant Chain Owner / Leadership Cohort 5',
        rating: 4,
        title: 'Voice command techniques are powerful',
        comment: 'I run 3 restaurants and managing staff was a nightmare. The voice projection and authority techniques from this program changed everything.',
        isVerified: true,
        isApproved: true,
      },
    ],
  });
  console.log('  ✅ 5 Course Reviews created');

  // ─────────────────────────────────────────────────────────────
  // 13. INSTRUCTORS (3 — one per division)
  // ─────────────────────────────────────────────────────────────
  console.log('🧑‍🏫 Seeding Instructors...');
  await prisma.instructor.createMany({
    data: [
      {
        name: 'Ruwan Jayasinghe',
        title: 'Master Commander & Mind Architect',
        bio: 'Founder of UWE Empire with 10+ years in subconscious mind optimization, NLP mastery, and peak-performance coaching. Trained 1,500+ operatives across Sri Lanka.',
        credentials: 'MBA (UK), Certified NLP Master Trainer, ICF Certified Coach, 10+ Years Enterprise Coaching',
        specialties: 'Subconscious Reprogramming, Fear Elimination, High-Ticket Sales Psychology, Wealth Mindset Installation',
        courseSlugs: 'bmb,leadership',
        rating: 4.9,
        studentCount: 1520,
        isActive: true,
      },
      {
        name: 'Iresha Fernando',
        title: 'Senior BMB Coach & Behavioral Specialist',
        bio: 'Clinical psychology background with deep expertise in behavioral pattern disruption. Specializes in anxiety and confidence transformation.',
        credentials: 'MSc Psychology (Colombo), Certified NLP Practitioner, CBT Specialist, 7 Years Coaching',
        specialties: 'Anxiety Deconstruction, Confidence Architecture, Public Speaking Mastery, Emotional Intelligence',
        courseSlugs: 'bmb',
        rating: 4.8,
        studentCount: 890,
        isActive: true,
      },
      {
        name: 'Kasun Rathnayake',
        title: 'IGNIT Venture Architect & Startup Mentor',
        bio: 'Serial entrepreneur who built and exited 2 tech companies. Angel investor and mentor to 30+ Sri Lankan startups.',
        credentials: 'BBA (SLIIT), YCombinator Startup School Alumni, Angel Investor Network Member',
        specialties: 'Venture Scaling, Pitch Deck Engineering, Revenue Model Design, Investor Relations',
        courseSlugs: 'ignit',
        rating: 4.7,
        studentCount: 340,
        isActive: true,
      },
    ],
  });
  console.log('  ✅ 3 Instructors created');

  // ─────────────────────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 SEED COMPLETED — Full Realistic Data Set Ready!');
  console.log('═══════════════════════════════════════════════════');
  console.log('  👑 4  Admin Users');
  console.log('  🎓 10 Student Users');
  console.log('  📚 3  Courses with 6 Batches');
  console.log('  📋 8  Leads');
  console.log('  🎬 6  Demo Videos');
  console.log('  🎥 3  Video Series with 8 Modules');
  console.log('  💼 4  Job Vacancies with 8 Applications');
  console.log('  👥 6  Staff Members');
  console.log('  📢 2  Announcement Banners');
  console.log('  🏦 6  Payment Slips');
  console.log('  🎟️  4  Coupons');
  console.log('  ⭐ 5  Course Reviews');
  console.log('  🧑‍🏫 3  Instructors');
  console.log('  ─────────────────────────────────────');
  console.log('  📊 TOTAL: 72 Records');
  console.log('═══════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

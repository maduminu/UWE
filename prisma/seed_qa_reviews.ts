import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚡ Populating missing Mastermind Q&As and Course Reviews...');

  // 1. Leadership Mastermind Questions
  const leadershipCount = await prisma.mastermindQuestion.count({ where: { courseSlug: 'leadership' } });
  if (leadershipCount === 0) {
    await prisma.mastermindQuestion.createMany({
      data: [
        {
          courseSlug: 'leadership',
          authorName: 'Roshan de Zoysa',
          authorBadge: 'LEADERSHIP OFFICER',
          question: 'How do you command authority when delegating high-stakes tasks without micromanaging the team?',
          drillTopic: 'Tactical Command & Delegation',
          answer: 'Anchor your directives to measurable outcomes rather than minute steps. Establish 24-hour milestone checkpoints and give the operative total tactical ownership over execution.',
          answeredBy: 'Commander Suranjith Godagama',
          isAnswered: true,
          isPinned: true,
          upvotes: 24,
        },
        {
          courseSlug: 'leadership',
          authorName: 'Nuwan Jayawardena',
          authorBadge: 'OPERATIONS LEAD',
          question: 'What psychological cues should I look for during executive boardroom negotiations to know when to hold firm on price?',
          drillTopic: 'High-Ticket Sales & Negotiation',
          answer: 'Watch for hesitation pauses after delivering your terms. Never speak first after naming your price. Silence is your greatest leverage — let the other party fill the void.',
          answeredBy: 'Ruwan Jayasinghe',
          isAnswered: true,
          isPinned: true,
          upvotes: 19,
        },
        {
          courseSlug: 'leadership',
          authorName: 'Sadun Perera',
          authorBadge: 'VERIFIED OPERATIVE',
          question: 'How do I handle insubordination or passive resistance from team members who were previously my peers?',
          drillTopic: 'Tactical Command & Delegation',
          answer: 'Have a direct 1-on-1 within 24 hours. Clear any unspoken assumptions calmly. Frame the standard as an organizational mission, not a personal preference.',
          answeredBy: 'Commander Suranjith Godagama',
          isAnswered: true,
          isPinned: false,
          upvotes: 15,
        },
        {
          courseSlug: 'leadership',
          authorName: 'Dinesh Wickramasinghe',
          authorBadge: 'BUSINESS OWNER',
          question: 'In crisis management drills, what is the first priority when an unexpected market shock hits your business revenue?',
          drillTopic: 'Overthinking & State Control',
          answer: '1) Conduct an immediate cash bleed audit. 2) Secure core recurring contracts. 3) Rally your tier-1 operatives and deliver a calm, decisive 30-day directive.',
          answeredBy: 'Ruwan Jayasinghe',
          isAnswered: true,
          isPinned: false,
          upvotes: 11,
        },
      ],
    });
    console.log('✅ Added 4 Leadership Mastermind Questions with Coach Answers');
  }

  // 2. IGNIT Mastermind Questions
  const ignitCount = await prisma.mastermindQuestion.count({ where: { courseSlug: 'ignit' } });
  if (ignitCount === 0) {
    await prisma.mastermindQuestion.createMany({
      data: [
        {
          courseSlug: 'ignit',
          authorName: 'Sahan Rajapaksa',
          authorBadge: 'INCUBATOR FOUNDER',
          question: 'What is the fastest validation method for an AI software product before writing any code?',
          drillTopic: 'Zero-to-One Venture Launch',
          answer: 'Build a high-converting landing page with a pre-order or waitlist form, run 10 targeted LinkedIn reachouts, and conduct 5 customer problem interviews to prove demand.',
          answeredBy: 'Dilshan Madusanka',
          isAnswered: true,
          isPinned: true,
          upvotes: 28,
        },
        {
          courseSlug: 'ignit',
          authorName: 'Dilani Silva',
          authorBadge: 'TECH ENTREPRENEUR',
          question: 'How should I structure equity splits when bringing in an technical co-founder at early stage?',
          drillTopic: 'Venture Capital & Financing',
          answer: 'Always implement a 4-year vesting schedule with a 1-year cliff. Value current cash investment, IP ownership, and full-time vs part-time operational dedication.',
          answeredBy: 'Dilshan Madusanka',
          isAnswered: true,
          isPinned: true,
          upvotes: 21,
        },
        {
          courseSlug: 'ignit',
          authorName: 'Lahiru Gamage',
          authorBadge: 'AUTOMATION SPECIALIST',
          question: 'Which automation pipelines generate the highest ROI for solo service agency founders?',
          drillTopic: 'AI Automation & No-Code Systems',
          answer: 'Automated lead scraping, AI personalized video outreach, automated booking with qualification surveys, and instant invoice generation via Stripe/bank slip OCR.',
          answeredBy: 'Dilshan Madusanka',
          isAnswered: true,
          isPinned: false,
          upvotes: 14,
        },
      ],
    });
    console.log('✅ Added 3 IGNIT Mastermind Questions with Coach Answers');
  }

  // 3. Rich Verified Course Reviews
  const currentReviews = await prisma.courseReview.findMany({ select: { courseSlug: true } });
  const countBySlug: Record<string, number> = {};
  currentReviews.forEach((r) => {
    countBySlug[r.courseSlug] = (countBySlug[r.courseSlug] || 0) + 1;
  });

  const additionalReviews: any[] = [];

  if ((countBySlug['bmb'] || 0) < 5) {
    additionalReviews.push(
      {
        courseSlug: 'bmb',
        studentName: 'Chathura Senanayake',
        studentRole: 'Senior Architect / BMB Cohort 15',
        rating: 5,
        title: 'Complete mental baseline calibration',
        comment: 'The sub-conscious conditioning audio directives in module 4 eliminated years of imposter syndrome in a single week. My productivity has doubled.',
        isVerified: true,
        isApproved: true,
      },
      {
        courseSlug: 'bmb',
        studentName: 'Nirmani Bandara',
        studentRole: 'Marketing Director / BMB Cohort 11',
        rating: 5,
        title: 'Unbelievable shift in executive presence',
        comment: 'This is not generic motivational advice. These are precision psychological tools. I walked into our board meeting completely unshakeable.',
        isVerified: true,
        isApproved: true,
      }
    );
  }

  if ((countBySlug['leadership'] || 0) < 5) {
    additionalReviews.push(
      {
        courseSlug: 'leadership',
        studentName: 'Pasan Madhushanka',
        studentRole: 'Managing Director / Leadership Cohort 4',
        rating: 5,
        title: 'Tactical delegation transformed my company',
        comment: 'I was working 14-hour days doing everyone else’s job. The command protocol allowed me to step back, establish clear accountability, and grow revenue by 40%.',
        isVerified: true,
        isApproved: true,
      },
      {
        courseSlug: 'leadership',
        studentName: 'Thilini Mendis',
        studentRole: 'Fintech Product Lead / Leadership Cohort 2',
        rating: 5,
        title: 'Executive voice command training is elite',
        comment: 'The boardroom simulation drills were intense and transformative. The feedback from Suranjith sir was raw, honest, and completely altered how I lead cross-functional teams.',
        isVerified: true,
        isApproved: true,
      },
      {
        courseSlug: 'leadership',
        studentName: 'Kasun Wickramasinghe',
        studentRole: 'Operations VP / Leadership Cohort 6',
        rating: 5,
        title: 'Unmatched crisis response framework',
        comment: 'When our primary supplier failed, our team deployed the contingency protocol learned in week 3. Zero downtime. Exceptional tactical coaching.',
        isVerified: true,
        isApproved: true,
      }
    );
  }

  if ((countBySlug['ignit'] || 0) < 5) {
    additionalReviews.push(
      {
        courseSlug: 'ignit',
        studentName: 'Isuru Kavinda',
        studentRole: 'AI SaaS Founder / IGNIT Cohort 1',
        rating: 5,
        title: 'From zero to paying customers in 28 days',
        comment: 'The no-code AI automation pipelines taught by Dilshan sir allowed me to build an entire customer support AI agent in 48 hours. Already closed 4 enterprise accounts.',
        isVerified: true,
        isApproved: true,
      },
      {
        courseSlug: 'ignit',
        studentName: 'Rashmi Kumari',
        studentRole: 'E-Commerce Founder / IGNIT Cohort 3',
        rating: 5,
        title: 'Investor pitch deck blueprint is worth gold',
        comment: 'We secured our pre-seed angel commitment within 3 weeks of graduating from IGNIT. The unit economics modeling session alone saved us months of trial and error.',
        isVerified: true,
        isApproved: true,
      },
      {
        courseSlug: 'ignit',
        studentName: 'Malsha Gunasekara',
        studentRole: 'Digital Agency Founder / IGNIT Cohort 2',
        rating: 5,
        title: 'The AI pipeline systems changed everything',
        comment: 'We replaced 3 manual lead-gen agencies with the automated outbound system built during the accelerator. True game-changer for Sri Lankan startups.',
        isVerified: true,
        isApproved: true,
      }
    );
  }

  if (additionalReviews.length > 0) {
    await prisma.courseReview.createMany({ data: additionalReviews });
    console.log(`✅ Seeded ${additionalReviews.length} additional verified course reviews`);
  }

  console.log('🎉 Population completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error in seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

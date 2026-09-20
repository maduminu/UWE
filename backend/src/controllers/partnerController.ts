import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { cacheGetOrSWR, cacheDelPattern } from '../config/redis';
import { logger } from '../utils/logger';
import { sendError, ErrorCode } from '../utils/apiResponse';

const SEED_PARTNERS = [
  {
    name: 'Kasun Jayawardena',
    title: 'Founder & CEO',
    companyName: 'Horizon Logistics Tech',
    companyType: 'Supply Chain & FinTech',
    industry: 'Logistics & Trade',
    bio: 'Pioneered cross-border freight automation in South Asia. Graduate of BMB Cohort 10, scaling from a local fleet to regional logistics operations spanning Singapore and Colombo.',
    photoUrl: '/partners/partner_kasun.jpg',
    cohort: 'BMB Cohort 10 / 2024',
    courseSlug: 'bmb',
    isFeatured: true,
    metrics: JSON.stringify({ revenue: '$3.4M ARR', team: '45 Operatives', growth: '+180% YoY' }),
    websiteUrl: 'https://horizonlogistics.io',
    linkedInUrl: 'https://linkedin.com',
    testimonial: "UWE's subconscious rewiring dismantled my operational glass ceilings. Within 14 months of graduating BMB, we scaled past $3M ARR.",
  },
  {
    name: 'Dr. Nirosha Samarasekara',
    title: 'Managing Director',
    companyName: 'BioHealth Dynamics',
    companyType: 'HealthTech & Biotechnology',
    industry: 'Healthcare & Life Sciences',
    bio: 'Leading high-complexity medical research commercialization and regional distribution. Transformed organizational mindset and multi-tier executive leadership structures.',
    photoUrl: '/partners/partner_nirosha.jpg',
    cohort: 'Leadership Cohort 8 / 2024',
    courseSlug: 'leadership',
    isFeatured: true,
    metrics: JSON.stringify({ revenue: '$1.8M ARR', team: '32 Operatives', reach: '4 Countries' }),
    websiteUrl: 'https://biohealthdynamics.com',
    linkedInUrl: 'https://linkedin.com',
    testimonial: "The sovereign mind protocols transformed how our board handles multi-million capital allocation and international expansion.",
  },
  {
    name: 'Rohan Senanayake',
    title: 'Co-Founder & CTO',
    companyName: 'Apex Capital Tech',
    companyType: 'FinTech & AI Systems',
    industry: 'Financial Technology',
    bio: 'Architecting high-frequency algorithmic liquidity tools and decentralized enterprise protocols. Raised seed capital backed by top Singaporean family offices.',
    photoUrl: '/partners/partner_rohan.jpg',
    cohort: 'IGNIT Cohort 5 / 2025',
    courseSlug: 'ignit',
    isFeatured: true,
    metrics: JSON.stringify({ valuation: '$5.2M', funding: '$1.2M Seed', users: '85k+ Active' }),
    websiteUrl: 'https://apexcapital.tech',
    linkedInUrl: 'https://linkedin.com',
    testimonial: "IGNIT's venture scaling framework gave us the exact blueprints to close our institutional seed round in 45 days.",
  },
  {
    name: 'Minoli Alwis',
    title: 'Founder & Creative Director',
    companyName: 'SilkRoute Luxe Direct',
    companyType: 'D2C Global Brands',
    industry: 'E-Commerce & Luxury Retail',
    bio: 'Scaled high-ticket bespoke Ceylon artisan luxury goods to North American and GCC affluent consumers with bespoke subscription mechanics.',
    photoUrl: '/partners/partner_minoli.jpg',
    cohort: 'BMB Cohort 12 / 2025',
    courseSlug: 'bmb',
    isFeatured: false,
    metrics: JSON.stringify({ revenue: '$2.1M ARR', exports: 'UK, US, UAE', growth: '+240% YoY' }),
    websiteUrl: 'https://silkrouteluxe.com',
    linkedInUrl: 'https://linkedin.com',
    testimonial: "High-ticket negotiation and psychological leverage learned at UWE doubled our average order volume in global markets.",
  },
  {
    name: 'Tariq Mansoor',
    title: 'Chief Executive Officer',
    companyName: 'Zenith Industrial Automation',
    companyType: 'Industrial Robotics',
    industry: 'Smart Manufacturing',
    bio: 'Automating textile and precision apparel manufacturing floors with proprietary vision-AI hardware across 12 Sri Lankan facilities.',
    cohort: 'Leadership Cohort 9 / 2024',
    courseSlug: 'leadership',
    isFeatured: false,
    metrics: JSON.stringify({ contracts: '$4.5M Backlog', plants: '12 Facilities', workforce: '120+' }),
    websiteUrl: 'https://zenithautomation.lk',
    linkedInUrl: 'https://linkedin.com',
    testimonial: "Elite leadership demands mental dominance under severe adversity. UWE instills ruthless operational clarity.",
  },
  {
    name: 'Chamath Vidanapathirana',
    title: 'Founder & Managing Partner',
    companyName: 'NexaScale Media',
    companyType: 'Enterprise B2B Growth Engine',
    industry: 'Digital Performance & Media',
    bio: 'Specialized growth marketing and client acquisition architecture for high-ticket SaaS and private equity portfolio companies globally.',
    cohort: 'IGNIT Cohort 6 / 2025',
    courseSlug: 'ignit',
    isFeatured: false,
    metrics: JSON.stringify({ clientMRR: '$180k MRR', pipeline: '$1.5M Active', retention: '96%' }),
    websiteUrl: 'https://nexascale.io',
    linkedInUrl: 'https://linkedin.com',
    testimonial: "We scaled our B2B agency from a boutique shop into an enterprise powerhouse using UWE's conversion architectures.",
  },
];

// @desc    Get all active business partners (public)
// @route   GET /api/partners
export const getPartners = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseSlug, isFeatured, search } = req.query;

    // Check count and seed if empty
    const count = await prisma.businessPartner.count();
    if (count === 0) {
      await prisma.businessPartner.createMany({
        data: SEED_PARTNERS,
      });
      logger.info('Seeded default collaborative business partners', 'PARTNERS');
    }

    const where: any = { isActive: true };

    if (courseSlug && typeof courseSlug === 'string' && courseSlug !== 'all') {
      where.courseSlug = courseSlug.toLowerCase();
    }

    if (isFeatured === 'true') {
      where.isFeatured = true;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
        { cohort: { contains: search, mode: 'insensitive' } },
      ];
    }

    const cacheKey = `partners:list:${JSON.stringify(where)}`;

    const result = await cacheGetOrSWR(
      cacheKey,
      async () => {
        const partners = await prisma.businessPartner.findMany({
          where,
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        });
        return { success: true, count: partners.length, data: partners };
      },
      { freshTtlSeconds: 120, staleTtlSeconds: 900 }
    );

    res.setHeader('X-Cache', result.cached ? (result.stale ? 'STALE' : 'HIT') : 'MISS');
    res.status(200).json({ ...result.data, cached: result.cached });
  } catch (error: any) {
    logger.error(`[getPartners] ${error.message}`, 'PARTNERS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch business partners.', req);
  }
};

// @desc    Get single partner by ID (public)
// @route   GET /api/partners/:id
export const getPartnerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const cacheKey = `partners:detail:${id}`;

    const result = await cacheGetOrSWR(
      cacheKey,
      async () => {
        let partner = await prisma.businessPartner.findFirst({
          where: {
            OR: [
              { id },
              { name: { equals: id, mode: 'insensitive' } },
              { companyName: { equals: id, mode: 'insensitive' } },
            ],
          },
        });

        // Resilient fallback to predefined partners if not yet queried by exact UUID
        if (!partner) {
          const match = SEED_PARTNERS.find(
            (p) =>
              p.name.toLowerCase() === id.toLowerCase() ||
              p.companyName.toLowerCase() === id.toLowerCase()
          );
          if (match) {
            partner = await prisma.businessPartner.findFirst({
              where: { name: match.name },
            });
          }
        }

        return { success: !!partner, data: partner };
      },
      { freshTtlSeconds: 300, staleTtlSeconds: 1800 }
    );

    if (!result.data || !result.data.data) {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Business partner not found.', req);
      return;
    }

    res.status(200).json(result.data);
  } catch (error: any) {
    logger.error(`[getPartnerById] ${error.message}`, 'PARTNERS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch partner details.', req);
  }
};

// @desc    Create new business partner (Admin)
// @route   POST /api/partners
export const createPartner = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      title,
      companyName,
      companyType,
      industry,
      bio,
      photoUrl,
      companyLogoUrl,
      websiteUrl,
      linkedInUrl,
      cohort,
      courseSlug,
      isFeatured,
      metrics,
      testimonial,
    } = req.body;

    if (!name || !title || !companyName || !bio || !courseSlug) {
      sendError(res, 400, ErrorCode.BAD_REQUEST, 'Name, title, companyName, bio, and courseSlug are required.', req);
      return;
    }

    const partner = await prisma.businessPartner.create({
      data: {
        name,
        title,
        companyName,
        companyType,
        industry,
        bio,
        photoUrl,
        companyLogoUrl,
        websiteUrl,
        linkedInUrl,
        cohort,
        courseSlug: courseSlug.toLowerCase(),
        isFeatured: Boolean(isFeatured),
        metrics: typeof metrics === 'object' ? JSON.stringify(metrics) : metrics,
        testimonial,
      },
    });

    await cacheDelPattern('partners:');

    res.status(201).json({ success: true, message: 'Business partner created successfully.', data: partner });
  } catch (error: any) {
    logger.error(`[createPartner] ${error.message}`, 'PARTNERS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create business partner.', req);
  }
};

// @desc    Update business partner (Admin)
// @route   PUT /api/partners/:id
export const updatePartner = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updateData: any = { ...req.body };

    if (updateData.courseSlug) {
      updateData.courseSlug = updateData.courseSlug.toLowerCase();
    }
    if (updateData.metrics && typeof updateData.metrics === 'object') {
      updateData.metrics = JSON.stringify(updateData.metrics);
    }

    const partner = await prisma.businessPartner.update({
      where: { id },
      data: updateData,
    });

    await cacheDelPattern('partners:');

    res.status(200).json({ success: true, message: 'Business partner updated successfully.', data: partner });
  } catch (error: any) {
    if (error.code === 'P2025') {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Business partner not found.', req);
      return;
    }
    logger.error(`[updatePartner] ${error.message}`, 'PARTNERS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update business partner.', req);
  }
};

// @desc    Delete business partner (Admin)
// @route   DELETE /api/partners/:id
export const deletePartner = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    await prisma.businessPartner.delete({
      where: { id },
    });

    await cacheDelPattern('partners:');

    res.status(200).json({ success: true, message: 'Business partner removed successfully.' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      sendError(res, 404, ErrorCode.NOT_FOUND, 'Business partner not found.', req);
      return;
    }
    logger.error(`[deletePartner] ${error.message}`, 'PARTNERS');
    sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete business partner.', req);
  }
};

import { Request, Response } from 'express';
import { prisma } from '../config/db';

// @desc    Get all active instructors
// @route   GET /api/instructors
export const getInstructors = async (_req: Request, res: Response): Promise<void> => {
  try {
    let instructors = await prisma.instructor.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    // Seed default instructors if none exist
    if (instructors.length === 0) {
      await prisma.instructor.createMany({
        data: [
          {
            name: 'Commander Janith Perera',
            title: 'Founder & Chief Mindset Architect',
            bio: 'Pioneer of the Subconscious Rewiring Framework in Sri Lanka. Trained over 4,500+ professionals and elite corporate executives.',
            credentials: 'B.Sc (Hons), Certified Master NLP Practitioner, Elite Executive Coach',
            specialties: 'Subconscious Reprogramming, High-Ticket Negotiation, Sovereign Mind Architecture',
            courseSlugs: 'bmb,leadership',
            rating: 4.98,
            studentCount: 3200,
            isActive: true,
          },
          {
            name: 'Suranjith Godagama',
            title: 'Enterprise Growth Strategist & Corporate Coach',
            bio: 'Renowned sales director and enterprise tactician with over 15+ years leading high-growth commercial divisions across South Asia.',
            credentials: 'MBA (UK), Fellow CIM, Senior Commercial Growth Director',
            specialties: 'B2B Sales Mastery, High-Performance Leadership, Market Penetration',
            courseSlugs: 'leadership,ignit',
            rating: 4.95,
            studentCount: 2150,
            isActive: true,
          },
          {
            name: 'Dilshan Madusanka',
            title: 'Lead Incubator Tactician & AI Systems Specialist',
            bio: 'Tech entrepreneur and venture strategist specializing in AI integration, rapid venture scaling, and capital allocation.',
            credentials: 'M.Sc Computing, Venture Mentor, AI Product Architect',
            specialties: 'AI Automation, Startup MVP Scaling, Venture Capital Pitching',
            courseSlugs: 'ignit',
            rating: 4.92,
            studentCount: 1400,
            isActive: true,
          },
        ],
      });

      instructors = await prisma.instructor.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    res.status(200).json({ success: true, count: instructors.length, data: instructors });
  } catch (error: any) {
    console.error('[getInstructors]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve instructors.' });
  }
};

// @desc    Create a new instructor (Admin)
// @route   POST /api/instructors
export const createInstructor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, title, bio, photoUrl, credentials, specialties, courseSlugs, rating, studentCount } = req.body;

    if (!name || !title || !bio) {
      res.status(400).json({ success: false, message: 'Name, Title, and Bio are required.' });
      return;
    }

    const newInstructor = await prisma.instructor.create({
      data: {
        name: name.trim(),
        title: title.trim(),
        bio: bio.trim(),
        photoUrl: photoUrl || null,
        credentials: credentials ? credentials.trim() : 'Certified Sovereign Coach',
        specialties: specialties ? specialties.trim() : 'Executive Leadership',
        courseSlugs: courseSlugs ? courseSlugs.trim().toLowerCase() : 'bmb,leadership,ignit',
        rating: rating ? parseFloat(rating) : 4.9,
        studentCount: studentCount ? parseInt(studentCount, 10) : 100,
        isActive: true,
      },
    });

    res.status(201).json({ success: true, message: 'Instructor added.', data: newInstructor });
  } catch (error: any) {
    console.error('[createInstructor]', error);
    res.status(500).json({ success: false, message: 'Failed to create instructor.' });
  }
};

// @desc    Update instructor (Admin)
// @route   PUT /api/instructors/:id
export const updateInstructor = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, title, bio, photoUrl, credentials, specialties, courseSlugs, rating, studentCount, isActive } = req.body;

    const updated = await prisma.instructor.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(title ? { title: title.trim() } : {}),
        ...(bio ? { bio: bio.trim() } : {}),
        ...(photoUrl !== undefined ? { photoUrl } : {}),
        ...(credentials ? { credentials: credentials.trim() } : {}),
        ...(specialties ? { specialties: specialties.trim() } : {}),
        ...(courseSlugs ? { courseSlugs: courseSlugs.trim().toLowerCase() } : {}),
        ...(rating ? { rating: parseFloat(rating) } : {}),
        ...(studentCount ? { studentCount: parseInt(studentCount, 10) } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
    });

    res.status(200).json({ success: true, message: 'Instructor updated.', data: updated });
  } catch (error: any) {
    console.error('[updateInstructor]', error);
    res.status(500).json({ success: false, message: 'Failed to update instructor.' });
  }
};

// @desc    Delete instructor (Admin)
// @route   DELETE /api/instructors/:id
export const deleteInstructor = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.instructor.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Instructor deleted.' });
  } catch (error: any) {
    console.error('[deleteInstructor]', error);
    res.status(500).json({ success: false, message: 'Failed to delete instructor.' });
  }
};

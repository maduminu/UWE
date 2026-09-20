import { Request, Response } from 'express';
import { prisma } from '../config/db';

// @desc    Get aggregated student dashboard data (enrolled courses, live completion %, certificates, payment slips, stats)
// @route   GET /api/users/:id/dashboard
export const getUserDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.id);

    // 1. Fetch user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isEnrolled: true,
        enrolledCourseSlugs: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'Student user not found.' });
      return;
    }

    // Parse enrolled course slugs — if student has no enrolled courses, accurately return empty list
    const slugs = (user.enrolledCourseSlugs || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    // 2. Fetch course definitions
    const courses = await prisma.course.findMany({
      where: {
        slug: { in: slugs },
      },
      include: {
        batches: {
          where: { status: 'UPCOMING' },
          orderBy: { startDate: 'asc' },
          take: 1,
        },
      },
    });

    // 3. Fetch video modules & series for these courses
    const seriesList = await prisma.programVideoSeries.findMany({
      where: {
        courseSlug: { in: slugs },
      },
      include: {
        modules: {
          orderBy: { episodeNumber: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 4. Fetch student's video watch progress
    const progressRecords = await prisma.videoProgress.findMany({
      where: { userId },
    });

    const completedModuleIdSet = new Set(
      progressRecords.filter((p) => p.isCompleted).map((p) => p.moduleId)
    );

    // 5. Fetch issued certificates
    const certificates = await prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedDate: 'desc' },
    });

    // 6. Fetch user's payment slips
    const userPaymentSlips = await prisma.paymentSlip.findMany({
      where: {
        OR: [
          { studentEmail: user.email },
          ...(user.phone ? [{ studentPhone: user.phone }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // 7. Aggregate stats per enrolled course
    let totalCompletedModulesAll = 0;
    let totalModulesAll = 0;

    const enrolledCourses = courses.map((course) => {
      const courseSeries = seriesList.filter((s) => s.courseSlug === course.slug);
      const allCourseModules = courseSeries.flatMap((s) => s.modules);
      const totalModules = allCourseModules.length;

      const completedInCourse = allCourseModules.filter((m) => completedModuleIdSet.has(m.id)).length;
      const progressPercent = totalModules > 0 ? Math.round((completedInCourse / totalModules) * 100) : 0;

      totalCompletedModulesAll += completedInCourse;
      totalModulesAll += totalModules;

      // Find last watched / next up module
      const nextModule = allCourseModules.find((m) => !completedModuleIdSet.has(m.id)) || allCourseModules[0] || null;
      const certificate = certificates.find((c) => c.courseSlug === course.slug) || null;

      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        badge: course.badge,
        category: course.category,
        price: course.price,
        duration: course.duration,
        totalModules,
        completedModules: completedInCourse,
        progressPercent,
        modules: allCourseModules.map((m) => ({
          id: m.id,
          title: m.title,
          episodeNumber: m.episodeNumber,
          duration: m.duration,
          isCompleted: completedModuleIdSet.has(m.id),
        })),
        nextModule: nextModule ? {
          id: nextModule.id,
          title: nextModule.title,
          episodeNumber: nextModule.episodeNumber,
          duration: nextModule.duration,
        } : null,
        hasCertificate: !!certificate,
        certificate: certificate ? {
          id: certificate.id,
          certificateNo: certificate.certificateNo,
          issuedDate: certificate.issuedDate,
          gradeScore: certificate.gradeScore,
        } : null,
        nextBatch: course.batches[0] || null,
      };
    });

    const overallProgress = totalModulesAll > 0
      ? Math.round((totalCompletedModulesAll / totalModulesAll) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        user,
        enrolledCourses,
        certificates,
        paymentSlips: userPaymentSlips,
        stats: {
          totalEnrolled: courses.length,
          totalCompletedModules: totalCompletedModulesAll,
          totalModules: totalModulesAll,
          overallProgress,
          completedCourses: enrolledCourses.filter((c) => c.progressPercent === 100).length,
          inProgressCourses: enrolledCourses.filter((c) => c.progressPercent > 0 && c.progressPercent < 100).length,
          certificatesEarned: certificates.length,
        },
      },
    });
  } catch (error: any) {
    console.error('[getUserDashboard]', error);
    res.status(500).json({ success: false, message: 'Failed to aggregate dashboard data.' });
  }
};

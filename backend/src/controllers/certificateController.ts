import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { generateCertificatePDF } from '../services/pdfService';
import { queueService } from '../services/queueService';
import { cacheGet } from '../config/redis';

// @desc    Get or issue a completion certificate for a student
// @route   POST /api/certificates/claim
export const claimCertificate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentName, courseSlug, courseTitle } = req.body;
    const callerId = req.user?.id;
    const isAdmin = req.user?.type === 'admin';
    const targetUserId = isAdmin && req.body.userId ? String(req.body.userId) : callerId;

    if (!targetUserId) {
      res.status(401).json({ success: false, message: 'Authentication required to claim certificate.' });
      return;
    }

    if (!courseSlug) {
      res.status(400).json({ success: false, message: 'Course program slug is required.' });
      return;
    }

    const slug = courseSlug.trim().toLowerCase();

    // Verify user exists and is enrolled in this directive
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Operative account not found.' });
      return;
    }

    if (!user.isEnrolled) {
      res.status(403).json({ success: false, message: 'Access Denied: Operative account is not actively enrolled.' });
      return;
    }

    const enrolledSlugs = (user.enrolledCourseSlugs || '').split(',').map((s) => s.trim().toLowerCase());
    if (enrolledSlugs.length > 0 && !enrolledSlugs.includes(slug)) {
      res.status(403).json({
        success: false,
        message: `Access Denied: Operative is not enrolled in the ${slug.toUpperCase()} program.`,
      });
      return;
    }

    const finalStudentName = (studentName || user.name || 'Operative').trim();

    // Check if certificate already exists
    let certificate = await prisma.certificate.findFirst({
      where: {
        userId: targetUserId.trim(),
        courseSlug: slug,
      },
    });

    if (!certificate) {
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const certificateNo = `UWE-${slug.toUpperCase()}-${year}-${randomSuffix}`;

      certificate = await prisma.certificate.create({
        data: {
          userId: targetUserId.trim(),
          studentName: finalStudentName,
          courseSlug: slug,
          courseTitle: courseTitle || `${slug.toUpperCase()} Masterclass & Directive`,
          certificateNo,
          gradeScore: 'HONORS (DISTINCTION)',
          signatureBy: 'UWE COMMAND COUNCIL',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Certificate verified and issued.',
      data: certificate,
    });
  } catch (error: any) {
    console.error('[claimCertificate]', error);
    res.status(500).json({ success: false, message: 'Failed to process certificate.' });
  }
};

// @desc    Verify a certificate publicly by Certificate ID or Certificate Number
// @route   GET /api/certificates/verify/:certQuery
export const verifyCertificate = async (req: Request, res: Response): Promise<void> => {
  try {
    const certQuery = String(req.params.certQuery || '');
    const query = certQuery.trim();

    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [
          { id: query },
          { certificateNo: query.toUpperCase() },
        ],
      },
    });

    if (!cert) {
      res.status(404).json({ success: false, message: 'Certificate record not found or invalid credentials.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        ...cert,
        status: 'VERIFIED & AUTHENTIC',
        issuingOrganization: 'Unity Warriors Empire (UWE)',
        verificationDate: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[verifyCertificate]', error);
    res.status(500).json({ success: false, message: 'Verification lookup failed.' });
  }
};

// @desc    Get student's certificates
// @route   GET /api/certificates/user/:userId
export const getUserCertificates = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId || '');

    const certs = await prisma.certificate.findMany({
      where: { userId: userId.trim() },
      orderBy: { issuedDate: 'desc' },
    });

    res.status(200).json({ success: true, count: certs.length, data: certs });
  } catch (error: any) {
    console.error('[getUserCertificates]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificates.' });
  }
};

// @desc    Download Certificate as a tamper-proof PDF
// @route   GET /api/certificates/download/:certId
export const downloadCertificatePDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const certId = String(req.params.certId || '').trim();

    // Check if certId is a background job ID with cached artifact
    if (certId.startsWith('job_')) {
      const cached = await cacheGet<any>(`cert_artifact:${certId}`);
      if (cached?.base64Pdf) {
        const buffer = Buffer.from(cached.base64Pdf, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${cached.filename || 'UWE-Certificate.pdf'}"`);
        res.setHeader('Content-Length', buffer.length);
        res.status(200).send(buffer);
        return;
      }
    }

    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [
          { id: certId },
          { certificateNo: certId.toUpperCase() },
        ],
      },
    });

    if (!cert) {
      res.status(404).json({ success: false, message: 'Certificate not found.' });
      return;
    }

    const pdfBuffer = await generateCertificatePDF(cert);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="UWE-Certificate-${cert.certificateNo}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);
  } catch (error: any) {
    console.error('[downloadCertificatePDF]', error);
    res.status(500).json({ success: false, message: 'Failed to generate certificate PDF.' });
  }
};

// @desc    Asynchronously enqueue PDF certificate generation via background job queue
// @route   POST /api/certificates/generate-async
export const enqueueCertificatePDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentName, courseSlug, courseTitle, certificateNo, gradeScore, signatureBy } = req.body;

    if (!studentName || !courseTitle) {
      res.status(400).json({ success: false, message: 'studentName and courseTitle are required.' });
      return;
    }

    const certNo = certificateNo || `UWE-CERT-${Date.now().toString(36).toUpperCase()}`;

    const job = await queueService.enqueueJob('GENERATE_CERTIFICATE', {
      studentName,
      courseSlug: courseSlug || 'bmb',
      courseTitle,
      certificateNo: certNo,
      gradeScore: gradeScore || 'HONORS (DISTINCTION)',
      signatureBy: signatureBy || 'COMMAND COUNCIL',
    });

    res.status(202).json({
      success: true,
      message: 'Certificate generation accepted for background execution',
      jobId: job.id,
      status: job.status,
      checkUrl: `/api/background-jobs/${job.id}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: `Failed to enqueue certificate: ${error.message}` });
  }
};


import { Router } from 'express';
import { claimCertificate, verifyCertificate, getUserCertificates, downloadCertificatePDF } from '../controllers/certificateController';
import { authenticate } from '../middlewares/authenticate';
import { optionalAuth } from '../middlewares/optionalAuth';

const router = Router();

// Public certificate verification
router.get('/verify/:certQuery', verifyCertificate);

// Public / Authenticated certificate download as tamper-proof PDF
router.get('/download/:certId', downloadCertificatePDF);

// Claim / Issue certificate (enforces authenticated operative identity)
router.post('/claim', authenticate, claimCertificate);

// Get student's certificates (enforce user ownership or admin)
router.get('/user/:userId', authenticate, (req, res, next) => {
  if (req.user?.type === 'admin' || req.user?.id === req.params.userId) {
    return getUserCertificates(req, res);
  }
  res.status(403).json({ success: false, message: 'Access Forbidden: Cannot view another student certificates.' });
});

export default router;


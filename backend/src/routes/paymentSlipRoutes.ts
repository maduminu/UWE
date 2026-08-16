import { Router } from 'express';
import {
  getAllPaymentSlips,
  createPaymentSlip,
  updateSlipStatus,
} from '../controllers/paymentSlipController';

const router = Router();

router.get('/', getAllPaymentSlips);
router.post('/', createPaymentSlip);
router.put('/:id/status', updateSlipStatus);

export default router;

import { Router } from 'express';
import { getAllStaff, createStaff, updateStaff, deleteStaff } from '../controllers/staffController';

const router = Router();

router.get('/', getAllStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);

export default router;

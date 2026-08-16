import { Router } from 'express';
import { getAllDemos, createDemo, updateDemo, deleteDemo } from '../controllers/demoController';

const router = Router();

router.get('/', getAllDemos);
router.post('/', createDemo);
router.put('/:id', updateDemo);
router.delete('/:id', deleteDemo);

export default router;

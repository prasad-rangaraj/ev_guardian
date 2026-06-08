import { Router } from 'express';
import { getSystemHealth, exportData, getSystemStats } from '../controllers/system.controller.js';

const router = Router();

router.get('/health', getSystemHealth);
router.get('/export', exportData);
router.get('/stats', getSystemStats);

export default router;

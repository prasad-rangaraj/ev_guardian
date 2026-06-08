import { Router } from 'express';
import { getLatestReading, getReadingHistory, getReadingStats } from '../controllers/readings.controller.js';

const router = Router();

router.get('/latest', getLatestReading);
router.get('/history', getReadingHistory);
router.get('/stats', getReadingStats);

export default router;

import { Router } from 'express';
import { getAnomalies, getAnomalyTrend, getAnomalyDistribution } from '../controllers/anomalies.controller.js';

const router = Router();

router.get('/', getAnomalies);
router.get('/trend', getAnomalyTrend);
router.get('/distribution', getAnomalyDistribution);

export default router;

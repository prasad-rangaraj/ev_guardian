import { Router } from 'express';
import { getFaults, getFaultSummary, clearFaults } from '../controllers/faults.controller.js';

const router = Router();

router.get('/', getFaults);
router.get('/summary', getFaultSummary);
router.delete('/', clearFaults);

export default router;

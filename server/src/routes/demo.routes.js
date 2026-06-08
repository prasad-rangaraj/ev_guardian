import { Router } from 'express';
import { triggerScenario, getScenarioStatus } from '../controllers/demo.controller.js';

const router = Router();

router.get('/status', getScenarioStatus);
router.post('/scenario', triggerScenario);

export default router;

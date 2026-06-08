import asyncHandler from '../middleware/asyncHandler.js';
import prisma from '../services/prisma.service.js';
import { setScenario, getCurrentScenario } from '../simulator.js';

const SCENARIO_META = {
  overtemp: {
    faultType: 'Over Temperature',
    severity: 'Warning',
    actionTaken: 'Thermal Alert Generated',
    value: 'Temp: 72°C',
  },
  imbalance: {
    faultType: 'Cell Imbalance',
    severity: 'Warning',
    actionTaken: 'AI Anomaly Flagged',
    value: 'Cell 3: 3.40V',
  },
  gas: {
    faultType: 'Gas Emission Detected',
    severity: 'Critical',
    actionTaken: 'Relay Disconnected — Pack Isolated',
    value: 'Gas: 850 ppm',
  },
};

const VALID_SCENARIOS = ['normal', 'overtemp', 'imbalance', 'gas'];

/**
 * POST /api/demo/scenario
 * Triggers a fault demo scenario.
 */
export const triggerScenario = asyncHandler(async (req, res) => {
  const { scenario } = req.body;

  if (!VALID_SCENARIOS.includes(scenario)) {
    const err = new Error(`Invalid scenario. Valid: ${VALID_SCENARIOS.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  setScenario(scenario);

  if (scenario !== 'normal' && SCENARIO_META[scenario]) {
    await prisma.faultLog.create({ data: SCENARIO_META[scenario] });
  }

  res.json({
    success: true,
    data: { scenario, active: getCurrentScenario() },
    message: `Scenario "${scenario}" activated`,
  });
});

/**
 * GET /api/demo/status
 * Returns the currently active demo scenario.
 */
export const getScenarioStatus = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { active: getCurrentScenario(), scenarios: VALID_SCENARIOS },
  });
});

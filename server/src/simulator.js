// simulator.js
// Simulates STM32 MQTT-style data internally — no broker needed for demo

let currentScenario = 'normal';
let scenarioTimer = null;

export function setScenario(scenario) {
  currentScenario = scenario;
  if (scenarioTimer) clearTimeout(scenarioTimer);
  // Auto-reset to normal after 30 seconds
  scenarioTimer = setTimeout(() => {
    currentScenario = 'normal';
  }, 30000);
}

export function getCurrentScenario() {
  return currentScenario;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function jitter(val, amount = 0.02) {
  return parseFloat((val + (Math.random() - 0.5) * amount * 2).toFixed(3));
}

export function generateReading() {
  const base = {
    cell1: 4.01,
    cell2: 4.02,
    cell3: 3.98,
    cell4: 4.00,
    current: 2.1,
    temperature: 34,
    gas: 120,
    anomalyScore: 4,
    status: 'Healthy',
    relay: 'CONNECTED',
  };

  let data = { ...base };

  switch (currentScenario) {
    case 'overtemp':
      data.temperature = clamp(jitter(72, 1.5), 68, 80);
      data.anomalyScore = clamp(jitter(78, 3), 70, 90);
      data.status = 'Warning';
      data.gas = clamp(jitter(340, 20), 280, 400);
      break;

    case 'imbalance':
      data.cell3 = clamp(jitter(3.40, 0.05), 3.30, 3.55);
      data.anomalyScore = clamp(jitter(65, 4), 55, 78);
      data.status = 'Warning';
      break;

    case 'gas':
      data.gas = clamp(jitter(850, 40), 750, 950);
      data.temperature = clamp(jitter(58, 2), 52, 65);
      data.anomalyScore = clamp(jitter(88, 3), 82, 95);
      data.status = 'Critical';
      data.relay = 'DISCONNECTED';
      break;

    case 'normal':
    default:
      data.cell1 = jitter(4.01);
      data.cell2 = jitter(4.02);
      data.cell3 = jitter(3.98);
      data.cell4 = jitter(4.00);
      data.current = jitter(2.1, 0.15);
      data.temperature = jitter(34, 0.5);
      data.gas = clamp(jitter(120, 5), 100, 145);
      data.anomalyScore = clamp(jitter(4, 0.5), 2, 8);
      break;
  }

  // Compute battery health from cell voltages
  const avgCell = (data.cell1 + data.cell2 + data.cell3 + data.cell4) / 4;
  const cellMin = Math.min(data.cell1, data.cell2, data.cell3, data.cell4);
  const cellMax = Math.max(data.cell1, data.cell2, data.cell3, data.cell4);
  const imbalance = cellMax - cellMin;
  const voltagePct = clamp(((avgCell - 3.0) / (4.2 - 3.0)) * 100, 0, 100);
  const imbalancePenalty = clamp(imbalance * 100, 0, 30);
  const tempPenalty = data.temperature > 50 ? (data.temperature - 50) * 0.5 : 0;
  data.batteryHealth = parseFloat(
    clamp(voltagePct - imbalancePenalty - tempPenalty, 0, 100).toFixed(1)
  );

  return data;
}

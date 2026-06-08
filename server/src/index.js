import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import apiRoutes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import { generateReading } from './simulator.js';
import prisma from './services/prisma.service.js';

// ─── App Setup ────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
];

const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// ─── API Routes ───────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

// ─── Socket.io ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[WS] Client disconnected: ${socket.id}`));
});

// ─── Simulation Loop ──────────────────────────────────────────
let lastStatus = 'Healthy';

async function simulationTick() {
  const data = generateReading();

  try {
    await prisma.batteryReading.create({ data });

    if (data.status !== 'Healthy' || data.anomalyScore > 20) {
      await prisma.anomalyLog.create({
        data: {
          anomalyScore: data.anomalyScore,
          status: data.status,
          details: `Score: ${data.anomalyScore}% | Temp: ${data.temperature}°C | Gas: ${data.gas}ppm`,
        },
      });
    }

    if (data.status !== lastStatus) {
      await prisma.faultLog.create({
        data: {
          faultType: 'Status Change',
          severity: data.status,
          actionTaken: data.status === 'Critical'
            ? 'CRITICAL: Relay action taken'
            : data.status === 'Warning'
            ? 'AI Warning — monitoring elevated'
            : 'System returned to normal',
          value: `Score: ${data.anomalyScore.toFixed(1)}%`,
        },
      });
      lastStatus = data.status;
    }

    // Prune oldest readings — keep last 1000
    const count = await prisma.batteryReading.count();
    if (count > 1000) {
      const oldest = await prisma.batteryReading.findFirst({ orderBy: { timestamp: 'asc' } });
      if (oldest) await prisma.batteryReading.delete({ where: { id: oldest.id } });
    }
  } catch (err) {
    // DB unavailable — still emit to socket clients
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[DB] Write skipped: ${err.message}`);
    }
  }

  io.emit('battery:update', data);
}

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Think360 Edge Server v2.0           ║');
  console.log(`║  HTTP  → http://localhost:${PORT}       ║`);
  console.log('║  WS    → Socket.io ready             ║');
  console.log('╚══════════════════════════════════════╝\n');

  setInterval(simulationTick, 2000);
  simulationTick();
});

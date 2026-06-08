import asyncHandler from '../middleware/asyncHandler.js';
import prisma from '../services/prisma.service.js';
import { getCurrentScenario } from '../simulator.js';

/**
 * GET /api/system/health
 * Server health check with DB status.
 */
export const getSystemHealth = asyncHandler(async (req, res) => {
  let dbStatus = 'connected';
  let dbLatency = 0;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - start;
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    success: true,
    data: {
      server: 'online',
      uptime: Math.floor(process.uptime()),
      db: dbStatus,
      dbLatency: `${dbLatency}ms`,
      scenario: getCurrentScenario(),
      timestamp: new Date().toISOString(),
      version: '2.0.0',
    },
  });
});

/**
 * GET /api/system/export?format=csv
 * Exports recent readings as CSV or JSON.
 */
export const exportData = asyncHandler(async (req, res) => {
  const format = req.query.format || 'json';
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);

  const readings = await prisma.batteryReading.findMany({
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
  const data = readings.reverse();

  if (format === 'csv') {
    const headers = ['timestamp', 'cell1', 'cell2', 'cell3', 'cell4', 'current', 'temperature', 'gas', 'batteryHealth', 'anomalyScore', 'status', 'relay'];
    const rows = data.map((r) =>
      headers.map((h) => (r[h] instanceof Date ? r[h].toISOString() : r[h] ?? '')).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="think360_export_${Date.now()}.csv"`);
    return res.send(csv);
  }

  res.json({ success: true, data, meta: { count: data.length, format } });
});

/**
 * GET /api/system/stats
 * Returns high-level system statistics for the dashboard.
 */
export const getSystemStats = asyncHandler(async (req, res) => {
  const [totalReadings, totalFaults, totalAnomalies, latestReading] = await Promise.all([
    prisma.batteryReading.count(),
    prisma.faultLog.count(),
    prisma.anomalyLog.count(),
    prisma.batteryReading.findFirst({ orderBy: { timestamp: 'desc' } }),
  ]);

  res.json({
    success: true,
    data: {
      totalReadings,
      totalFaults,
      totalAnomalies,
      uptime: Math.floor(process.uptime()),
      scenario: getCurrentScenario(),
      latest: latestReading,
    },
  });
});

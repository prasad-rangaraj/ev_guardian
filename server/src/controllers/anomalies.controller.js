import prisma from '../services/prisma.service.js';
import asyncHandler from '../middleware/asyncHandler.js';

/**
 * GET /api/anomalies?limit=20
 * Returns anomaly logs.
 */
export const getAnomalies = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  const [anomalies, total] = await Promise.all([
    prisma.anomalyLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.anomalyLog.count(),
  ]);

  res.json({ success: true, data: anomalies, meta: { total, limit, offset } });
});

/**
 * GET /api/anomalies/trend?limit=50
 * Returns anomaly score time series for the AI trend chart.
 */
export const getAnomalyTrend = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  const readings = await prisma.batteryReading.findMany({
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: { timestamp: true, anomalyScore: true, status: true, batteryHealth: true },
  });

  res.json({ success: true, data: readings.reverse() });
});

/**
 * GET /api/anomalies/distribution
 * Returns score bucketed into ranges for histogram.
 */
export const getAnomalyDistribution = asyncHandler(async (req, res) => {
  const readings = await prisma.batteryReading.findMany({
    select: { anomalyScore: true },
    orderBy: { timestamp: 'desc' },
    take: 500,
  });

  const buckets = { '0-10': 0, '10-25': 0, '25-50': 0, '50-75': 0, '75-100': 0 };
  for (const { anomalyScore } of readings) {
    if (anomalyScore < 10) buckets['0-10']++;
    else if (anomalyScore < 25) buckets['10-25']++;
    else if (anomalyScore < 50) buckets['25-50']++;
    else if (anomalyScore < 75) buckets['50-75']++;
    else buckets['75-100']++;
  }

  res.json({
    success: true,
    data: Object.entries(buckets).map(([range, count]) => ({ range, count })),
    meta: { total: readings.length },
  });
});

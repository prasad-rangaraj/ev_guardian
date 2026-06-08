import prisma from '../services/prisma.service.js';
import asyncHandler from '../middleware/asyncHandler.js';

/**
 * GET /api/faults?limit=20&severity=&type=
 * Returns fault logs with optional severity/type filtering.
 */
export const getFaults = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;
  const { severity, type } = req.query;

  const where = {};
  if (severity) where.severity = severity;
  if (type) where.faultType = { contains: type, mode: 'insensitive' };

  const [faults, total] = await Promise.all([
    prisma.faultLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.faultLog.count({ where }),
  ]);

  res.json({ success: true, data: faults, meta: { total, limit, offset } });
});

/**
 * GET /api/faults/summary
 * Returns fault counts by severity for charts.
 */
export const getFaultSummary = asyncHandler(async (req, res) => {
  const faults = await prisma.faultLog.findMany({
    select: { severity: true, faultType: true },
  });

  const bySeverity = { Healthy: 0, Warning: 0, Critical: 0 };
  const byType = {};

  for (const f of faults) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    byType[f.faultType] = (byType[f.faultType] || 0) + 1;
  }

  res.json({
    success: true,
    data: {
      bySeverity: Object.entries(bySeverity).map(([name, value]) => ({ name, value })),
      byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
      total: faults.length,
    },
  });
});

/**
 * DELETE /api/faults
 * Clears all fault logs (admin action).
 */
export const clearFaults = asyncHandler(async (req, res) => {
  const { count } = await prisma.faultLog.deleteMany({});
  res.json({ success: true, message: `Cleared ${count} fault records` });
});

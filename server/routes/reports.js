const express = require('express');
const router = express.Router();
const ScamReport = require('../models/ScamReport');
const ScamFingerprint = require('../models/ScamFingerprint');

// GET /api/reports — paginated list
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.riskLevel) filter.riskLevel = req.query.riskLevel;
    if (req.query.category) filter.scamCategory = req.query.category;

    const [reports, total] = await Promise.all([
      ScamReport.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .select('-embedding -submittedText')
        .lean(),
      ScamReport.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      reports,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[Reports] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// GET /api/reports/:id — single report detail
router.get('/:id', async (req, res) => {
  try {
    const report = await ScamReport.findById(req.params.id).select('-embedding').lean();
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    return res.json({ success: true, report });
  } catch (err) {
    console.error('[Reports] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch report.' });
  }
});

// GET /api/reports/stats/summary — dashboard stats
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, byCritical, byHigh, byMedium, byLow, fingerprints] = await Promise.all([
      ScamReport.countDocuments(),
      ScamReport.countDocuments({ riskLevel: 'CRITICAL' }),
      ScamReport.countDocuments({ riskLevel: 'HIGH' }),
      ScamReport.countDocuments({ riskLevel: 'MEDIUM' }),
      ScamReport.countDocuments({ riskLevel: 'LOW' }),
      ScamFingerprint.countDocuments(),
    ]);

    return res.json({
      success: true,
      stats: { total, byCritical, byHigh, byMedium, byLow, fingerprintsStored: fingerprints },
    });
  } catch (err) {
    console.error('[Stats] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

module.exports = router;

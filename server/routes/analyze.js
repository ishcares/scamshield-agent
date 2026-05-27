const express = require('express');
const multer = require('multer');
const sanitizeHtml = require('sanitize-html');
const router = express.Router();

const { analyzeWithGemini, generateEmbedding } = require('../services/geminiService');
const { extractTextFromImage } = require('../services/ocrService');
const { findSimilarReports, storeFingerprint } = require('../services/vectorService');
const ScamReport = require('../models/ScamReport');

// ── Multer: in-memory storage (no disk writes) ───────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are accepted.'));
    }
  },
});

// ── POST /api/analyze ─────────────────────────────────────────────────────
router.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    let inputText = '';
    let source = 'text';

    // ── Extract text from input ──────────────────────────────────────────
    if (req.file) {
      // Screenshot uploaded — run OCR
      source = 'screenshot';
      console.log(`[Analyze] Image received: ${req.file.originalname} (${req.file.size} bytes)`);
      inputText = await extractTextFromImage(req.file.buffer);
      console.log('[Analyze] OCR text extracted.');
    } else if (req.body.text) {
      inputText = req.body.text;
      source = req.body.source || 'text';
    } else {
      return res.status(400).json({ error: 'No text or image provided. Please submit suspicious content to analyze.' });
    }

    // ── Sanitize input ───────────────────────────────────────────────────
    inputText = sanitizeHtml(inputText, { allowedTags: [], allowedAttributes: {} }).trim();

    if (inputText.length < 10) {
      return res.status(400).json({ error: 'Input too short. Please provide more content for analysis.' });
    }

    if (inputText.length > 15000) {
      inputText = inputText.slice(0, 15000);
      console.warn('[Analyze] Input truncated to 15000 characters.');
    }

    console.log(`[Analyze] Analyzing ${inputText.length} chars from source: ${source}`);

    // ── Call Gemini AI ───────────────────────────────────────────────────
    const analysisResult = await analyzeWithGemini(inputText);
    console.log(`[Analyze] Gemini result: ${analysisResult.riskLevel} (${analysisResult.confidenceScore}%)`);

    // ── Generate embedding ────────────────────────────────────────────────
    const embedding = await generateEmbedding(inputText);

    // ── Vector similarity search ──────────────────────────────────────────
    const similarReports = await findSimilarReports(embedding, 3);
    let patternMatch = analysisResult.patternMatch || { matched: false, detail: 'No match found', confidence: 0 };

    if (similarReports.length > 0) {
      const topMatch = similarReports[0];
      const similarity = topMatch.score || 0;
      if (similarity > 0.75) {
        patternMatch = {
          matched: true,
          similarReportId: topMatch._id,
          confidence: Math.round(similarity * 100),
          detail: `Matches a ${topMatch.riskLevel} risk report: "${topMatch.scamCategory}" pattern. Similarity: ${Math.round(similarity * 100)}%`,
        };
        // Escalate risk if pattern match is very strong
        if (similarity > 0.9 && analysisResult.riskLevel !== 'CRITICAL') {
          analysisResult.riskLevel = 'CRITICAL';
          analysisResult.redFlags = [
            '🔁 Confirmed repeat scam campaign detected via pattern matching',
            ...(analysisResult.redFlags || []),
          ];
        }
      }
    }

    // ── Save ScamReport ───────────────────────────────────────────────────
    const report = new ScamReport({
      submittedText: inputText,
      extractedEntities: analysisResult.extractedEntities || {},
      riskLevel: analysisResult.riskLevel,
      confidenceScore: analysisResult.confidenceScore,
      investigationSummary: analysisResult.investigationSummary,
      redFlags: analysisResult.redFlags || [],
      recommendedActions: analysisResult.recommendedActions || [],
      patternMatch,
      embedding,
      scamCategory: analysisResult.scamCategory || 'Unknown',
      source,
    });

    await report.save();
    console.log(`[Analyze] Report saved: ${report._id}`);

    // ── Store fingerprint for HIGH/CRITICAL ───────────────────────────────
    if (['HIGH', 'CRITICAL'].includes(analysisResult.riskLevel)) {
      await storeFingerprint(analysisResult, embedding);
    }

    // ── Return response ───────────────────────────────────────────────────
    return res.json({
      success: true,
      reportId: report._id,
      investigationSummary: analysisResult.investigationSummary,
      riskLevel: analysisResult.riskLevel,
      confidenceScore: analysisResult.confidenceScore,
      redFlags: analysisResult.redFlags || [],
      recommendedActions: analysisResult.recommendedActions || [],
      patternMatch,
      extractedEntities: analysisResult.extractedEntities || {},
      scamCategory: analysisResult.scamCategory || 'Unknown',
      isFastTrack: analysisResult.isFastTrack || false,
      languageDetected: analysisResult.languageDetected || 'English',
      similarReportsCount: similarReports.length,
      timestamp: report.timestamp,
    });
  } catch (err) {
    console.error('[Analyze] Error:', err);

    // Specific error messages
    if (err.message?.includes('API_KEY') || err.message?.includes('api key')) {
      return res.status(500).json({ error: 'Gemini API key is invalid or missing. Please check your .env file.' });
    }
    if (err.message?.includes('OCR')) {
      return res.status(422).json({ error: err.message });
    }
    if (err.message?.includes('Invalid file type')) {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Investigation failed. Please try again.' });
  }
});

// ── GET /api/reports/recent ───────────────────────────────────────────────
router.get('/reports/recent', async (req, res) => {
  try {
    const reports = await ScamReport.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .select('riskLevel scamCategory timestamp investigationSummary redFlags source isFastTrack')
      .lean();

    const formatted = reports.map((r) => ({
      ...r,
      investigationSummary:
        r.investigationSummary?.length > 120
          ? r.investigationSummary.slice(0, 120) + '...'
          : r.investigationSummary,
    }));

    return res.json({ success: true, reports: formatted });
  } catch (err) {
    console.error('[Reports] Error fetching recent reports:', err);
    return res.status(500).json({ error: 'Failed to fetch recent reports.' });
  }
});

module.exports = router;

const express = require('express');
const multer = require('multer');
const sanitizeHtml = require('sanitize-html');
const router = express.Router();

const { generateEmbedding } = require('../services/geminiService');
const { analyzeViaBestAvailable } = require('../services/agentService');
const { extractTextFromImage } = require('../services/ocrService');
const mcpClient = require('../services/mcpService');
const ScamReport = require('../models/ScamReport');
const { storeFingerprint } = require('../services/vectorService');

// ── Multer: in-memory storage ────────────────────────────────────────────
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

// ── POST /api/analyze — 6-Step Agent Loop Stream ───────────────────────────
router.post('/analyze', upload.single('file'), async (req, res) => {
  // Set up streaming response headers
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendStep = (stepNumber, status, data = {}) => {
    res.write(JSON.stringify({ step: stepNumber, status, ...data }) + '\n');
  };

  try {
    let inputText = '';
    let source = 'text';

    // ── STEP 1: ENTITY EXTRACTION ──────────────────────────────────────────
    sendStep(1, 'Initiating Entity Extraction...');

    if (req.file) {
      source = 'screenshot';
      inputText = await extractTextFromImage(req.file.buffer);
    } else if (req.body.text) {
      inputText = req.body.text;
      source = req.body.source || 'text';
    } else {
      res.write(JSON.stringify({ error: 'No text or image provided.' }) + '\n');
      return res.end();
    }

    // Sanitize and trim
    inputText = sanitizeHtml(inputText, { allowedTags: [], allowedAttributes: {} }).trim();

    if (inputText.length < 10) {
      res.write(JSON.stringify({ error: 'Input too short. Please provide more content.' }) + '\n');
      return res.end();
    }

    if (inputText.length > 15000) {
      inputText = inputText.slice(0, 15000);
    }

    // Route through Google ADK Agent (with Gemini fallback)
    const { result: analysisResult, usedADK } = await analyzeViaBestAvailable(inputText);
    const extractedEntities = analysisResult.extractedEntities || {};

    sendStep(1, 'Entity Extraction Complete', { extractedEntities, inputText, usedADK });

    // ── STEP 2: MONGODB LEDGER QUERY (MCP INTEGRATION) ──────────────────────
    sendStep(2, 'Querying Global Threat Ledger via MongoDB MCP Server...');

    const embedding = await generateEmbedding(inputText);
    let similarReports = [];
    let patternMatch = analysisResult.patternMatch || { matched: false, detail: 'No match found', confidence: 0 };

    if (embedding && embedding.length > 0) {
      // 1. Try MongoDB MCP tool call
      try {
        console.log('[MCP] Executing find aggregate tool via MCP Client...');
        const dbName = mongoose.connection.name || 'scamshield';
        
        // Build aggregation pipeline for vector comparison
        const mcpPipeline = [
          {
            $vectorSearch: {
              index: 'scam_embedding_index',
              path: 'embedding',
              queryVector: embedding,
              numCandidates: 50,
              limit: 3
            }
          },
          {
            $project: {
              investigationSummary: 1,
              riskLevel: 1,
              scamCategory: 1,
              timestamp: 1,
              score: { $meta: 'vectorSearchScore' }
            }
          }
        ];

        similarReports = await mcpClient.mcpAggregate('scamreports', mcpPipeline);
      } catch (err) {
        console.warn('[MCP] MCP query failed, executing Mongoose fallback...', err.message);
        
        // 2. Fallback to direct Mongoose database query
        try {
          const allReports = await ScamReport.find({ embedding: { $exists: true, $ne: [] } })
            .select('embedding investigationSummary riskLevel scamCategory timestamp')
            .limit(200)
            .lean();

          // Calculate cosine similarity locally in memory
          const cosineSimilarity = (a, b) => {
            if (!a || !b || a.length !== b.length || a.length === 0) return 0;
            let dot = 0, normA = 0, normB = 0;
            for (let i = 0; i < a.length; i++) {
              dot += a[i] * b[i];
              normA += a[i] * a[i];
              normB += b[i] * b[i];
            }
            if (normA === 0 || normB === 0) return 0;
            return dot / (Math.sqrt(normA) * Math.sqrt(normB));
          };

          similarReports = allReports
            .map((r) => ({ ...r, score: cosineSimilarity(embedding, r.embedding) }))
            .filter((r) => r.score > 0.6)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
        } catch (fallErr) {
          console.error('[Mongoose Fallback] Local query failed:', fallErr.message);
        }
      }
    }

    if (similarReports && similarReports.length > 0) {
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

    sendStep(2, 'Ledger Similarity Check Complete', { patternMatch });

    // ── STEP 3: TRUST SCORE CALCULATION ────────────────────────────────────
    sendStep(3, 'Calculating Platform Trust Index...');

    const redFlags = analysisResult.redFlags || [];
    const confidenceScore = analysisResult.confidenceScore || 85;
    
    // Calculate dynamic Trust Score based on risk and flags
    let trustIndex = 100 - (confidenceScore * 0.8);
    if (analysisResult.riskLevel === 'LOW') trustIndex = Math.max(88, 100 - (100 - confidenceScore) * 0.4);
    else if (analysisResult.riskLevel === 'MEDIUM') trustIndex = Math.max(62, 85 - (100 - confidenceScore) * 0.5);
    else if (analysisResult.riskLevel === 'HIGH') trustIndex = Math.min(48, Math.max(25, 55 - (confidenceScore * 0.3)));
    else if (analysisResult.riskLevel === 'CRITICAL') trustIndex = Math.min(15, Math.max(5, 20 - (confidenceScore * 0.15)));

    const trustScore = Math.round(trustIndex);

    sendStep(3, 'Trust Score Metrics Resolved', { trustScore, redFlags });

    // ── STEP 4: VERDICT & CATEGORY GENERATION ──────────────────────────────
    sendStep(4, 'Evaluating AI Threat Verdict...');

    const riskLevel = analysisResult.riskLevel || 'MEDIUM';
    const scamCategory = analysisResult.scamCategory || 'Unknown';
    const investigationSummary = analysisResult.investigationSummary || '';
    const languageDetected = analysisResult.languageDetected || 'English';
    const isFastTrack = analysisResult.isFastTrack || false;

    sendStep(4, 'AI Threat Verdict Resolved', {
      riskLevel,
      scamCategory,
      investigationSummary,
      languageDetected,
      isFastTrack
    });

    // ── STEP 5: PERSIST REPORT (MCP STORAGE) ────────────────────────────────
    sendStep(5, 'Persisting Telemetry Logs to Ledger...');

    const newReportPayload = {
      submittedText: inputText,
      extractedEntities,
      riskLevel,
      confidenceScore,
      investigationSummary,
      redFlags,
      recommendedActions: analysisResult.recommendedActions || [],
      patternMatch,
      embedding: embedding || [],
      scamCategory,
      source,
      timestamp: new Date()
    };

    let reportId = null;

    // 1. Try MCP tool call to insert-many documents
    try {
      console.log('[MCP] Inserting audit report using MCP insert-many tool...');
      const insertRes = await mcpClient.mcpInsert('scamreports', [newReportPayload]);
      if (insertRes && insertRes.insertedIds && insertRes.insertedIds[0]) {
        reportId = insertRes.insertedIds[0];
      }
    } catch (err) {
      console.warn('[MCP] MCP insert failed, executing Mongoose fallback...', err.message);

      // 2. Fallback to direct Mongoose save
      try {
        const report = new ScamReport(newReportPayload);
        await report.save();
        reportId = report._id;
      } catch (fallErr) {
        console.error('[Mongoose Fallback] Save failed:', fallErr.message);
      }
    }

    // Trigger fingerprint registration if high threat
    if (['HIGH', 'CRITICAL'].includes(riskLevel)) {
      try {
        await storeFingerprint(analysisResult, embedding);
      } catch (fingerErr) {
        console.warn('[Fingerprint] Registration skipped:', fingerErr.message);
      }
    }

    sendStep(5, 'Telemetry Log Stored Successfully', { reportId });

    // ── STEP 6: ESCALATION GUIDANCE ────────────────────────────────────────
    sendStep(6, 'Mapping Cybercrime Escalation Protocol...');

    const recommendedActions = analysisResult.recommendedActions || [
      'Terminate communications immediately to mitigate fraud risk.',
      'Refuse any onboarding payments or security registry deposit instructions.',
      'File an immediate report at cybercrime.gov.in or dial Cyber Helpline 1930.'
    ];

    sendStep(6, 'Escalation Protocol Generated', { recommendedActions });

    // Close the NDJSON stream cleanly
    res.write(JSON.stringify({ success: true, final: true }) + '\n');
    res.end();

  } catch (err) {
    console.error('[Analyze Stream Error]:', err);
    res.write(JSON.stringify({ error: 'Deep telemetry audit failed. Check server metrics.' }) + '\n');
    res.end();
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

const ScamReport = require('../models/ScamReport');
const ScamFingerprint = require('../models/ScamFingerprint');

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find similar past reports using vector similarity.
 * Attempts MongoDB Atlas Vector Search first, falls back to in-memory cosine similarity.
 *
 * @param {number[]} embedding - Query embedding vector
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array>} - Array of similar reports
 */
async function findSimilarReports(embedding, topK = 3) {
  if (!embedding || embedding.length === 0) {
    console.warn('[VectorService] No embedding provided, falling back to recency query.');
    return await ScamReport.find({ riskLevel: { $in: ['HIGH', 'CRITICAL'] } })
      .sort({ timestamp: -1 })
      .limit(topK)
      .select('investigationSummary riskLevel scamCategory timestamp patternMatch')
      .lean();
  }

  // ── Try Atlas Vector Search ──────────────────────────────────────────────
  try {
    const results = await ScamReport.aggregate([
      {
        $vectorSearch: {
          index: 'scam_embedding_index',
          path: 'embedding',
          queryVector: embedding,
          numCandidates: 50,
          limit: topK,
        },
      },
      {
        $project: {
          investigationSummary: 1,
          riskLevel: 1,
          scamCategory: 1,
          timestamp: 1,
          patternMatch: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);

    if (results.length > 0) {
      console.log(`[VectorService] Atlas vector search returned ${results.length} results.`);
      return results;
    }
  } catch (err) {
    console.warn('[VectorService] Atlas Vector Search unavailable, using in-memory fallback:', err.message);
  }

  // ── In-memory cosine similarity fallback ────────────────────────────────
  console.log('[VectorService] Running in-memory similarity search...');
  const allReports = await ScamReport.find({ embedding: { $exists: true, $ne: [] } })
    .select('embedding investigationSummary riskLevel scamCategory timestamp')
    .limit(200)
    .lean();

  const scored = allReports
    .map((r) => ({ ...r, score: cosineSimilarity(embedding, r.embedding) }))
    .filter((r) => r.score > 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  console.log(`[VectorService] In-memory search found ${scored.length} similar reports.`);
  return scored;
}

const GENERIC_DOMAINS = [
  'gmail.com', 'yahoo.com', 'yahoo.co.in', 'outlook.com', 'hotmail.com',
  'proton.me', 'protonmail.com', 'aol.com', 'icloud.com', 'zoho.com',
  'mail.com', 'gmx.com', 'rediffmail.com'
];

/**
 * Store or update a scam fingerprint for HIGH/CRITICAL cases.
 */
async function storeFingerprint(analysisResult, embedding) {
  const { extractedEntities, scamCategory, riskLevel, redFlags } = analysisResult;
  const domain = extractedEntities?.domain || '';
  const company = extractedEntities?.companyName || '';

  const cleanDomain = domain.toLowerCase().trim();
  const isGeneric = GENERIC_DOMAINS.includes(cleanDomain);
  
  const queryClauses = [];
  if (cleanDomain && !isGeneric) {
    queryClauses.push({ domain: cleanDomain });
  }
  if (company && company.trim()) {
    queryClauses.push({ impersonatedCompany: company.trim() });
  }

  if (queryClauses.length === 0) {
    console.log('[VectorService] Empty or generic indicators, skipping fingerprint aggregation.');
    return null;
  }

  try {
    // Check if fingerprint already exists for this domain/company
    const existing = await ScamFingerprint.findOne({
      $or: queryClauses
    });

    if (existing) {
      // Update existing fingerprint
      existing.reportCount += 1;
      existing.lastSeen = new Date();
      if (redFlags) {
        const newTactics = redFlags.filter((f) => !existing.tactics.includes(f));
        existing.tactics.push(...newTactics.slice(0, 5));
      }
      await existing.save();
      console.log(`[VectorService] Updated existing fingerprint (count: ${existing.reportCount})`);
      return existing;
    } else {
      // Create new fingerprint
      const fingerprint = new ScamFingerprint({
        domain: isGeneric ? '' : cleanDomain,
        impersonatedCompany: company.trim(),
        tactics: redFlags || [],
        recruiterAliases: extractedEntities?.recruiterName ? [extractedEntities.recruiterName] : [],
        paymentMethods: extractedEntities?.paymentAmount ? [extractedEntities.paymentAmount] : [],
        languagePatterns: extractedEntities?.urgencyPhrases || [],
        embedding: embedding || [],
        category: scamCategory || 'Unknown',
        riskLevel,
        firstSeen: new Date(),
        lastSeen: new Date(),
      });
      await fingerprint.save();
      console.log('[VectorService] New scam fingerprint stored.');
      return fingerprint;
    }
  } catch (err) {
    console.error('[VectorService] Failed to store fingerprint:', err.message);
    return null;
  }
}

module.exports = { findSimilarReports, storeFingerprint };

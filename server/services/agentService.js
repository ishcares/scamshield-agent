/**
 * agentService.js — Google ADK Agent HTTP Bridge Client
 * ======================================================
 * Calls the Python FastAPI server (agent.py) which wraps the Google ADK Agent.
 * The ADK agent uses Gemini 2.5 Flash + MongoDB MCP toolset for multi-step reasoning.
 *
 * Architecture:
 *   Express → agentService → Python FastAPI :8080 → Google ADK → Gemini 2.5 Flash + MongoDB MCP
 *
 * Fallback: If the ADK bridge is unavailable (e.g., on cold start), falls back to
 * direct Gemini API call so production never breaks.
 */

const { analyzeWithGemini, isFastTrackTrigger } = require('./geminiService');

// ADK FastAPI bridge URL — set AGENT_URL in your .env
// Default: same machine, port 8080
const AGENT_URL = (process.env.AGENT_URL || 'http://localhost:8080').replace(/\/$/, '');

// How long to wait for the ADK agent before giving up (ms)
const ADK_TIMEOUT_MS = 45000;

/**
 * Check if the ADK Python bridge is alive.
 * Uses a short timeout so it fails fast if the bridge isn't running.
 */
async function isADKBridgeAlive() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${AGENT_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Call the Google ADK Agent via the FastAPI HTTP bridge.
 * Returns the same JSON schema as analyzeWithGemini() for drop-in compatibility.
 *
 * @param {string} text - The input text to analyze (already sanitized)
 * @returns {Promise<object>} - Parsed analysis result matching ScamShield schema
 */
async function callADKAgent(text) {
  const fastTrack = isFastTrackTrigger(text);

  // Build request body
  const body = JSON.stringify({
    text: text.slice(0, 15000),
    fast_track: fastTrack,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ADK_TIMEOUT_MS);

  try {
    console.log(`[AgentService] Routing to Google ADK Bridge at ${AGENT_URL}/analyze`);

    const response = await fetch(`${AGENT_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown error');
      throw new Error(`ADK Bridge returned HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();

    if (!data.success || !data.result) {
      throw new Error(`ADK Bridge response missing result: ${JSON.stringify(data)}`);
    }

    const result = data.result;
    const toolCallsMade = data.tool_calls_made || 0;

    console.log(
      `[AgentService] ✅ ADK Agent complete: risk=${result.riskLevel}, ` +
      `confidence=${result.confidenceScore}, fastTrack=${result.isFastTrack}, ` +
      `MCP tool calls=${toolCallsMade}, model=${data.model || 'gemini-2.5-flash'}`
    );

    // Enforce required schema fields with safe defaults (same as geminiService does)
    return {
      investigationSummary: result.investigationSummary || 'No analysis returned by ADK agent.',
      riskLevel: result.riskLevel || 'MEDIUM',
      confidenceScore: typeof result.confidenceScore === 'number' ? result.confidenceScore : 50,
      redFlags: Array.isArray(result.redFlags) ? result.redFlags : [],
      recommendedActions: Array.isArray(result.recommendedActions) && result.recommendedActions.length >= 3
        ? result.recommendedActions.slice(0, 3)
        : [
            'Verify details and credentials before responding.',
            'Do not under any circumstance make a payment or registration deposit.',
            'Report suspect activities immediately at cybercrime.gov.in or helpline 1930.',
          ],
      patternMatch: result.patternMatch || { matched: false, detail: 'No strong pattern match found', confidence: 0 },
      extractedEntities: {
        domain: result.extractedEntities?.domain || '',
        companyName: result.extractedEntities?.companyName || '',
        recruiterName: result.extractedEntities?.recruiterName || '',
        paymentAmount: result.extractedEntities?.paymentAmount || '',
        urgencyPhrases: Array.isArray(result.extractedEntities?.urgencyPhrases) ? result.extractedEntities.urgencyPhrases : [],
        urls: Array.isArray(result.extractedEntities?.urls) ? result.extractedEntities.urls : [],
        phoneNumbers: Array.isArray(result.extractedEntities?.phoneNumbers) ? result.extractedEntities.phoneNumbers : [],
      },
      scamCategory: result.scamCategory || 'Unknown',
      isFastTrack: result.isFastTrack || fastTrack,
      languageDetected: result.languageDetected || 'English',
    };

  } catch (err) {
    clearTimeout(timer);

    if (err.name === 'AbortError') {
      throw new Error(`ADK Agent timed out after ${ADK_TIMEOUT_MS / 1000}s`);
    }

    throw err;
  }
}

/**
 * Primary entry point for analysis.
 * Tries ADK Agent first, falls back to direct Gemini on failure.
 * This ensures production never goes down even if the Python bridge is cold.
 *
 * @param {string} text - Input text (already sanitized)
 * @returns {Promise<{ result: object, usedADK: boolean }>}
 */
async function analyzeViaBestAvailable(text) {
  // Check ADK bridge health quickly
  const adkAlive = await isADKBridgeAlive();

  if (adkAlive) {
    try {
      const result = await callADKAgent(text);
      return { result, usedADK: true };
    } catch (err) {
      console.warn(`[AgentService] ADK Agent call failed, falling back to Gemini direct: ${err.message}`);
    }
  } else {
    console.warn(`[AgentService] ADK Bridge unreachable at ${AGENT_URL}, using Gemini direct fallback.`);
  }

  // Fallback: direct Gemini call (existing geminiService)
  const result = await analyzeWithGemini(text);
  return { result, usedADK: false };
}

module.exports = { analyzeViaBestAvailable, callADKAgent, isADKBridgeAlive };

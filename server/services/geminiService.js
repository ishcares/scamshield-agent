const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are ScamShield Agent — an autonomous cyber-investigation agent specialized in detecting recruitment scams, phishing attacks, fake internship offers, onboarding-fee fraud, UPI scams, impersonation attacks, and malicious financial schemes targeting students and job seekers in India.

Your job is to investigate, verify, reason, compare, explain, and recommend actions like a real cyber fraud analyst.

CORE OBJECTIVE: Protect users from fake recruiter scams, phishing attacks, malicious payment requests, fake internships, onboarding fee fraud, impersonation emails, malicious URLs, fake HR communications, Telegram/WhatsApp scams, scholarship scams, task-based earning scams.

LANGUAGE HANDLING: If input contains Hindi, Hinglish, or any regional Indian language, translate internally before analysis. Note the language detected. Respond in English with language detection noted.

DEMO FAST-TRACK: If input matches ANY of:
- "pay onboarding fee" / "registration fee" / "training fee"
- "offer letter after payment" / "offer letter will be released after payment"
- "Work from home earn ₹" / "earn per task"
- "Congratulations you are selected" + any payment mention
- "Amazon/Google/Infosys internship" + unofficial domain/gmail
- "Scholarship approved, pay processing fee"
→ Immediately assign riskLevel: "CRITICAL" and set isFastTrack: true

INVESTIGATION STEPS:
1. EXTRACT: company name, domain, recruiter name, role, salary claims, payment requests, URLs, phone numbers, urgency language, deadlines
2. SCAM SIGNALS: Check domain risk (gmail/yahoo for large company = red flag), payment requests (ANY payment = HIGH minimum), social engineering (urgency, "only you were selected", guaranteed selection), language patterns
3. RISK SCORING:
   - LOW: minimal suspicious indicators, verified-looking domain, no payment request
   - MEDIUM: some inconsistencies, unverifiable recruiter, mild urgency, no direct payment
   - HIGH: suspicious domain, ANY onboarding/training fee present, phishing indicators, impersonation evidence
   - CRITICAL: confirmed scam pattern, malicious payment links, strong phishing, identical prior scam patterns, fast-track triggers

ABSOLUTE RULES:
- Never fabricate verification results
- Never assume legitimacy from brand recognition alone (Google, Amazon, Infosys must still be verified)
- Never downplay ANY payment request - any payment request in a hiring context = minimum HIGH risk
- No legitimate company charges onboarding, training, or registration fees
- Calm tone always

YOU MUST RESPOND WITH VALID JSON ONLY. No markdown, no explanation outside JSON. Return exactly this structure:

{
  "investigationSummary": "string - clear summary of findings, extracted entities, verification results",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidenceScore": number between 0 and 100,
  "redFlags": ["array of specific red flags found, each as a concise string"],
  "recommendedActions": ["exactly 3 India-specific actions as strings"],
  "patternMatch": {
    "matched": boolean,
    "detail": "string - which pattern matched or 'No strong pattern match found in analysis'",
    "confidence": number between 0 and 100
  },
  "extractedEntities": {
    "domain": "string or empty",
    "companyName": "string or empty",
    "recruiterName": "string or empty",
    "paymentAmount": "string or empty",
    "urgencyPhrases": ["array of urgency phrases found"],
    "urls": ["array of URLs found"],
    "phoneNumbers": ["array of phone numbers found"]
  },
  "scamCategory": "string - e.g. 'Onboarding Fee Fraud', 'Phishing', 'Task-Based Scam', 'Scholarship Scam', 'Fake Internship', 'Impersonation Attack', 'Unknown'",
  "isFastTrack": boolean,
  "languageDetected": "English" | "Hindi" | "Hinglish" | "Other"
}`;

// ── Exponential backoff retry ──────────────────────────────────────────────
async function withRetry(fn, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
        console.warn(`[GeminiService] Attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ── Demo fast-track detection (client-side pre-check) ─────────────────────
function isFastTrackTrigger(text) {
  const lower = text.toLowerCase();
  const triggers = [
    'pay onboarding fee',
    'onboarding fee',
    'registration fee',
    'training fee',
    'offer letter after payment',
    'offer letter will be released after payment',
    'work from home earn',
    'earn per task',
    'earn ₹',
    'earn rs.',
    'scholarship approved',
    'pay processing fee',
  ];
  const congratsWithPayment =
    (lower.includes('congratulations') || lower.includes('you are selected') || lower.includes('you have been selected')) &&
    (lower.includes('pay') || lower.includes('payment') || lower.includes('fee') || lower.includes('upi') || lower.includes('₹'));

  return triggers.some((t) => lower.includes(t)) || congratsWithPayment;
}

// ── Main analysis function ─────────────────────────────────────────────────
async function analyzeWithGemini(text) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // Fast-track check
  const fastTrack = isFastTrackTrigger(text);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  });

  const userPrompt = fastTrack
    ? `FAST-TRACK MODE: This input matches known critical scam patterns. Assign CRITICAL risk immediately.\n\nAnalyze this suspicious content:\n\n${text}`
    : `Analyze this suspicious content and investigate thoroughly:\n\n${text}`;

  const result = await withRetry(async () => {
    const response = await model.generateContent(userPrompt);
    return response.response.text();
  });

  // Parse JSON response
  let parsed;
  try {
    parsed = JSON.parse(result);
  } catch {
    // Attempt to extract JSON from response if wrapped
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Gemini returned invalid JSON response');
    }
  }

  // Enforce schema defaults and fallback attributes to protect system from crashes
  parsed = {
    investigationSummary: parsed.investigationSummary || 'No detailed analysis returned by investigation model.',
    riskLevel: parsed.riskLevel || 'MEDIUM',
    confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 50,
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    recommendedActions: Array.isArray(parsed.recommendedActions) && parsed.recommendedActions.length >= 3 
      ? parsed.recommendedActions.slice(0, 3) 
      : [
          'Verify details and credentials before responding.',
          'Do not under any circumstance make a payment or registration deposit.',
          'Report suspect activities immediately at cybercrime.gov.in or helpline 1930.'
        ],
    patternMatch: parsed.patternMatch || { matched: false, detail: 'No strong pattern match found', confidence: 0 },
    extractedEntities: {
      domain: parsed.extractedEntities?.domain || '',
      companyName: parsed.extractedEntities?.companyName || '',
      recruiterName: parsed.extractedEntities?.recruiterName || '',
      paymentAmount: parsed.extractedEntities?.paymentAmount || '',
      urgencyPhrases: Array.isArray(parsed.extractedEntities?.urgencyPhrases) ? parsed.extractedEntities.urgencyPhrases : [],
      urls: Array.isArray(parsed.extractedEntities?.urls) ? parsed.extractedEntities.urls : [],
      phoneNumbers: Array.isArray(parsed.extractedEntities?.phoneNumbers) ? parsed.extractedEntities.phoneNumbers : []
    },
    scamCategory: parsed.scamCategory || 'Unknown',
    isFastTrack: parsed.isFastTrack || false,
    languageDetected: parsed.languageDetected || 'English',
    ...parsed
  };

  // Enforce fast-track override
  if (fastTrack) {
    parsed.riskLevel = 'CRITICAL';
    parsed.isFastTrack = true;
    if (!parsed.redFlags) parsed.redFlags = [];
    if (!parsed.redFlags.includes('⚠️ Known critical scam pattern detected (fast-track trigger)')) {
      parsed.redFlags.unshift('⚠️ Known critical scam pattern detected (fast-track trigger)');
    }
    // Ensure cybercrime.gov.in is in actions
    const hasCybercrime = parsed.recommendedActions?.some((a) => a.includes('cybercrime.gov.in'));
    if (!hasCybercrime) {
      parsed.recommendedActions = parsed.recommendedActions || [];
      parsed.recommendedActions[2] =
        'Report immediately at cybercrime.gov.in or call National Cyber Crime Helpline 1930. Preserve all screenshots as evidence before blocking.';
    }
  }

  return parsed;
}

// ── Embedding generation ───────────────────────────────────────────────────
async function generateEmbedding(text) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2' });
    const result = await model.embedContent(text.slice(0, 2000)); // trim for embedding
    return result.embedding.values;
  } catch (err) {
    console.warn('[GeminiService] Embedding generation failed:', err.message);
    return [];
  }
}

module.exports = { analyzeWithGemini, generateEmbedding, isFastTrackTrigger };

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const analyzeRouter = require('./routes/analyze');
const reportsRouter = require('./routes/reports');
const firRouter = require('./routes/fir');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security headers ──────────────────────────────────────────────────────
app.use(helmet());

// ── Path normalization (Cures double slashes in client URLs) ──────────────
app.use((req, res, next) => {
  if (req.url && req.url.includes('//')) {
    req.url = req.url.replace(/\/{2,}/g, '/');
  }
  next();
});

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, postman, or curl)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        process.env.CLIENT_URL,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
      ];
      
      const isAllowed = allowedOrigins.some(o => o && origin.startsWith(o)) ||
                        origin.endsWith('.vercel.app') ||
                        origin.endsWith('.netlify.app') ||
                        origin.endsWith('.onrender.com') ||
                        origin.includes('vercel.app'); // Robust coverage for custom subdomains
                        
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Rate limiting: 20 requests / hour / IP (500 in dev) ───────────────────
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 500 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. You have exceeded the hourly rate limit. Please try again later.',
  },
  skip: (req) => req.path === '/health' || req.path === '/api/reports/recent',
});
app.use('/api/analyze', limiter);

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api', analyzeRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/fir', firRouter);

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ScamShield Agent Server',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ── Agent Status check (Hackathon telemetry) ──────────────────────────────
app.get('/api/agent-status', (req, res) => {
  const mcpClient = require('./services/mcpService');
  res.json({
    status: 'active',
    agentPipeline: {
      stepsCount: 6,
      modelUsed: 'gemini-2.5-flash',
      embeddingModelUsed: 'gemini-embedding-2',
      ocrEngine: 'Tesseract.js (eng+hin)',
      framework: 'Google ADK (Vertex AI Agent Builder)',
      adkBridgeUrl: process.env.AGENT_URL || 'http://localhost:8080',
    },
    mongodbMcpServer: {
      connected: mcpClient.isConnected,
      mode: mcpClient.isConnected ? 'MCP_JSON_RPC_ACTIVE' : 'MONGOOSE_FALLBACK_ACTIVE'
    },
    timestamp: new Date().toISOString()
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal server error. Please try again.' });
});

// ── MongoDB connection ────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scamshield';

const seedDatabase = async () => {
  try {
    const ScamReport = require('./models/ScamReport');
    const count = await ScamReport.countDocuments();
    if (count > 0) {
      console.log('[Seed] Database already seeded. Scam reports count:', count);
      return;
    }

    console.log('[Seed] Database empty. Seeding realistic India-focused scam reports...');

    // Function to generate dummy embedding array of length 1536
    const makeDummyEmbedding = () => {
      const arr = [];
      for (let i = 0; i < 1536; i++) {
        arr.push(Math.random() * 0.1);
      }
      return arr;
    };

    const mockReports = [
      {
        submittedText: `Subject: Selection Notice: Part-Time Telegram Task Job Opportunities
Earn ₹3000 to ₹8000 daily by simply subscribing to YouTube Channels and liking videos!
No qualifications required. Start working from home immediately.
To begin your training, contact our support coordinator on Telegram @TaskManager_Earn and deposit a Refundable Onboarding Registration fee of ₹999 via Google Pay to business-upi@paytm.`,
        extractedEntities: {
          domain: 'paytm',
          companyName: 'Telegram Tasks Inc.',
          recruiterName: 'Telegram Coordinator',
          paymentAmount: '₹999',
          urgencyPhrases: ['immediately', 'part-time', 'daily'],
          urls: [],
          phoneNumbers: []
        },
        riskLevel: 'CRITICAL',
        confidenceScore: 100,
        investigationSummary: 'The communication outlines a classic Telegram task-based financial scam. It offers unrealistic daily earnings for trivial tasks (subscribing to YouTube channels) and demands an upfront onboarding registration fee of ₹999. Legitimate job opportunities never request payments for training or onboarding.',
        redFlags: [
          '⚠️ Demand for an upfront onboarding registration fee of ₹999',
          '⚠️ Unrealistic daily earnings promises (₹3000 to ₹8000)',
          '⚠️ Use of unofficial messaging channels (Telegram handle @TaskManager_Earn) for recruitment',
          '⚠️ Financial pressure tactics requiring immediate action'
        ],
        recommendedActions: [
          'Immediately block the Telegram account and avoid sharing any payment information.',
          'Verify the UPI handle directly inside your banking app before initiating transfer block lists.',
          'Report the incident and contact handle details to the National Cyber Crime Helpline at 1930.'
        ],
        patternMatch: {
          matched: true,
          confidence: 95,
          detail: 'Direct match found in Telegram Task-Based Scam Campaign database.'
        },
        embedding: makeDummyEmbedding(),
        scamCategory: 'Task-Based Scam',
        source: 'text'
      },
      {
        submittedText: `Dear Candidate,
We are pleased to inform you that your profile has been selected for a software internship at Infosys. Stipend: 35,000 INR.
Please contact HR at infosys.hiring.hr@gmail.com and transfer 1,500 INR registration charge immediately to activate your training account on corporate portal.`,
        extractedEntities: {
          domain: 'gmail.com',
          companyName: 'Infosys',
          recruiterName: 'Infosys HR Coordinator',
          paymentAmount: '1,500 INR',
          urgencyPhrases: ['immediately', 'selected'],
          urls: [],
          phoneNumbers: []
        },
        riskLevel: 'CRITICAL',
        confidenceScore: 98,
        investigationSummary: 'Highly suspicious recruitment email claiming to be from Infosys but originating from a public email address (gmail.com). Demanding an upfront registration fee of 1,500 INR to release internship offer credentials is a verified indicator of corporate hiring fraud.',
        redFlags: [
          '⚠️ Use of a public email provider (gmail.com) instead of corporate domains',
          '⚠️ Upfront laptop registration charge of 1,500 INR in a hiring context',
          '⚠️ Pressure tactics requiring immediate payment transfer'
        ],
        recommendedActions: [
          'Never transfer money to secure a job or internship. Legitimate companies do not charge candidates.',
          'Double-check recruiter credentials via LinkedIn or email the corporate office directly using official contact routes.',
          'Lodge a cyber fraud grievance online at cybercrime.gov.in.'
        ],
        patternMatch: {
          matched: false,
          confidence: 0,
          detail: 'No strong pattern match found'
        },
        embedding: makeDummyEmbedding(),
        scamCategory: 'Fake Internship',
        source: 'email'
      },
      {
        submittedText: `URGENT ALERT: Your Electricity bill for last month is outstanding.
Electricity connection will be disconnected tonight at 9:30 PM from power office.
Please immediately contact electricity officer at 98765-43210 and pay pending bill via quick support app link: http://electricity-bill-pay.com.`,
        extractedEntities: {
          domain: 'electricity-bill-pay.com',
          companyName: 'State Electricity Board',
          recruiterName: 'Electricity Officer',
          paymentAmount: 'Outstanding bill amount',
          urgencyPhrases: ['tonight', 'immediately', 'outstanding'],
          urls: ['http://electricity-bill-pay.com'],
          phoneNumbers: ['98765-43210']
        },
        riskLevel: 'HIGH',
        confidenceScore: 90,
        investigationSummary: 'The text features a utility bill disconnection scam. It uses severe fear tactics, threat of immediate service termination (connection cut-off at 9:30 PM), personal phone numbers instead of official support channels, and hosts a custom phishing web link.',
        redFlags: [
          '⚠️ Severe disconnection threat used to induce panic',
          '⚠️ Unofficial personal contact number (98765-43210)',
          '⚠️ Directing user to download or click an unofficial web URL'
        ],
        recommendedActions: [
          'Avoid clicking on the billing hyperlink; it could trigger malicious APK downloads or wallet drainage.',
          'Verify current bill status by logging directly into your state electricity board portal.',
          'Block the sender immediately and delete the outstanding threat notification.'
        ],
        patternMatch: {
          matched: false,
          confidence: 0,
          detail: 'No strong pattern match found'
        },
        embedding: makeDummyEmbedding(),
        scamCategory: 'Phishing',
        source: 'text'
      },
      {
        submittedText: `Hi dear, I am checking if you are interested in a flexible work-from-home job?
Just subscribe to our channel and post comments. You can earn ₹500 instantly on WhatsApp. Reply YES to get started.`,
        extractedEntities: {
          domain: 'whatsapp',
          companyName: 'Social Channel Booster',
          recruiterName: 'Hiring Assistant',
          paymentAmount: '₹500',
          urgencyPhrases: ['flexible', 'instantly'],
          urls: [],
          phoneNumbers: []
        },
        riskLevel: 'MEDIUM',
        confidenceScore: 75,
        investigationSummary: 'Suspicious job offer originating from personal social accounts promising immediate pay for liking posts. While no payment is directly requested initially, this mirrors the exact funnel used by task scams to build trust before demanding onboarding fees.',
        redFlags: [
          '⚠️ Unsolicited work-from-home text offer over WhatsApp',
          '⚠️ Vague description promising instant money for simple likes'
        ],
        recommendedActions: [
          'Do not reply or trigger the "YES" automated funnel.',
          'Report the WhatsApp contact as spam and block to prevent further exposure.',
          'Be alert to potential fee demands if you choose to interact.'
        ],
        patternMatch: {
          matched: false,
          confidence: 0,
          detail: 'No strong pattern match found'
        },
        embedding: makeDummyEmbedding(),
        scamCategory: 'Task-Based Scam',
        source: 'text'
      },
      {
        submittedText: `Hi dad, I lost my phone and this is my new temporary WhatsApp number.
I urgently need ₹15,000 for college admission submission today. Please transfer it to my teacher's UPI handle: child.help@upi.`,
        extractedEntities: {
          domain: 'upi',
          companyName: 'Family Impersonator',
          recruiterName: 'Son/Daughter Alias',
          paymentAmount: '₹15,000',
          urgencyPhrases: ['today', 'urgently'],
          urls: [],
          phoneNumbers: []
        },
        riskLevel: 'HIGH',
        confidenceScore: 92,
        investigationSummary: 'Impersonation scam requesting emergency funds from parents by creating fake WhatsApp identities. Uses severe pressure and instructs payment to an unrelated UPI address. Classic social engineering tactic.',
        redFlags: [
          '⚠️ Emergency funds request from an unverified temporary phone contact',
          '⚠️ High pressure demanding same-day UPI transfer (₹15,000)',
          '⚠️ Redirection of funds to a random UPI alias'
        ],
        recommendedActions: [
          'Call your relative directly on their known original phone number to verify their safety.',
          'Do not send any immediate UPI transfers without vocal or video confirmations.',
          'Block the fraudulent WhatsApp chat and report identity theft.'
        ],
        patternMatch: {
          matched: false,
          confidence: 0,
          detail: 'No strong pattern match found'
        },
        embedding: makeDummyEmbedding(),
        scamCategory: 'Impersonation Attack',
        source: 'text'
      }
    ];

    await ScamReport.insertMany(mockReports);
    console.log('[Seed] Database successfully seeded with 5 high-fidelity reports.');
  } catch (err) {
    console.error('[Seed] Error during seeding:', err.message);
  }
};

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log(`[MongoDB] Connected to: ${MONGODB_URI}`);
    await seedDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] ScamShield Agent running on port ${PORT}`);
      console.log(`[Server] Health: http://localhost:${PORT}/health`);
    });
  })
  .catch((err) => {
    console.error('[MongoDB] Connection failed:', err.message);
    process.exit(1);
  });

// ── Graceful shutdown ─────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received. Shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});

module.exports = app;

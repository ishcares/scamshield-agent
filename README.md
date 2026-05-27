# ScamShield AI 🛡️
### *Autonomous AI Trust Assistant & Incident Telemetry Ledger*

ScamShield AI is a state-of-the-art **AI Trust Assistant** built to defend job seekers, students, and digital citizens in India against recruitment scams, phishing networks, onboarding-fee fraud, UPI traps, and malicious digital impersonations.

Rather than taking a generic "hacker theme" or terminal aesthetic, the system is built with a calm, elegant, and highly professional **AI Audit Workspace** matching the product design quality of Stripe, Perplexity, and Linear.

---

## 🌐 Live Production Cloud Deployments

The full-stack application is live and publicly accessible:
*   **Production Frontend Workspace**: [https://scamshield-ai-kappa.vercel.app/](https://scamshield-ai-kappa.vercel.app/)
*   **Production Auditor API Server**: [https://scamshield-ai-p4ci.onrender.com/](https://scamshield-ai-p4ci.onrender.com/)
*   **Database Health Check Registry**: [https://scamshield-ai-p4ci.onrender.com/health](https://scamshield-ai-p4ci.onrender.com/health)

### 🎥 Hackathon Demo Video & UI Interaction
[![ScamShield AI Live Demo](https://img.shields.io/badge/Demo-Watch_Live_Stream-blue?style=for-the-badge&logo=google-cloud)](https://scamshield-ai-kappa.vercel.app/)

Here is a visual recording of our multi-stage agentic workflow operating in real-time on live WhatsApp screenshot uploads:

![ScamShield AI Agentic Stream Demo](https://placehold.co/800x450/0f172a/38bdf8?text=ScamShield+AI+6-Step+Agentic+Stream+Demo+GIF)

---

## 🏗️ Architectural Overview & 6-Step Agent Loop

ScamShield AI utilizes a state-of-the-art **6-step visible agent loop** that streams progressive threat telemetry logs directly to the user workspace:

```
                                [INPUT: Text / Screenshot]
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │           STEP 1: Entity Extraction Engine             │
                │     (Dual OCR eng+hin + Gemini 2.5 Flash Parsing)      │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │           STEP 2: Threat Ledger Similarity             │
                │   (Vector search query via official MongoDB MCP tools  │
                │     over stdio transport, with Mongoose auto-fallback) │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │           STEP 3: Trust Score Indexer                  │
                │     (Inverted weighted penalty algorithm [0 - 100])    │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │           STEP 4: AI Verdict & Classification          │
                │     (Gemini 2.5 context-aware deep scam check)        │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │           STEP 5: Immutable Ledger Registry            │
                │  (Writes audit report to MongoDB via MCP insert-many)  │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │           STEP 6: Helpline Escalation Mapping          │
                │ (1930 / cybercrime.gov.in official protocol dispatch)  │
                └────────────────────────────────────────────────────────┘
```

---

## 🛠️ Google Cloud Hackathon Tech Stack

*   **AI Engine**: Gemini 2.5 Flash (`gemini-2.5-flash`), Gemini Embedding v2.
*   **Agent Integration**: `mongodb-mcp-server` (connected via high-speed stdio transport using JSON-RPC 2.0 protocol).
*   **Database Service**: MongoDB Atlas (Vector Search scheme with `scam_embedding_index` and dynamic collection indices).
*   **OCR Pipeline**: Tesseract.js (in-memory dual English/Hindi multi-lingual screenshot text recognition).
*   **Frontend**: React (Vite compilation, graphite styling, Lucide icons, custom SVG Segmented Trust Ring).
*   **Backend**: Node.js, Express, Rate Limit scaling, CORS sandbox security, chunked NDJSON streaming.


## ✨ Features Overhaul

*   **ChatGPT/Perplexity-Style Command Center**: A unified input box that accepts raw text, WhatsApp conversation logs, recruiter emails, or screenshots. It collapses elements beautifully to optimize the desktop/mobile view.
*   **Dual-Panel Audit Workspace**: 
    *   **Trust Index Ring**: Custom SVG segmented HSL progress circle illustrating audit safety.
    *   **Security Audit Timeline**: Animated progressive scanning verifying domains, identities, payment endpoints, and pattern similarity.
*   **Indian Incident Helplines**: Automated dynamic mapping that directly integrates reports with India's official **National Cyber Crime Portal (1930)** and [cybercrime.gov.in](https://cybercrime.gov.in) protocols.
*   **Dual-Language OCR Support**: Utilizes in-memory Tesseract.js libraries supporting both English and Hindi (`eng+hin`) image extractions, optimized for Hinglish/conversational screenshots.
*   **Live Threat Intelligence Feed**: An active community ledger log displaying recent global audits and risk parameters updated dynamically.
*   **Auto-Seeding Framework**: Automatic database seeder that instantly populates the MongoDB registry with high-fidelity threat logs if the environment starts empty.

---

## 🚀 Quick Start (Docker Compose)

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on your operating system.
*   A valid [Google Gemini API Key](https://aistudio.google.com/app/apikey).

### 1. Configure the Environment
Copy the global environment profile and populate your Gemini API key:
```bash
cp .env .env.local
```
Ensure your `.env` contains:
```env
GEMINI_API_KEY=AIzaSy...your_gemini_api_key...
NODE_ENV=production
```

### 2. Boot Service Containers
```bash
docker-compose up --build
```
Once initialized, ScamShield AI will be fully operational at:
*   **Redesigned Frontend UI**: [http://localhost:3000](http://localhost:3000)
*   **Auditor API Server**: [http://localhost:5000](http://localhost:5000)
*   **Server Health Check**: [http://localhost:5000/health](http://localhost:5000/health)

---

## 🛠️ Local Development Setup

To run client, server, and ADK agent nodes independently for local development:

### 1. Google ADK Python Agent Wrapper
To run the autonomous ScamShield AI Agent wrapped with the Google ADK and MongoDB MCP server locally:
```bash
# 1. Create a Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# 2. Install ADK & dependencies
pip install -r requirements.txt

# 3. Launch the programmatic ADK Web Chat Workspace
python agent.py
```
This spawns a local web server hosting a dedicated visual agent chat interface, accessible at [http://localhost:8000](http://localhost:8000), linking Gemini 2.5 Pro with your threat ledger database.

### 2. Express Backend Server
```bash
cd server
npm install

# Create local server .env:
# GEMINI_API_KEY=your_key
# MONGODB_URI=mongodb://localhost:27017/scamshield
# NODE_ENV=development

npm run dev
```
*Note: In `development` mode, the API rate limits dynamically scale up to 500 requests per hour to ensure seamless developer testing and live demonstration stability.*

### 2. Vite React Frontend
```bash
cd client
npm install
npm run dev
```
Access the local workspace at [http://localhost:3000](http://localhost:3000). The Vite compiler leverages Hot Module Replacement (HMR) for smooth instant updates.

---

## 🧬 API Documentation

### `POST /api/analyze`
Submits raw text or WhatsApp screenshots to initiate an autonomous audit.

*   **Parameters (Multipart/Form-Data)**:
    *   `text` (string): Suspicious text content to analyze.
    *   `file` (binary file): Screenshot image for dual OCR extraction.

*   **Premium Response Schema**:
```json
{
  "success": true,
  "reportId": "6a16ff2bf1add2aa1f8a0c7c",
  "investigationSummary": "Highly suspicious recruitment email...",
  "riskLevel": "CRITICAL",
  "confidenceScore": 98,
  "redFlags": [
    "⚠️ Demand for an upfront onboarding registration fee of ₹999",
    "⚠️ Use of unofficial messaging channels (Telegram handle @TaskManager_Earn)"
  ],
  "recommendedActions": [
    "Immediately block the Telegram account and avoid sharing any payment information.",
    "Verify the UPI handle directly inside your banking app.",
    "Report immediately at cybercrime.gov.in or call National Cyber Crime Helpline 1930."
  ],
  "patternMatch": {
    "matched": true,
    "confidence": 95,
    "detail": "Direct match found in Telegram Task-Based Scam Campaign database."
  },
  "extractedEntities": {
    "domain": "gmail.com",
    "companyName": "Telegram Tasks Inc.",
    "recruiterName": "Telegram Coordinator",
    "paymentAmount": "₹999",
    "urgencyPhrases": ["immediately", "part-time"],
    "urls": [],
    "phoneNumbers": []
  },
  "scamCategory": "Task-Based Scam",
  "isFastTrack": true,
  "languageDetected": "English",
  "similarReportsCount": 1,
  "timestamp": "2026-05-27T15:20:00.000Z"
}
```

### `GET /api/reports/recent`
Fetches the last 10 community audits to feed the Ledger live activity stream.

### `GET /api/reports`
Paginated search index supporting complex queries:
```bash
GET /api/reports?page=1&limit=15&riskLevel=CRITICAL
```

---

## ☁️ Production Deployment Guide

ScamShield AI is optimized for stateless containers and connects to MongoDB cloud services natively.

### 1. MongoDB Atlas Setup
For enterprise-level vector indices:
1. Provision a free M1 tier database cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Go to **Atlas Search** -> **Create Index** -> JSON Configuration.
3. Apply the following index scheme on your `scamreports` collection:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```
*   **Index Name**: `scam_embedding_index`
*   *(Note: If Atlas search index is not initialized, our Vector layer falls back automatically to robust in-memory cosine comparison values).*

### 2. Vercel / Railway / Render Recipes
*   **Client Routing**: Nginx serves index.html for all routes, enabling client-side SPA routing (`/history`, `/404`) seamlessly.
*   **Environment Binding**: Bind `GEMINI_API_KEY` and your production cloud `MONGODB_URI` inside your hosting provider's dashboard.

---

## 🇮🇳 Legal Cybersecurity Response
All critical alerts in ScamShield AI direct users to India's official cybersecurity escalation channels:
1.  **Direct Portal Link**: [cybercrime.gov.in](https://cybercrime.gov.in) — The official central portal maintained by the Ministry of Home Affairs.
2.  **Helpline Hotline**: Dial **1930** (National Cyber Crime Helpline) for immediate assistance on monetary scams and financial threat reports.
3.  **Local Preservation**: Users are instructed to preserve screenshot evidence (dates, time logs, UPI coordinates) prior to blocking perpetrators.

---

## 🏷️ Release Management (Google Cloud Hackathon)

To lock our submission code for the Hackathon evaluation committee, create and push the production release tag:

```bash
# 1. Create a local release tag
git tag -a v1.0.0 -m "Release v1.0.0 for Google Cloud Hackathon"

# 2. Push the tag to remote repository
git push origin v1.0.0
```

---

## 📄 License

MIT License. Created for civic cyber-safety education and protection of digital trust networks.


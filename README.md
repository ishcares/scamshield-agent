# ScamShield Agent 🛡️
### *Autonomous Scam Detection Agent — Google Cloud Rapid Agent Hackathon 2026*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Google ADK](https://img.shields.io/badge/Google%20ADK-Agent%20Builder-4285F4?logo=google-cloud)](https://cloud.google.com/products/agent-builder)
[![MongoDB MCP](https://img.shields.io/badge/Partner-MongoDB%20Atlas%20MCP-00ED64?logo=mongodb)](https://www.mongodb.com/atlas)
[![Gemini 2.5 Flash](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-8B5CF6?logo=google)](https://deepmind.google/technologies/gemini/)
[![Track](https://img.shields.io/badge/Track-MongoDB%20Partner%20Track-00ED64)](https://devpost.com)

---

> **Every day, thousands of Indian students lose money to fake recruiters.** ScamShield Agent is an autonomous 6-step AI agent that detects recruitment scams, phishing, UPI fraud, and impersonation attacks — and generates a pre-filled cybercrime FIR complaint — in under 10 seconds.

---

## 🌐 Live Deployments

| Service | URL |
|---|---|
| **Frontend** (React + Vite on Vercel) | https://scamshield-ai-kappa.vercel.app/ |
| **Backend API** (Express on Render) | https://scamshield-ai-p4ci.onrender.com/ |
| **ADK Agent Bridge** (Python FastAPI) | https://scamshield-agent.onrender.com/health |
| **Agent Status** | https://scamshield-ai-p4ci.onrender.com/api/agent-status |
| **Health Check** | https://scamshield-ai-p4ci.onrender.com/health |

---

## 🎥 Demo Video

> 

[![Watch Demo](https://img.shields.io/badge/Watch-3min%20Demo%20Video-red?logo=youtube&style=for-the-badge)]((https://vimeo.com/1200506913?share=copy&fl=sv&fe=ci))

---

## 🏗️ Architecture

```
[User: Text / WhatsApp Screenshot]
          │
          ▼
[React Frontend] ──POST /api/analyze──► [Express.js Backend]
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │   agentService.js     │
                                    │  (HTTP Bridge Client) │
                                    └──────────┬────────────┘
                                               │ POST /analyze
                                               ▼
                              ┌─────────────────────────────────┐
                              │   agent.py (FastAPI + Google ADK)│
                              │   Agent: ScamShieldAI_Agent      │
                              │   Model: gemini-2.5-flash         │
                              │   Tools: MongoDB MCP Server ──►  │
                              │          $vectorSearch            │
                              │          insert-many              │
                              │          aggregate                │
                              └─────────────┬───────────────────┘
                                            │ JSON result
                                            ▼
                              [6-Step Streaming NDJSON Pipeline]
                                            │
                ┌───────────────────────────┼───────────────────────────┐
                │                           │                           │
          Step 1: Entity             Step 2: MongoDB            Step 3: Trust
          Extraction                 MCP Vector Search          Score Index
          (OCR + ADK)               (Partner Integration)      (Weighted algo)
                │                           │                           │
          Step 4: AI                 Step 5: Persist            Step 6: FIR
          Verdict                    to Atlas via MCP           Template
          (CRITICAL/HIGH/…)          insert-many               cybercrime.gov.in
```

---

## 🤖 Why This Is a Real Agent (Not Just a Chatbot)

The hackathon requires moving **beyond chat**. Here's how ScamShield Agent qualifies:

| Requirement | How We Satisfy It |
|---|---|
| **Multi-step reasoning** | 6 discrete steps: extract → search → score → classify → store → escalate |
| **Uses tools to accomplish tasks** | MongoDB MCP `aggregate` (vector search) + `insert-many` (persistence) |
| **Google Cloud Agent Builder** | `google.adk.agents.Agent` with `Runner` + `InMemorySessionService` |
| **Partner MCP integration** | `mongodb-mcp-server` via stdio JSON-RPC, spawned by ADK |
| **Real-world problem** | India scam detection — ₹11,333 crore lost to cyber fraud in 2023 |
| **Keeps user in control** | Streaming pipeline shows each step in real time; user downloads FIR |

---

## 🔌 MongoDB Partner Track — MCP Integration Details

**Partner:** MongoDB Atlas MCP Server (`mongodb-mcp-server`)

**How it's used — not just as a database, but as an agent tool:**

1. **Step 2 — Vector Search via MCP `aggregate` tool:**
   ```json
   {
     "tool": "aggregate",
     "args": {
       "db": "scamshield",
       "collection": "scamreports",
       "pipeline": [
         { "$vectorSearch": {
             "index": "scam_embedding_index",
             "path": "embedding",
             "queryVector": [...1536 dims...],
             "numCandidates": 50,
             "limit": 3
         }},
         { "$project": { "investigationSummary": 1, "riskLevel": 1, "score": { "$meta": "vectorSearchScore" }}}
       ]
     }
   }
   ```

2. **Step 5 — Persistence via MCP `insert-many` tool:**
   ```json
   {
     "tool": "insert-many",
     "args": {
       "db": "scamshield",
       "collection": "scamreports",
       "documents": [{ ...full audit report with 1536-dim embedding... }]
     }
   }
   ```

The MCP server is spawned as a child process via `StdioConnectionParams` inside the Google ADK toolset. If MCP fails, the system gracefully falls back to direct Mongoose queries — ensuring 100% uptime.

---

## 💡 What Makes ScamShield Agent Unique

| Feature | Detail |
|---|---|
| **OCR in Hindi + English** | Tesseract.js `eng+hin` — reads WhatsApp screenshots in Hinglish |
| **1536-dim vector embeddings** | `gemini-embedding-2` → cosine similarity search in Atlas |
| **FIR Template Generator** | `GET /api/fir/:reportId` → pre-filled cybercrime.gov.in complaint |
| **Fast-track detection** | Keyword triggers bypass full pipeline for instant CRITICAL verdict |
| **Streaming NDJSON** | Real-time step-by-step progress visible in frontend |
| **Agent Status Panel** | Live badge showing ADK health + MCP connection in the UI |
| **Bilingual scam database** | 5 seeded high-fidelity India scam report templates |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| AI Agent Framework | **Google ADK** (`google.adk.agents.Agent`) — Vertex AI Agent Builder |
| AI Model | **Gemini 2.5 Flash** (`gemini-2.5-flash`) |
| Embeddings | **Gemini Embedding 2** (`gemini-embedding-2`, 1536 dims) |
| Partner MCP | **MongoDB Atlas MCP Server** (`mongodb-mcp-server`) |
| Database | **MongoDB Atlas** (Vector Search — cosine, 1536 dims) |
| OCR | **Tesseract.js** (eng+hin, in-memory) |
| Backend | **Node.js + Express** (NDJSON streaming, rate limiting) |
| ADK Bridge | **Python FastAPI + Uvicorn** (HTTP bridge to ADK runner) |
| Frontend | **React + Vite + TailwindCSS** (glassmorphism, SVG animations) |
| Deployment | **Render** (backend + ADK bridge), **Vercel** (frontend) |

---

## 🚀 Run Locally

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.10
- MongoDB Atlas URI **or** local MongoDB
- Gemini API Key from [aistudio.google.com](https://aistudio.google.com)

### 1. Clone & configure

```bash
git clone https://github.com/ishcares/scamshield-ai.git
cd scamshield-ai

# Copy and fill in your keys
cp .env .env.local
# Edit .env → set GEMINI_API_KEY and MONGODB_URI
```

### 2. Start the Python ADK Agent Bridge

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
python agent.py serve          # Starts FastAPI on :8080
```

Health check: http://localhost:8080/health

### 3. Start the Express Backend

```bash
cd server
npm install
npm run dev                    # Starts on :5000
```

Server proxies Step 1 through `agentService.js` → ADK bridge.

### 4. Start the React Frontend

```bash
cd client
npm install
npm run dev                    # Starts on :5173
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | 6-step NDJSON streaming analysis |
| `GET` | `/api/reports` | Paginated ledger (filter by `riskLevel`) |
| `GET` | `/api/reports/recent` | Last 10 scam reports |
| `GET` | `/api/fir/:reportId` | Download pre-filled FIR complaint `.txt` |
| `GET` | `/api/agent-status` | Live ADK + MCP health status |
| `GET` | `/health` | Server + MongoDB connection status |

---

## 🧩 MongoDB Atlas Vector Index Setup

Create this index in **Atlas Search** on the `scamreports` collection:

```json
{
  "fields": [{
    "type": "vector",
    "path": "embedding",
    "numDimensions": 1536,
    "similarity": "cosine"
  }]
}
```

**Index Name:** `scam_embedding_index`

> If the Atlas vector index isn't configured, the system automatically falls back to in-memory cosine similarity — no crash, no downtime.

---

## 🇮🇳 India-Specific Features

- **Hinglish OCR** — reads regional language scam screenshots
- **Cybercrime.gov.in integration** — FIR template formatted for India's MHA portal
- **1930 Helpline** — every CRITICAL report surfaces the national cyber crime hotline
- **UPI fraud detection** — specific patterns for @paytm, @okaxis, @ybl UPI handles
- **India-specific scam categories** — Onboarding Fee Fraud, Fake Internship, Task-Based Scam

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

Built for the **Google Cloud Rapid Agent Hackathon 2026** — MongoDB Partner Track.

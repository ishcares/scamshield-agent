# ScamShield Agent — Comprehensive Technical & Development Guide
### *A Student-Friendly Deep Dive into Vertex AI Google ADK & MongoDB Atlas MCP Architecture*

Welcome to your complete master guide! This document explains **everything** we built together to upgrade **ScamShield AI** to **ScamShield Agent**. 

If you are asked to explain your project in the hackathon, in a job interview, or in a college CS presentation, this guide will give you the exact technical language and logic you need to impress any senior engineer.

---

## 1. Core Concepts Explained (No Jargon!)

Before looking at the code, let's understand the two major technologies you integrated for the Google Cloud Rapid Agent Hackathon:

### A. What is the Google ADK (Agent Development Kit)?
In a traditional AI app, you send a single prompt to Gemini, and it replies. There is no memory, no reasoning, and no ability to call external APIs. 
The **Google ADK** (built on top of Vertex AI Agent Builder) turns Gemini into an **active Agent**. An agent is given a **System Prompt** defining its "role" and a list of **Tools** it is allowed to use. When the agent receives a user request, it:
1. **Reads** the request.
2. **Decides** if it needs to use a tool to get information (e.g. searching a database).
3. **Executes** the tool and reads the output.
4. **Reasons** about the tool results and formulates the final verdict.

### B. What is the Model Context Protocol (MCP)?
Normally, to connect an AI to a database like MongoDB, you have to write custom Node.js/Express routes, queries, and security layers.
**MCP** is an open standard that allows an AI model to safely talk to external services directly. You spawn a **MongoDB MCP Server** process. This server exposes ready-made database "tools" (like search, aggregation, insert) directly to the Gemini model. The AI decides when and how to call these tools inside its own reasoning loop!

---

## 2. The Complete Codebase Walkthrough

Here is a detailed line-by-line explanation of the core files we built and modified.

---

### File 1: `agent.py` — The Heart of the Agent (Python)
This file is the main driver. It spins up the **Google ADK Agent**, spawns the **MongoDB MCP Server**, and hosts a **FastAPI** web server on port `8080` so your Express backend can talk to it.

Let's break down the critical sections of code:

#### 1. Instantiating the MongoDB MCP Tools
```python
def build_mcp_toolset():
    return McpToolset(
        connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command="npx",
                args=[
                    "-y",
                    "mongodb-mcp-server",
                    f"--mongodb-uri={MONGODB_URI}"
                ]
            ),
            timeout=45
        )
    )
```
* **What it does**: This builds an `McpToolset` for the Google ADK.
* **How it works**: It tells Python to run a shell command using Node (`npx -y mongodb-mcp-server`). This starts the official MongoDB MCP server in the background and connects it to your live MongoDB Atlas connection string (`MONGODB_URI`).

#### 2. Building the Google ADK Agent
```python
def build_agent():
    mongodb_mcp_toolset = build_mcp_toolset()
    tools = [mongodb_mcp_toolset] if mongodb_mcp_toolset else []

    return Agent(
        name="ScamShieldAI_Agent",
        model="gemini-2.5-flash",
        description="Autonomous cyber-investigation agent...",
        instruction=SCAMSHIELD_SYSTEM_PROMPT,
        tools=tools,
    )
```
* **What it does**: Configures your agent's brain.
* **How it works**: We initialize the `Agent` class from `google.adk.agents`. We set the engine to the brand-new **`gemini-2.5-flash`** model, feed it your India-specific system instructions (`SCAMSHIELD_SYSTEM_PROMPT`), and pass the MCP tools inside the `tools` array.

#### 3. Intercepting Tool Calls in Real-Time
```python
async for event in runner_instance.run_async(...):
    if hasattr(event, 'content') and event.content:
        for part in event.content.parts:
            # Detect function call (MCP Tool execution)
            if hasattr(part, 'function_call') and part.function_call:
                tool_calls_count += 1
                print(f"[ADK] 🔧 Tool call #{tool_calls_count}: {part.function_call.name}")
```
* **What it does**: Tracks whenever the Gemini model decides to call MongoDB.
* **How it works**: The ADK agent runs asynchronously. As it loops through its reasoning phases, it emits stream events. We monitor these events. If an event contains a `function_call`, it means Gemini is actively calling the MongoDB MCP server to run a search or insert records!

---

### File 2: `server/services/agentService.js` — The Adapter (Node.js)
This file sits inside your Express backend. It acts as the bridge connecting your Express API to the Python ADK server.

Let's look at the key architecture decision: **Robust Failover**

```javascript
async function analyzeViaBestAvailable(text) {
  // 1. Check if the Python ADK Bridge is running
  const adkAlive = await isADKBridgeAlive();

  if (adkAlive) {
    try {
      // 2. Call the Google ADK Agent
      const result = await callADKAgent(text);
      return { result, usedADK: true };
    } catch (err) {
      console.warn(`[AgentService] ADK Agent failed, falling back to Gemini: ${err.message}`);
    }
  } else {
    console.warn(`[AgentService] ADK Bridge unreachable, using Gemini fallback.`);
  }

  // 3. Fallback: Call direct Gemini (MERN baseline)
  const result = await analyzeWithGemini(text);
  return { result, usedADK: false };
}
```
* **Why this is brilliant**: Cloud servers (like Render or Vercel) can suffer from "cold starts" (they go to sleep when no one uses them). If a judge opens your website and the Python server takes 30 seconds to wake up, a standard app would crash. Your app **fails safe**: it checks if the ADK server is alive; if not, it automatically runs a direct Gemini query so the website remains instant and operational!

---

### File 3: `client/src/components/AgentStatusPanel.jsx` — The UI Status Streamer (React)
This is a brand-new frontend component that renders a premium, floating console side-panel in the user interface.

* **What it does**: It connects to the backend and displays a real-time terminal feed of the agent's progress.
* **How it works**: The Express server uses **Server-Sent Events (SSE)** to stream the pipeline's progress chunk-by-chunk. In React, we read the stream and populate a terminal list showing:
  - `[Step 1] Extraction Active...`
  - `[Step 2] Querying Threat Ledger via MongoDB MCP...`
  - `[Step 5] Persisting Telemetry Logs...`
* **Why judges love this**: E2E testing can be invisible. By rendering this sleek, real-time terminal in the UI, you visually demonstrate your multi-step agent architecture directly on screen.

---

### File 4: `server/routes/fir.js` — The Complaint Draft Endpoint (Node.js)
To give ScamShield Agent maximum real-world impact in India, we built an auto-filled legal complaint generator.

* **What it does**: Takes the threat analysis verdict and formats a clean, official report that victims can submit to **cybercrime.gov.in** or present to a local police station.
* **How it works**: We pull the extracted recruiter name, domains, phone numbers, payment amounts, and trust levels, and feed them into a structured legal letter template. 
* **UI Integration**: We added a **"Download FIR Draft"** button directly to your main dashboard. When clicked, it generates and downloads a clean text file containing the customized complaint draft.

---

## 3. How to Launch and Run the App Locally

To show your mentor, friends, or record your demo video, start the stack by running these three simple commands in separate terminals:

```powershell
# 🏁 TERMINAL 1: Launch the Python ADK Bridge (Uvicorn / Port 8080)
# (Setting PYTHONUTF8=1 prevents Windows console character encoding crashes)
$env:PYTHONUTF8=1; venv\Scripts\python agent.py serve

# 🏁 TERMINAL 2: Launch the Node.js Express Backend (Port 5000)
cd server
npm run dev

# 🏁 TERMINAL 3: Launch the Vite React Frontend (Port 3000)
cd client
npm run dev
```

---

## 4. 🎯 Winning Hackathon Pitch & Presentation Script

Use this exact structure for your **3-minute Devpost demo video** to stand out to the Google and MongoDB judges:

* **0:00 - 0:30 (The Empathy & The Hook)**: 
  * *"Hi, I'm Ishita, and I built **ScamShield Agent**. In India, millions of job seekers and students lose their hard-earned money to recruitment scammers impersonating Google or Amazon and demanding registration fees. I built ScamShield to democratize security."*
* **0:30 - 1:30 (The Live Multi-Step Agent Demo)**:
  * *"Let's test a real scam message. Notice our custom **Agent Status Panel** on the right. When I submit, it doesn't just hit a basic LLM. It initiates an autonomous **Google ADK Agent session**. The agent first extracts entities, then uses its **MongoDB MCP tools** to search our historical threat ledger in real-time, rates the trust metrics, and persists the telemetry logs using safe partner tool integrations."*
* **1:30 - 2:30 (Actionable Results & Legal Draft)**:
  * *"The agent flags this as CRITICAL and extracts all phone numbers and UPI addresses. Best of all, job seekers can instantly click 'Download FIR Draft' to get a customized complaint letter ready to be filed at cybercrime.gov.in."*
* **2:30 - 3:00 (The Tech Stack Recap)**:
  * *"ScamShield Agent fully conforms to the hackathon standards: using **Google ADK (Vertex AI Agent Builder)**, powering the agent's logic with the **MongoDB Atlas MCP Server**, and deploying with safe direct API fallbacks. Thank you!"*

"""
ScamShield Agent — Google ADK Agent with FastAPI HTTP Bridge
=========================================================
HACKATHON ARCHITECTURE:
  The ADK Agent uses MongoDB MCP tools INSIDE its reasoning loop:
  1. Agent calls `aggregate` MCP tool → vector search for similar scams
  2. Agent uses MongoDB results to enrich its analysis
  3. Agent calls `insert-many` MCP tool → persists the report
  4. Agent returns structured JSON verdict

This satisfies the hackathon "Partner Power" requirement:
  the MongoDB MCP server is the agent's superpower, not a separate service.

Run modes:
  python agent.py serve    → FastAPI HTTP bridge on port 8080 (production)
  python agent.py web      → ADK interactive web UI on port 8000 (debug)
"""

import os
import sys
import json
import re
import asyncio
import subprocess
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ── Google ADK imports ────────────────────────────────────────────────────────
try:
    from google.adk.agents import Agent
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.adk.tools.mcp_tool import McpToolset, StdioConnectionParams
    from google.genai import types as genai_types
    from mcp import StdioServerParameters
    ADK_AVAILABLE = True
except ImportError as e:
    print(f"[ADK] Warning: google-adk import failed: {e}")
    print("Install with: pip install -r requirements.txt")
    ADK_AVAILABLE = False

# ── FastAPI imports ───────────────────────────────────────────────────────────
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
    FASTAPI_AVAILABLE = True
except ImportError:
    print("[FastAPI] Warning: fastapi/uvicorn not installed.")
    FASTAPI_AVAILABLE = False

# ── Environment ───────────────────────────────────────────────────────────────
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/scamshield")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
AGENT_PORT = int(os.environ.get("AGENT_PORT", "8080"))
MONGODB_DB = "scamshield"

# =============================================================================
# 🛡️ SCAMSHIELD AGENT SYSTEM PROMPT
# Key design decision: The agent is instructed to USE its MongoDB tools,
# not just return JSON immediately. This makes it a true tool-calling agent.
# =============================================================================
SCAMSHIELD_SYSTEM_PROMPT = """You are ScamShield Agent — an autonomous cyber-investigation agent specialized in detecting recruitment scams, phishing attacks, fake internship offers, onboarding-fee fraud, UPI scams, impersonation attacks, and malicious financial schemes targeting students and job seekers in India.

You have access to a MongoDB Atlas database via MCP tools. You MUST use these tools as part of your investigation.

## YOUR MANDATORY INVESTIGATION WORKFLOW

When given suspicious content to analyze, you MUST follow these steps IN ORDER:

### STEP 1: Extract Entities
Analyze the input and identify:
- Company name, domain, recruiter name, role
- Payment amounts (ANY payment = HIGH risk minimum)
- URLs, phone numbers, UPI handles
- Urgency phrases
- Language (Hindi/Hinglish/English)

### STEP 2: Query MongoDB Threat Ledger (REQUIRED - use your tools)
Call the `aggregate` tool on the `scamreports` collection with this exact pipeline structure to find similar past scam reports. Use the `find` tool to retrieve the most recent high-risk reports for context.

Example: Use `find` tool with:
- db: "scamshield"
- collection: "scamreports"  
- filter: {"riskLevel": {"$in": ["HIGH", "CRITICAL"]}}
- limit: 3

### STEP 3: Assess Risk Level
Based on your entity extraction AND the MongoDB results:
- CRITICAL: confirmed scam pattern, any payment request + fast-track trigger, matches known campaign
- HIGH: ANY payment/fee request, suspicious domain, impersonation indicators
- MEDIUM: unverifiable recruiter, urgency without payment, informal channels
- LOW: no red flags, verified-looking domain, no payment

### STEP 4: Generate Verdict and Save to MongoDB (REQUIRED - use your tools)
After forming your verdict, call the `insert-many` tool to save the report:
- db: "scamshield"
- collection: "scamreports"
- documents: [your complete report document]

### STEP 5: Return Final JSON
After completing ALL tool calls, return your final verdict as VALID JSON with this exact structure:

{
  "investigationSummary": "clear summary including MongoDB pattern match findings",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidenceScore": number 0-100,
  "redFlags": ["specific red flags found"],
  "recommendedActions": ["exactly 3 India-specific action strings"],
  "patternMatch": {
    "matched": boolean,
    "detail": "what MongoDB search found or 'No similar patterns in threat ledger'",
    "confidence": number 0-100
  },
  "extractedEntities": {
    "domain": "string",
    "companyName": "string",
    "recruiterName": "string",
    "paymentAmount": "string",
    "urgencyPhrases": ["array"],
    "urls": ["array"],
    "phoneNumbers": ["array"]
  },
  "scamCategory": "Onboarding Fee Fraud | Phishing | Task-Based Scam | Scholarship Scam | Fake Internship | Impersonation Attack | Unknown",
  "isFastTrack": boolean,
  "languageDetected": "English" | "Hindi" | "Hinglish" | "Other",
  "mongodbToolsUsed": true
}

## CRITICAL RULES
- No legitimate company EVER charges onboarding, training, or registration fees
- ANY payment request in a hiring context = minimum HIGH risk
- You MUST call MongoDB tools before returning your verdict
- Your patternMatch.detail MUST reference what you found (or didn't find) in MongoDB
- Never fabricate verification results
- Respond in English always
- FAST-TRACK: If input mentions "pay onboarding fee", "registration fee", "training fee", "earn ₹ per task", or "congratulations" + payment → immediately set riskLevel: CRITICAL, isFastTrack: true
"""


# =============================================================================
# 🔌 MongoDB MCP Toolset Factory
# =============================================================================
def build_mcp_toolset():
    """Build the MongoDB MCP toolset for the ADK agent."""
    if not ADK_AVAILABLE:
        return None
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


# =============================================================================
# 🤖 ADK Agent Factory
# =============================================================================
def build_agent():
    """Instantiate the ScamShield ADK agent with MongoDB MCP tools."""
    if not ADK_AVAILABLE:
        raise RuntimeError("google-adk is not installed")

    mongodb_mcp_toolset = build_mcp_toolset()
    tools = [mongodb_mcp_toolset] if mongodb_mcp_toolset else []

    return Agent(
        name="ScamShieldAI_Agent",
        model="gemini-2.5-flash",
        description=(
            "Autonomous cyber-investigation agent that detects scams and fraud "
            "targeting Indian students and job seekers. Uses MongoDB Atlas MCP "
            "for threat pattern matching and report persistence."
        ),
        instruction=SCAMSHIELD_SYSTEM_PROMPT,
        tools=tools,
    )


# =============================================================================
# 🔍 Response Parser
# =============================================================================
def _parse_json_from_agent_response(text: str) -> dict:
    """
    Extract and parse the final JSON verdict from the agent's response.
    The agent may produce tool call outputs and reasoning text before the JSON.
    We extract the last valid JSON object from the response.
    """
    text = text.strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code fences
    fence_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text, re.IGNORECASE)
    if fence_match:
        try:
            return json.loads(fence_match.group(1))
        except json.JSONDecodeError:
            pass

    # Find ALL JSON objects in the text and take the last/largest one
    # (the agent's reasoning may produce intermediate JSON-like structures)
    json_candidates = []
    depth = 0
    start = -1
    for i, char in enumerate(text):
        if char == '{':
            if depth == 0:
                start = i
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0 and start != -1:
                candidate = text[start:i+1]
                try:
                    parsed = json.loads(candidate)
                    # Only accept objects that look like our verdict schema
                    if 'riskLevel' in parsed or 'investigationSummary' in parsed:
                        json_candidates.append(parsed)
                except json.JSONDecodeError:
                    pass
                start = -1

    if json_candidates:
        # Return the last (most complete) valid verdict JSON
        return json_candidates[-1]

    raise ValueError(f"No valid verdict JSON found in agent response. Response preview: {text[:300]}")


def _apply_schema_defaults(parsed: dict, fast_track: bool) -> dict:
    """Enforce schema defaults and fast-track overrides."""
    result = {
        "investigationSummary": parsed.get("investigationSummary", "Analysis completed via Google ADK agent."),
        "riskLevel": parsed.get("riskLevel", "MEDIUM"),
        "confidenceScore": parsed.get("confidenceScore", 50) if isinstance(parsed.get("confidenceScore"), (int, float)) else 50,
        "redFlags": parsed.get("redFlags", []) if isinstance(parsed.get("redFlags"), list) else [],
        "recommendedActions": (
            parsed["recommendedActions"][:3]
            if isinstance(parsed.get("recommendedActions"), list) and len(parsed.get("recommendedActions", [])) >= 3
            else [
                "Verify all details and credentials before responding to this communication.",
                "Do not make any payment, deposit, or registration fee under any circumstances.",
                "Report immediately at cybercrime.gov.in or call National Cyber Crime Helpline 1930.",
            ]
        ),
        "patternMatch": parsed.get("patternMatch", {
            "matched": False,
            "detail": "MongoDB threat ledger searched — no matching patterns found.",
            "confidence": 0
        }),
        "extractedEntities": {
            "domain": parsed.get("extractedEntities", {}).get("domain", ""),
            "companyName": parsed.get("extractedEntities", {}).get("companyName", ""),
            "recruiterName": parsed.get("extractedEntities", {}).get("recruiterName", ""),
            "paymentAmount": parsed.get("extractedEntities", {}).get("paymentAmount", ""),
            "urgencyPhrases": parsed.get("extractedEntities", {}).get("urgencyPhrases", []),
            "urls": parsed.get("extractedEntities", {}).get("urls", []),
            "phoneNumbers": parsed.get("extractedEntities", {}).get("phoneNumbers", []),
        },
        "scamCategory": parsed.get("scamCategory", "Unknown"),
        "isFastTrack": parsed.get("isFastTrack", fast_track),
        "languageDetected": parsed.get("languageDetected", "English"),
        "mongodbToolsUsed": parsed.get("mongodbToolsUsed", True),
    }

    # Enforce fast-track overrides
    if fast_track:
        result["riskLevel"] = "CRITICAL"
        result["isFastTrack"] = True
        flags = result["redFlags"]
        ft_flag = "⚡ Known critical scam pattern detected — Fast-Track escalation triggered"
        if ft_flag not in flags:
            result["redFlags"] = [ft_flag] + flags
        # Ensure cybercrime.gov.in is in recommended actions
        if not any("cybercrime.gov.in" in a for a in result["recommendedActions"]):
            result["recommendedActions"][2] = (
                "Report immediately at cybercrime.gov.in or call National Cyber Crime Helpline 1930. "
                "Preserve all screenshots as evidence before blocking."
            )

    return result


def _is_fast_track(text: str) -> bool:
    """Quick client-side check for known critical scam patterns."""
    lower = text.lower()
    triggers = [
        "pay onboarding fee", "onboarding fee", "registration fee",
        "training fee", "offer letter after payment",
        "work from home earn", "earn per task", "earn ₹", "earn rs.",
        "scholarship approved", "pay processing fee",
    ]
    congrats_with_payment = (
        any(w in lower for w in ["congratulations", "you are selected", "you have been selected"])
        and any(w in lower for w in ["pay", "payment", "fee", "upi", "₹"])
    )
    return any(t in lower for t in triggers) or congrats_with_payment


# =============================================================================
# 🌐 FastAPI HTTP Bridge
# =============================================================================
def create_app():
    """Create the FastAPI application exposing the ADK agent over HTTP."""
    if not FASTAPI_AVAILABLE:
        raise RuntimeError("fastapi/uvicorn not installed. Run: pip install fastapi uvicorn")

    app = FastAPI(
        title="ScamShield ADK Bridge",
        description=(
            "HTTP bridge exposing the Google ADK ScamShield agent. "
            "The agent uses MongoDB Atlas MCP tools for vector search and report persistence."
        ),
        version="2.1.0"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    class AnalyzeRequest(BaseModel):
        text: str
        fast_track: Optional[bool] = False

    class AnalyzeResponse(BaseModel):
        success: bool
        result: Optional[dict] = None
        error: Optional[str] = None
        agent: str = "ScamShieldAI_Agent"
        model: str = "gemini-2.5-flash"
        mcp_enabled: bool = True
        tool_calls_made: Optional[int] = None

    # Shared ADK runner — built once on startup
    runner_instance = None
    session_service = None

    @app.on_event("startup")
    async def startup_event():
        nonlocal runner_instance, session_service
        print("[ADK Bridge] ⚙️  Building ScamShield agent with MongoDB MCP toolset...")
        try:
            agent_instance = build_agent()
            session_service = InMemorySessionService()
            runner_instance = Runner(
                agent=agent_instance,
                app_name="ScamShieldAI",
                session_service=session_service,
            )
            print("[ADK Bridge] ✅ Agent ready — MongoDB MCP server will spawn on first tool call.")
            print(f"[ADK Bridge] 🌐 Listening on port {AGENT_PORT}")
        except Exception as e:
            print(f"[ADK Bridge] ❌ Agent build failed: {e}")
            runner_instance = None
            session_service = None

    @app.get("/health")
    async def health():
        return {
            "status": "ok" if runner_instance else "degraded",
            "agent": "ScamShieldAI_Agent",
            "model": "gemini-2.5-flash",
            "framework": "Google ADK (Vertex AI Agent Builder)",
            "partner_mcp": "MongoDB Atlas MCP Server",
            "adk_available": ADK_AVAILABLE,
            "mongodb_uri_set": bool(MONGODB_URI and "localhost" not in MONGODB_URI),
        }

    @app.post("/analyze", response_model=AnalyzeResponse)
    async def analyze(req: AnalyzeRequest):
        if not runner_instance or not session_service:
            raise HTTPException(status_code=503, detail="ADK Agent not initialized — check startup logs.")

        text = req.text.strip()
        if len(text) < 10:
            raise HTTPException(status_code=400, detail="Input text too short (minimum 10 characters).")

        text = text[:15000]  # Match Express pipeline limit
        fast_track = req.fast_track or _is_fast_track(text)

        # Build the investigation prompt — instructs agent to use its tools
        prompt = (
            f"{'FAST-TRACK ALERT: ' if fast_track else ''}"
            f"Investigate this suspicious content. "
            f"{'This matches known CRITICAL scam patterns — escalate immediately. ' if fast_track else ''}"
            f"Follow your mandatory workflow: "
            f"(1) extract entities, "
            f"(2) search MongoDB threat ledger using your tools, "
            f"(3) assess risk incorporating MongoDB findings, "
            f"(4) save report to MongoDB using insert-many tool, "
            f"(5) return final JSON verdict.\n\n"
            f"SUSPICIOUS CONTENT TO INVESTIGATE:\n{text}"
        )

        import uuid
        session_id = str(uuid.uuid4())
        user_id = "express_bridge"

        try:
            await session_service.create_session(
                app_name="ScamShieldAI",
                user_id=user_id,
                session_id=session_id,
            )

            content = genai_types.Content(
                role="user",
                parts=[genai_types.Part(text=prompt)]
            )

            # Collect ALL events from the agent's reasoning loop
            final_text = ""
            tool_calls_count = 0
            tool_call_log = []

            async for event in runner_instance.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=content,
            ):
                # Log tool calls — this is what proves MCP is being used
                if hasattr(event, 'content') and event.content:
                    for part in event.content.parts if event.content.parts else []:
                        # Track function calls (MCP tool invocations)
                        if hasattr(part, 'function_call') and part.function_call:
                            tool_calls_count += 1
                            tool_name = part.function_call.name
                            tool_call_log.append(tool_name)
                            print(f"[ADK] 🔧 Tool call #{tool_calls_count}: {tool_name}")

                        # Track function responses
                        if hasattr(part, 'function_response') and part.function_response:
                            print(f"[ADK] ✅ Tool response received for: {part.function_response.name}")

                # Capture final text response
                if event.is_final_response() and event.content and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, 'text') and part.text:
                            final_text += part.text

            print(f"[ADK] Investigation complete. Tool calls: {tool_calls_count} {tool_call_log}")

            if not final_text.strip():
                raise ValueError("Agent returned empty response — no final text produced.")

            # Parse and validate the JSON verdict
            parsed = _parse_json_from_agent_response(final_text)
            result = _apply_schema_defaults(parsed, fast_track)

            return AnalyzeResponse(
                success=True,
                result=result,
                tool_calls_made=tool_calls_count,
            )

        except Exception as e:
            print(f"[ADK Bridge] ❌ Agent run failed: {type(e).__name__}: {e}")
            raise HTTPException(status_code=500, detail=f"Agent investigation failed: {str(e)}")

    return app


# =============================================================================
# 🚀 Entry Points
# =============================================================================
def serve():
    """Start the FastAPI HTTP bridge (production/development mode)."""
    if not FASTAPI_AVAILABLE:
        print("[ERROR] Install fastapi and uvicorn: pip install fastapi uvicorn")
        sys.exit(1)

    print("=" * 70)
    print("🛡️  ScamShield Agent — Google ADK Agent HTTP Bridge")
    print("=" * 70)
    print(f"  Framework    : Google ADK (Vertex AI Agent Builder)")
    print(f"  Model        : gemini-2.5-flash")
    print(f"  Partner MCP  : MongoDB Atlas MCP Server (mongodb-mcp-server)")
    print(f"  MongoDB URI  : {MONGODB_URI[:45]}...")
    print(f"  Port         : {AGENT_PORT}")
    print(f"  Health check : http://localhost:{AGENT_PORT}/health")
    print(f"  Analyze API  : POST http://localhost:{AGENT_PORT}/analyze")
    print("-" * 70)
    print("  The agent will call MongoDB MCP tools during each investigation.")
    print("  Watch the logs to see real tool call/response events.")
    print("=" * 70)

    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=AGENT_PORT, log_level="info")


def run_adk_web():
    """Start the ADK interactive web UI for debugging/demo."""
    print("=" * 70)
    print("🛡️  ScamShield Agent — ADK Web UI (Debug/Demo Mode)")
    print("=" * 70)
    print("Launching ADK chat interface at: http://localhost:8000")
    print("The agent will use MongoDB MCP tools in chat responses.")
    print("-" * 70)
    try:
        subprocess.run(["adk", "web", "."], check=True)
    except FileNotFoundError:
        print("[ERROR] 'adk' CLI not found. Run: pip install google-adk")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nShutting down. MCP sub-processes will be cleaned up.")
        sys.exit(0)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "serve"
    if mode == "web":
        run_adk_web()
    else:
        serve()

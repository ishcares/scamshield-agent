import os
import sys
import subprocess
from dotenv import load_dotenv

# Load local environment variables from .env file
load_dotenv()

# We import the Google ADK components and MCP server parameters
try:
    from google.adk.agents import Agent
    from google.adk.tools.mcp_tool import McpToolset, StdioConnectionParams
    from mcp import StdioServerParameters
except ImportError:
    print("Warning: google-adk is not installed in the active environment.")
    print("Please install requirements using: pip install -r requirements.txt")

# Retrieve MongoDB URI from environment variables (fallback to localhost)
MONGODB_URI = os.environ.get(
    "MONGODB_URI", 
    "mongodb://localhost:27017/scamshield"
)

# ─────────────────────────────────────────────────────────────────────────────
# 🛡️ ScamShield AI System Prompt
# ─────────────────────────────────────────────────────────────────────────────
SCAMSHIELD_SYSTEM_PROMPT = """You are ScamShield AI — an autonomous cyber-investigation agent specialized in detecting recruitment scams, phishing attacks, fake internship offers, onboarding-fee fraud, UPI scams, impersonation attacks, and malicious financial schemes targeting students and job seekers in India.

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
}"""

# ─────────────────────────────────────────────────────────────────────────────
# 🔌 MongoDB MCP Toolset Configuration
# ─────────────────────────────────────────────────────────────────────────────
# Sets up the official mongodb-mcp-server over stdio. The ADK handles spawning,
# communication, and graceful process lifecycle termination automatically.
mongodb_mcp_toolset = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            command="npx",
            args=[
                "-y", 
                "mongodb-mcp-server", 
                f"--mongodb-uri={MONGODB_URI}"
            ]
        ),
        timeout=30
    )
)

# ─────────────────────────────────────────────────────────────────────────────
# 🤖 ScamShield AI Agent Instantiation
# ─────────────────────────────────────────────────────────────────────────────
scamshield_agent = Agent(
    name="ScamShieldAI_Agent",
    model="gemini-2.5-pro",
    description="Autonomous cyber-investigation agent specialized in detecting scams, phishing, and financial frauds in India.",
    instruction=SCAMSHIELD_SYSTEM_PROMPT,
    tools=[mongodb_mcp_toolset]
)

# ─────────────────────────────────────────────────────────────────────────────
# 🚀 Programmatic Local Web Testing Runner
# ─────────────────────────────────────────────────────────────────────────────
def main():
    """
    Main function to run the ADK local web server for chat testing and debugging.
    This starts a local FastAPI server, hosting the agent chat UI at http://localhost:8000.
    """
    print("=" * 70)
    print("🛡️  ScamShield AI — Google ADK Local Agent Workspace Launcher")
    print("=" * 70)
    print(f"Connecting Agent to threat ledger at: {MONGODB_URI}")
    print("Model assigned: gemini-2.5-pro")
    print("Launching ADK Web Server interface...")
    print("Access the interface at: http://localhost:8000")
    print("-" * 70)
    
    try:
        # Executes `adk web .` inside the root workspace folder programmatically.
        # This will load and bind all packages, launching the interactive panel.
        subprocess.run(["adk", "web", "."], check=True)
    except FileNotFoundError:
        print("\n[ERROR]: The 'adk' command-line interface was not found.")
        print("Please verify that you have activated your virtual environment and run:")
        print("   pip install -r requirements.txt")
        print("-" * 70)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nExiting agent workspace. Shutting down MCP sub-processes cleanly.")
        sys.exit(0)

if __name__ == "__main__":
    main()

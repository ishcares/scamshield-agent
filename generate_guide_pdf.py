import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def build_pdf(filename="ScamShield_Agent_Hackathon_Guide.pdf"):
    # Target path is the current workspace directory
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom elegant styles
    primary_color = colors.HexColor("#1e293b")  # slate-800
    secondary_color = colors.HexColor("#3b82f6")  # blue-500
    text_color = colors.HexColor("#334155")  # slate-700
    bg_light = colors.HexColor("#f8fafc")  # slate-50
    border_color = colors.HexColor("#e2e8f0")  # slate-200

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=12,
        leading=16,
        textColor=secondary_color,
        spaceAfter=20
    )

    h1_style = ParagraphStyle(
        'SecHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=10,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SubSecHeader',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=secondary_color,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_color,
        spaceAfter=8
    )

    code_style = ParagraphStyle(
        'DocCode',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        backColor=bg_light,
        borderColor=border_color,
        borderWidth=0.5,
        borderPadding=6,
        spaceAfter=10
    )

    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_color,
        leftIndent=20,
        firstLineIndent=-10,
        spaceAfter=6
    )

    story = []

    # --- COVER HEADER ---
    story.append(Paragraph("ScamShield Agent 🛡️", title_style))
    story.append(Paragraph("Google Cloud Rapid Agent Hackathon 2026 — Partner Track Guide", subtitle_style))
    story.append(Spacer(1, 10))

    # --- CONCEPTUAL ANALOGY SECTION ---
    story.append(Paragraph("Conceptual Analogy: The Cyber-Detective Agency", h1_style))
    story.append(Paragraph(
        "To easily explain how this upgraded system works, think of the application as a <b>Cyber-Detective Agency</b>. "
        "Each part of our MERN stack and Agentic pipeline has an essential conceptual role:",
        body_style
    ))
    
    analogy_points = [
        "<b>React Frontend (The Storefront & Reception Desk)</b>: The visual office where the customer stands, submits a suspicious letter, and views active results.",
        "<b>Express Backend (The Office Manager)</b>: Stands behind the desk, receives requests, routes files, and communicates with the back room.",
        "<b>MongoDB Atlas (The Filing Cabinets)</b>: The storage room where the history of threat patterns and signatures are locked in folders.",
        "<b>Google ADK Agent / Gemini 2.5 Flash (The Lead Detective)</b>: Hired by the Office Manager. The Detective doesn't just read the letter and guess—they have a <b>toolkit (MCP Server)</b> containing keys to the **Filing Cabinets (MongoDB)**. The Detective actively searches past logs, evaluates risk, logs new records into the files, and compiles the final 6-step progress report for the manager."
    ]
    for pt in analogy_points:
        story.append(Paragraph(f"🕵️‍♂️ {pt}", bullet_style))
    story.append(Spacer(1, 12))

    story.append(PageBreak())

    # --- ARCHITECTURE SECTION ---
    story.append(Paragraph("1. System Architecture & Context", h1_style))
    story.append(Paragraph(
        "ScamShield Agent is upgraded from a single-step API chatbot to a production-grade <b>autonomous multi-step agent</b>. "
        "The architecture is designed to satisfy the rigorous technical requirements of the Google Cloud Rapid Agent Hackathon "
        "and the MongoDB Partner Track.",
        body_style
    ))
    
    # Simple diagram table
    diag_data = [
        ["React Frontend (:3000)", "Express Backend (:5000)", "Python ADK Bridge (:8080)", "MongoDB MCP Server"],
        ["Sleek glassmorphism UI showing threat panel stream", "Routes analysis requests, serves endpoints & FIR complaints", "Vertex AI Google ADK agent with fastapi bridge", "Enables direct DB search & persist tools inside AI reasoning"]
    ]
    diag_table = Table(diag_data, colWidths=[1.3*inch, 1.8*inch, 1.8*inch, 1.6*inch])
    diag_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), secondary_color),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,1), (-1,-1), bg_light),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(diag_table)
    story.append(Spacer(1, 12))

    # --- 6-STEP PIPELINE ---
    story.append(Paragraph("2. The 6-Step Multi-Step Agent Pipeline", h1_style))
    story.append(Paragraph(
        "Instead of returning a static response, the backend and agent coordinate an active multi-turn pipeline:",
        body_style
    ))
    
    steps = [
        "<b>Step 1 — Entity Extraction</b>: The model extracts domains, company names, recruiter identities, payment amounts, and whatsapp contact phone numbers.",
        "<b>Step 2 — Threat Ledger MCP Search (MongoDB Tool)</b>: The Google ADK Agent invokes the MongoDB <i>aggregate</i> tool directly inside its reasoning loop to find match criteria against historical scam records.",
        "<b>Step 3 — Trust Index Calculation</b>: Evaluates urgency phrases, payment triggers, and domain matches to resolve a Trust Score between 0 and 100.",
        "<b>Step 4 — AI Threat Verdict</b>: Gemini 2.5 Flash calculates the final riskLevel (LOW, MEDIUM, HIGH, CRITICAL) and scam category.",
        "<b>Step 5 — Telemetry Logging (MongoDB Tool)</b>: The agent automatically triggers the <i>insert-many</i> MongoDB MCP tool to save the investigation telemetry record.",
        "<b>Step 6 — Complaints Escalation</b>: Automatically formats a complaint draft customized for Indian authorities (cybercrime.gov.in) pre-filled with all extracted scam details."
    ]
    for step in steps:
        story.append(Paragraph(f"• {step}", bullet_style))
    story.append(Spacer(1, 12))

    story.append(PageBreak())

    # --- FILE EXPLANATIONS ---
    story.append(Paragraph("3. Core Code Files & Integrations", h1_style))
    
    # agent.py
    story.append(Paragraph("File 1: agent.py (The ADK Python Bridge)", h2_style))
    story.append(Paragraph(
        "This file defines the Google ADK Agent structure and connects it to the MongoDB MCP server tools. "
        "It exposes a uvicorn FastAPI server on port 8080. Here is how the MCP toolset is registered:",
        body_style
    ))
    story.append(Paragraph(
        "from google.adk.tools import McpToolset, StdioConnectionParams\n"
        "from mcp import StdioServerParameters\n\n"
        "def build_mcp_toolset():\n"
        "    return McpToolset(\n"
        "        connection_params=StdioConnectionParams(\n"
        "            server_params=StdioServerParameters(\n"
        "                command='npx', \n"
        "                args=['-y', 'mongodb-mcp-server', f'--mongodb-uri={MONGODB_URI}']\n"
        "            )\n"
        "        )\n"
        "    )",
        code_style
    ))

    # agentService.js
    story.append(Paragraph("File 2: server/services/agentService.js (Backend Connector)", h2_style))
    story.append(Paragraph(
        "Exposes a dual-layered client. It makes HTTP POST requests to port 8080 to invoke the ADK pipeline. "
        "To ensure robust production behavior, if the ADK server is waking up or unreachable, it gracefully "
        "falls back to direct Gemini API requests so the app never breaks:",
        body_style
    ))
    story.append(Paragraph(
        "async function analyzeViaBestAvailable(text) {\n"
        "  const adkAlive = await isADKBridgeAlive();\n"
        "  if (adkAlive) {\n"
        "    try {\n"
        "      const result = await callADKAgent(text);\n"
        "      return { result, usedADK: true };\n"
        "    } catch (err) {\n"
        "      console.warn('ADK failed, falling back to Gemini direct:', err.message);\n"
        "    }\n"
        "  }\n"
        "  const result = await analyzeWithGemini(text);\n"
        "  return { result, usedADK: false };\n"
        "}",
        code_style
    ))

    # AgentStatusPanel.jsx
    story.append(Paragraph("File 3: client/src/components/AgentStatusPanel.jsx (Status UI)", h2_style))
    story.append(Paragraph(
        "A floating glassmorphism UI element that renders a real-time terminal feed. "
        "It connects directly to the server's streaming chunks and displays status updates, "
        "allowing judges to visually track the ADK agent's tool calls and reasoning phases in real time.",
        body_style
    ))

    story.append(Spacer(1, 10))

    # --- TESTING & WINNING STRATEGY ---
    story.append(Paragraph("4. Local Verification & Demo Strategy", h1_style))
    story.append(Paragraph(
        "To run your local test environment, execute these commands in three separate terminal screens:",
        body_style
    ))
    story.append(Paragraph(
        "# Terminal 1: Start ADK bridge\n"
        "$env:PYTHONUTF8=1; venv\\Scripts\\python agent.py serve\n\n"
        "# Terminal 2: Start Node.js backend\n"
        "cd server && npm run dev\n\n"
        "# Terminal 3: Start Vite client\n"
        "cd client && npm run dev",
        code_style
    ))

    story.append(Paragraph("💡 Expert Demo Video Strategy (3 Minutes):", h2_style))
    tips = [
        "<b>0:00 - 0:30 (The Hook)</b>: State the critical problem (India's job seekers losing lakhs to onboarding fee scammers) and introduce ScamShield Agent.",
        "<b>0:30 - 1:30 (The Live Flow)</b>: Input a sample onboarding fee scam text. Point to the floating **Agent Status Panel** on the right side as it lights up, demonstrating the multi-step ADK reasoning and MongoDB MCP ledger tool calls.",
        "<b>1:30 - 2:30 (Extracted Entities & Legal Draft)</b>: Show the resolved Trust Score, categories, and click 'Download FIR Template' to showcase the auto-filled draft for cybercrime.gov.in.",
        "<b>2:30 - 3:00 (The Pitch)</b>: Summarize how the solution satisfies the Google Cloud ADK agent rules and integrates MongoDB MCP tools directly in the reasoning loop. Close with your mission: democratizing security for India's youth!"
    ]
    for tip in tips:
        story.append(Paragraph(f"• {tip}", bullet_style))

    # Build the document
    doc.build(story)
    print("PDF guide compiled successfully!")

if __name__ == "__main__":
    build_pdf()

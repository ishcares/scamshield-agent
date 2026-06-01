/**
 * fir.js — FIR Complaint Template Generator
 * ==========================================
 * GET /api/fir/:reportId
 *   → Generates a pre-filled cybercrime FIR complaint template
 *     formatted for cybercrime.gov.in online portal fields.
 *   → Returns plain text file download.
 *
 * GET /api/fir/preview/:reportId
 *   → Returns JSON version for frontend rendering.
 */

const express = require('express');
const router = express.Router();
const ScamReport = require('../models/ScamReport');

/**
 * Build FIR complaint text from a ScamReport document.
 */
function buildFIRTemplate(report) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const entities = report.extractedEntities || {};
  const redFlags = (report.redFlags || []).map((f, i) => `  ${i + 1}. ${f}`).join('\n');
  const actions  = (report.recommendedActions || []).map((a, i) => `  ${i + 1}. ${a}`).join('\n');

  // Severity map
  const severityMap = {
    CRITICAL: 'Extremely High — Immediate action required',
    HIGH:     'High — Urgent investigation needed',
    MEDIUM:   'Medium — Investigation recommended',
    LOW:      'Low — Advisory report',
  };

  const category = report.scamCategory || 'Unknown';
  const riskLabel = report.riskLevel || 'MEDIUM';
  const severity = severityMap[riskLabel] || 'Medium';

  return `
╔══════════════════════════════════════════════════════════════════╗
║          CYBERCRIME COMPLAINT — NATIONAL CYBER CRIME             ║
║          REPORTING PORTAL (cybercrime.gov.in)                    ║
║          Helpline: 1930                                          ║
╚══════════════════════════════════════════════════════════════════╝

[SECTION A — COMPLAINANT DETAILS]
(Fill in your personal details when submitting at cybercrime.gov.in)

Full Name        : ___________________________
Father's Name    : ___________________________
Date of Birth    : ___________________________
Gender           : ___________________________
Mobile Number    : ___________________________
Email Address    : ___________________________
State            : ___________________________
District         : ___________________________
Police Station   : ___________________________
Complete Address : ___________________________
                   ___________________________

═══════════════════════════════════════════════════════════════════

[SECTION B — COMPLAINT DETAILS]
(Auto-filled by ScamShield Agent — Verify before submission)

Date of Complaint          : ${dateStr}
Time of Complaint          : ${timeStr}
Complaint Reference ID     : SSA-${report._id?.toString().slice(-8).toUpperCase() || 'XXXXXXXX'}

Type of Cybercrime         : Online Financial Fraud / Recruitment Scam
Sub-Category               : ${category}
Risk Severity              : ${severity}

Accused / Suspect Details  :
  Suspected Entity Name    : ${entities.companyName || '[Not identified — see evidence below]'}
  Recruiter / Contact Name : ${entities.recruiterName || '[Unknown]'}
  Fraudulent Domain / Email: ${entities.domain || '[Not identified]'}
  Suspicious URLs          : ${entities.urls?.join(', ') || '[None identified]'}
  Contact Numbers          : ${entities.phoneNumbers?.join(', ') || '[None identified]'}
  Payment Amount Demanded  : ${entities.paymentAmount || '[Not specified]'}

═══════════════════════════════════════════════════════════════════

[SECTION C — DESCRIPTION OF INCIDENT]
(AI-generated summary — expand with your own details)

${report.investigationSummary || 'No summary available.'}

Urgency phrases used by the suspect:
${entities.urgencyPhrases?.length
    ? entities.urgencyPhrases.map(p => `  - "${p}"`).join('\n')
    : '  [None identified by AI]'}

═══════════════════════════════════════════════════════════════════

[SECTION D — EVIDENCE / RED FLAGS IDENTIFIED]
(AI-identified threat indicators — attach screenshots as evidence)

${redFlags || '  No specific red flags logged.'}

═══════════════════════════════════════════════════════════════════

[SECTION E — FINANCIAL LOSS DETAILS]
(Fill in if you made any payment)

Did you make any payment?  : YES / NO
Amount Paid (if any)       : ₹ ___________________________
Payment Method             : UPI / NEFT / IMPS / Debit Card / Other
Transaction ID / UTR No.   : ___________________________
Recipient UPI / Account No.: ___________________________
Date of Transaction        : ___________________________
Bank Name                  : ___________________________

═══════════════════════════════════════════════════════════════════

[SECTION F — RECOMMENDED ACTIONS]
(Follow these steps immediately)

${actions || '  No actions logged.'}

═══════════════════════════════════════════════════════════════════

[SECTION G — DECLARATION]

I, the undersigned, hereby declare that the information provided in
this complaint is true and correct to the best of my knowledge.
I understand that filing a false complaint is a punishable offence.

Complainant's Signature    : ___________________________
Date                       : ${dateStr}
Place                      : ___________________________

═══════════════════════════════════════════════════════════════════

[HOW TO SUBMIT THIS COMPLAINT]

1. Visit: https://cybercrime.gov.in/
2. Click "File a Complaint" → Select "Financial Fraud"
3. Fill Section A with your personal details
4. Paste/type the incident description from Section C
5. Upload screenshots, chat logs, or payment receipts as evidence
6. Submit — you will receive a complaint acknowledgement number
7. You can also call: 1930 (National Cyber Crime Helpline)

[ALTERNATIVE CHANNELS]
• Your local Police Station (bring printout of this document)
• RBI Sachet Portal: https://sachet.rbi.org.in (for banking fraud)
• TRAI DND App (for spam calls/SMS)

═══════════════════════════════════════════════════════════════════
Generated by ScamShield Agent | Google ADK + MongoDB Atlas MCP
Report ID: ${report._id || 'N/A'} | ${dateStr} ${timeStr}
═══════════════════════════════════════════════════════════════════
`.trim();
}

// ── GET /api/fir/:reportId — Download pre-filled FIR as text file ─────────
router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    // Validate ObjectId format
    if (!/^[a-f\d]{24}$/i.test(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID format.' });
    }

    const report = await ScamReport.findById(reportId).lean();
    if (!report) {
      return res.status(404).json({ error: 'Report not found in ledger.' });
    }

    const firText = buildFIRTemplate(report);
    const filename = `ScamShield_FIR_${reportId.slice(-8).toUpperCase()}_${Date.now()}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(firText);

  } catch (err) {
    console.error('[FIR Route] Error:', err);
    res.status(500).json({ error: 'Failed to generate FIR template.' });
  }
});

// ── GET /api/fir/preview/:reportId — JSON preview for frontend ────────────
router.get('/preview/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    if (!/^[a-f\d]{24}$/i.test(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID format.' });
    }

    const report = await ScamReport.findById(reportId).lean();
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    res.json({
      success: true,
      reportId,
      scamCategory: report.scamCategory,
      riskLevel: report.riskLevel,
      extractedEntities: report.extractedEntities,
      investigationSummary: report.investigationSummary,
      redFlags: report.redFlags,
      recommendedActions: report.recommendedActions,
      timestamp: report.timestamp,
    });

  } catch (err) {
    console.error('[FIR Preview] Error:', err);
    res.status(500).json({ error: 'Failed to fetch report.' });
  }
});

module.exports = router;

import {
  Globe, CreditCard, AlertTriangle, Clock, Phone, Link2, User, Building,
  Shield, Zap, CheckCircle2, AlertOctagon, HelpCircle, FileText
} from 'lucide-react'
import RiskBadge from './RiskBadge'
import PatternMatch from './PatternMatch'
import ActionCard from './ActionCard'

// Function to map red flags to specific icons
function getFlagIcon(flag) {
  const f = flag.toLowerCase()
  if (f.includes('domain') || f.includes('gmail') || f.includes('email')) return Globe
  if (f.includes('payment') || f.includes('fee') || f.includes('upi') || f.includes('₹') || f.includes('money')) return CreditCard
  if (f.includes('urgent') || f.includes('deadline') || f.includes('24 hour') || f.includes('immediately')) return Clock
  if (f.includes('phone') || f.includes('number') || f.includes('whatsapp') || f.includes('telegram')) return Phone
  if (f.includes('url') || f.includes('link') || f.includes('http')) return Link2
  if (f.includes('fast-track') || f.includes('pattern') || f.includes('campaign')) return Zap
  return AlertTriangle
}

function EntityChip({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.05] px-3.5 py-2 rounded-xl transition-all duration-300 hover:bg-white/[0.04]">
      <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
      <span className="text-[11px] text-slate-500 font-medium">{label}:</span>
      <span className="text-xs text-slate-300 font-semibold truncate max-w-[140px]">{value}</span>
    </div>
  )
}

export default function InvestigationDashboard({ result }) {
  if (!result) return null

  const {
    riskLevel,
    confidenceScore = 85,
    investigationSummary,
    redFlags = [],
    recommendedActions = [],
    patternMatch,
    extractedEntities = {},
    scamCategory,
    isFastTrack,
    languageDetected,
    reportId,
  } = result

  // Calculate dynamic component scores based on the flags
  const flagsStr = redFlags.join(' ').toLowerCase()
  const domainScore = flagsStr.includes('domain') || flagsStr.includes('gmail') || flagsStr.includes('email') ? 25 : 95
  const recruiterScore = flagsStr.includes('recruiter') || flagsStr.includes('impersonat') ? 35 : 98
  const paymentScore = flagsStr.includes('payment') || flagsStr.includes('fee') || flagsStr.includes('upi') ? 10 : 99
  const languageScore = flagsStr.includes('urgent') || flagsStr.includes('deadline') ? 40 : 92
  const similarityScore = patternMatch?.matched ? Math.max(10, 100 - Math.round(patternMatch.confidence)) : 96

  // Trust Score (Inverted Risk or direct confidence mappings)
  // Let's call it "Platform Integrity Score" or "Trust Index"
  let trustIndex = 100 - (confidenceScore * 0.8) // Default calculation
  if (riskLevel === 'LOW') trustIndex = Math.max(88, 100 - (100 - confidenceScore) * 0.4)
  else if (riskLevel === 'MEDIUM') trustIndex = Math.max(62, 85 - (100 - confidenceScore) * 0.5)
  else if (riskLevel === 'HIGH') trustIndex = Math.min(48, Math.max(25, 55 - (confidenceScore * 0.3)))
  else if (riskLevel === 'CRITICAL') trustIndex = Math.min(15, Math.max(5, 20 - (confidenceScore * 0.15)))

  const hasTrustScore = result.trustScore !== undefined
  const trustScoreFormatted = hasTrustScore ? result.trustScore : Math.round(trustIndex)

  // Determine trust status label & color with requested rules:
  // Green > 75, Yellow 50-75, Red < 50
  let trustStatus = 'Secure'
  let trustColor = '#10b981' // Emerald
  let trustTextClass = 'text-emerald-400'
  let trustBgClass = 'bg-emerald-500/10 border-emerald-500/20'

  if (!hasTrustScore) {
    trustStatus = 'Analyzing...'
    trustColor = '#3b82f6' // Blue
    trustTextClass = 'text-blue-400'
    trustBgClass = 'bg-blue-500/10 border-blue-500/20 animate-pulse'
  } else if (trustScoreFormatted < 50) {
    trustStatus = 'Compromised'
    trustColor = '#ef4444' // Red
    trustTextClass = 'text-rose-400'
    trustBgClass = 'bg-rose-500/10 border-rose-500/20'
  } else if (trustScoreFormatted <= 75) {
    trustStatus = 'Caution'
    trustColor = '#f59e0b' // Yellow
    trustTextClass = 'text-amber-400'
    trustBgClass = 'bg-amber-500/10 border-amber-500/20'
  }

  // Streaming vs Historic step resolution
  const isStreaming = result.step !== undefined && !result.final
  const currentStep = isStreaming ? result.step : 7 // 7 means all completed

  const timelineSteps = [
    { label: 'Entity Extraction Engine', desc: 'OCR & metadata parameter extraction', stepNum: 1 },
    { label: 'Threat Ledger Query', desc: 'Vector comparison via MongoDB MCP tools', stepNum: 2 },
    { label: 'Trust Index Resolver', desc: 'Weighted risk score calculation', stepNum: 3 },
    { label: 'AI Threat Verdict', desc: 'Gemini 2.5 scam campaign classification', stepNum: 4 },
    { label: 'Immutable Report Registry', desc: 'Persisting telemetry logs to database', stepNum: 5 },
    { label: 'Escalation Mapping', desc: 'Generating official regulatory helpline routes', stepNum: 6 },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Fast-track alert */}
      {isFastTrack && (
        <div className="flex items-start gap-4 p-5 rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] shadow-[0_0_40px_rgba(244,63,94,0.06)]">
          <Zap className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="text-sm font-bold text-rose-400 uppercase tracking-wide">Autonomous Flag Escaped: Known Scam Pattern Match</p>
            <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
              Our pattern index has identified a 1:1 match with an active cybercrime campaign. Risk has been escalated to Critical automatically. Avoid all transactions or information sharing.
            </p>
          </div>
        </div>
      )}

      {/* Core Investigation Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Trust Score & Progressive Verification timeline */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Trust Score Panel */}
          <div className="surface p-8 border border-white/[0.04] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.01] rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              
              {/* Radial Score Indicator */}
              <div className="flex-shrink-0 flex flex-col items-center gap-3 relative">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className={`w-full h-full ${!hasTrustScore ? 'animate-pulse' : ''}`} viewBox="0 0 120 120">
                    {/* Glowing effect inside circle */}
                    {hasTrustScore && (
                      <circle
                        cx="60"
                        cy="60"
                        r="42"
                        fill="transparent"
                        stroke={trustColor}
                        strokeWidth="10"
                        className="opacity-[0.03] blur-md transition-all duration-1000"
                      />
                    )}
                    {Array.from({ length: 24 }).map((_, i) => {
                      const angle = (i * 360) / 24;
                      const activeTicksCount = hasTrustScore ? Math.round((trustScoreFormatted / 100) * 24) : 0;
                      const isActive = i < activeTicksCount;
                      
                      return (
                        <line
                          key={i}
                          x1="60"
                          y1="16"
                          x2="60"
                          y2="26"
                          stroke={isActive ? trustColor : 'rgba(255, 255, 255, 0.05)'}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          transform={`rotate(${angle} 60 60)`}
                          className="transition-all duration-500 ease-out"
                        />
                      );
                    })}
                  </svg>
                  {/* Score text overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                    <span className={`text-3xl font-black tracking-tight transition-all duration-500 ${hasTrustScore ? 'text-white' : 'text-slate-500 animate-pulse'}`}>
                      {hasTrustScore ? trustScoreFormatted : '--'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Trust Index</span>
                  </div>
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${trustBgClass} ${trustTextClass}`}>
                  {trustStatus}
                </div>
              </div>

              {/* Score Breakdown Bars */}
              <div className="flex-1 w-full space-y-3.5">
                <div className="mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Analysis Breakdown</h3>
                  <p className="text-[11px] text-slate-500">Autonomous reliability parameters</p>
                </div>
                
                {!hasTrustScore ? (
                  <div className="space-y-3 py-2">
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <div key={idx} className="space-y-1.5 animate-pulse">
                        <div className="h-2.5 w-24 bg-white/5 rounded-full" />
                        <div className="w-full h-1 bg-white/5 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  [
                    { label: 'Domain Reputation', val: domainScore },
                    { label: 'Recruiter Authority', val: recruiterScore },
                    { label: 'UPI / Escrow Integrity', val: paymentScore },
                    { label: 'Linguistic Risk Score', val: languageScore },
                    { label: 'Pattern Divergence', val: similarityScore },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>{item.label}</span>
                        <span className="font-mono">{item.val}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${item.val}%`,
                            backgroundColor: item.val > 70 ? '#10b981' : item.val > 40 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>

          {/* Autonomous Timeline Panel */}
          <div className="surface p-8 border border-white/[0.04]">
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Audit Sequence</h3>
              <p className="text-[11px] text-slate-500">Progressive telemetry scanning logs</p>
            </div>

            <div className="space-y-6 relative">
              {/* Timeline Connector Line */}
              <div className="absolute top-3 bottom-3 left-4 w-[1px] bg-white/5" />

              {timelineSteps.map((step, idx) => {
                const stepNum = step.stepNum
                const isResolved = currentStep > stepNum
                const isActive = currentStep === stepNum
                const isPending = currentStep < stepNum

                let isFlagged = false
                let statusText = 'verified'

                if (stepNum === 1) {
                  const hasEntities = extractedEntities && Object.values(extractedEntities).some(v => v && (typeof v === 'string' ? v : v.length > 0))
                  statusText = hasEntities ? 'metadata extracted' : 'verified'
                } else if (stepNum === 2) {
                  isFlagged = patternMatch?.matched
                  statusText = isFlagged ? 'match flagged' : 'no threat match'
                } else if (stepNum === 3) {
                  isFlagged = hasTrustScore && trustScoreFormatted < 50
                  statusText = hasTrustScore ? `index: ${trustScoreFormatted}%` : 'verified'
                } else if (stepNum === 4) {
                  isFlagged = riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
                  statusText = riskLevel ? `verdict: ${riskLevel}` : 'verified'
                } else if (stepNum === 5) {
                  statusText = reportId ? 'ledger updated' : 'registered'
                } else if (stepNum === 6) {
                  statusText = recommendedActions.length > 0 ? 'protocol mapped' : 'verified'
                }

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-4 transition-all duration-500
                      ${!isPending ? 'opacity-100' : 'opacity-25'}
                    `}
                  >
                    {/* Timeline Node Icon */}
                    <div className="relative z-10 flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border bg-[#090d16] transition-all duration-300">
                      {isResolved ? (
                        isFlagged ? (
                          <AlertOctagon className="w-4 h-4 text-rose-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )
                      ) : isActive ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
                      ) : (
                        <HelpCircle className="w-4 h-4 text-slate-600" />
                      )}
                    </div>

                    {/* Timeline details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                        {step.label}
                        {isResolved && (
                          <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border
                            ${isFlagged ? 'text-rose-400 border-rose-500/10 bg-rose-500/5' : 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5'}
                          `}>
                            {statusText}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Investigation Details & Artifact Evidence */}
        <div className="lg:col-span-5 space-y-6">

          {/* Audit Summary Panel */}
          <div className="surface p-6 border border-white/[0.04]">
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              {riskLevel ? (
                <RiskBadge level={riskLevel} size="large" />
              ) : (
                <span className="inline-flex items-center gap-2 font-medium tracking-wide border rounded-full text-xs px-4 py-1.5 border-blue-500/20 bg-blue-500/5 text-blue-400 animate-pulse">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-blue-400" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                  <span className="font-semibold uppercase tracking-wider text-[10px]">ANALYZING THREAT</span>
                </span>
              )}
              {scamCategory && scamCategory !== 'Unknown' && (
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                  {scamCategory}
                </span>
              )}
              {languageDetected && languageDetected !== 'English' && (
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                  🌐 {languageDetected}
                </span>
              )}
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" />
              Summary of Artifact Audit
            </h3>
            
            {!investigationSummary ? (
              <div className="space-y-2.5 bg-white/[0.01] border border-white/[0.03] p-4 rounded-xl animate-pulse">
                <div className="h-3 w-full bg-white/5 rounded" />
                <div className="h-3 w-5/6 bg-white/5 rounded" />
                <div className="h-3 w-4/6 bg-white/5 rounded" />
              </div>
            ) : (
              <p className="text-sm text-slate-300 leading-relaxed font-medium bg-white/[0.01] border border-white/[0.03] p-4 rounded-xl">
                {investigationSummary}
              </p>
            )}
            
            {reportId && (
              <p className="text-[10px] text-slate-600 mt-3 font-mono">Telemetry ID: {reportId}</p>
            )}
          </div>

          {/* Extracted Evidence Chips */}
          {extractedEntities && Object.values(extractedEntities).some(v => v && (typeof v === 'string' ? v : v.length > 0)) ? (
            <div className="surface p-6 border border-white/[0.04]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                Extracted Intelligence
              </h3>
              <div className="flex flex-wrap gap-2.5">
                <EntityChip icon={Building} label="Company" value={extractedEntities.companyName} />
                <EntityChip icon={Globe} label="Target Domain" value={extractedEntities.domain} />
                <EntityChip icon={User} label="Identified Name" value={extractedEntities.recruiterName} />
                <EntityChip icon={CreditCard} label="Requested Amount" value={extractedEntities.paymentAmount} />
                {extractedEntities.phoneNumbers?.map((p, i) => (
                  <EntityChip key={i} icon={Phone} label="Contact Phone" value={p} />
                ))}
                {extractedEntities.urls?.map((u, i) => (
                  <EntityChip key={i} icon={Link2} label="Network Link" value={u} />
                ))}
              </div>
            </div>
          ) : (
            <div className="surface p-6 border border-white/[0.04] animate-pulse">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                Extracted Intelligence
              </h3>
              <p className="text-[11px] text-slate-500">Parsing message content for threat indicators...</p>
            </div>
          )}

          {/* Red Flags Panel */}
          {hasTrustScore ? (
            redFlags && redFlags.length > 0 ? (
              <div className="surface p-6 border border-white/[0.04]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Flagged Vulnerabilities
                  <span className="ml-auto text-[10px] font-mono text-slate-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                    {redFlags.length} Anomalies
                  </span>
                </h3>
                <ul className="space-y-2.5">
                  {redFlags.map((flag, i) => {
                    const Icon = getFlagIcon(flag)
                    const isFirst = i === 0 && flag.includes('fast-track')
                    return (
                      <li
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-300
                          ${isFirst
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : 'bg-white/[0.01] border-white/[0.03] hover:border-white/10 hover:bg-white/[0.02]'
                          }`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isFirst ? 'text-rose-400' : 'text-amber-500'}`} />
                        <span className="text-xs text-slate-300 leading-relaxed font-semibold">{flag}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : (
              <div className="surface p-6 border border-white/[0.04]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-emerald-500" />
                  Flagged Vulnerabilities
                </h3>
                <p className="text-xs text-emerald-400 font-medium">No severe anomalies detected in communication channels.</p>
              </div>
            )
          ) : (
            <div className="surface p-6 border border-white/[0.04] animate-pulse">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                Flagged Vulnerabilities
              </h3>
              <p className="text-[11px] text-slate-500">Waiting for trust metrics resolution...</p>
            </div>
          )}

        </div>

      </div>

      {/* Recommended Action Plan (Action Card) */}
      {recommendedActions && recommendedActions.length > 0 ? (
        <ActionCard actions={recommendedActions} isFastTrack={isFastTrack} />
      ) : (
        <div className="surface p-6 border border-white/[0.04] animate-pulse">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Recommended Action Plan
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">Suggested counter-scam steps based on AI analysis</p>
          <div className="space-y-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/[0.03]">
                <div className="w-7 h-7 bg-white/5 rounded-lg" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-2 w-24 bg-white/5 rounded" />
                  <div className="h-3 w-5/6 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Database Pattern Matching Details */}
      {patternMatch ? (
        <PatternMatch patternMatch={patternMatch} />
      ) : (
        <div className="surface p-6 border border-white/[0.04] animate-pulse">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 bg-white/5 rounded-lg" />
            <div>
              <div className="h-3 w-32 bg-white/5 rounded" />
              <div className="h-2 w-48 bg-white/5 rounded mt-1.5" />
            </div>
          </div>
          <div className="h-10 bg-white/[0.01] border border-white/[0.03] rounded-xl" />
        </div>
      )}

    </div>
  )
}

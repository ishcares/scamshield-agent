import { ShieldAlert, Search, ExternalLink, ArrowRight } from 'lucide-react'

const ACTION_ICONS = [ShieldAlert, Search, ExternalLink]
const ACTION_LABELS = ['Primary Protocol', 'Secondary Verification', 'Incident Reporting']
const ACTION_COLORS = ['#ef4444', '#3b82f6', '#8b5cf6']

function highlightCybercrime(text) {
  if (!text) return text
  return text.split(/(cybercrime\.gov\.in|1930)/gi).map((part, i) =>
    /cybercrime\.gov\.in|1930/i.test(part) ? (
      <a
        key={i}
        href={/cybercrime\.gov\.in/i.test(part) ? 'https://cybercrime.gov.in' : 'tel:1930'}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 font-semibold hover:text-blue-300 transition-colors underline underline-offset-4 decoration-blue-400/30"
      >
        {part}
      </a>
    ) : part
  )
}

export default function ActionCard({ actions = [], isFastTrack = false }) {
  const safeActions = Array.isArray(actions) ? actions.slice(0, 3) : []

  return (
    <div className="surface p-6 border border-white/[0.04] transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Recommended Action Plan
          </h3>
          <p className="text-[11px] text-slate-500">Suggested counter-scam steps based on AI analysis</p>
        </div>
        {isFastTrack && (
          <span className="text-[10px] font-bold tracking-wider uppercase text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 animate-pulse">
            ⚡ Fast-Track
          </span>
        )}
      </div>

      <div className="space-y-3.5">
        {safeActions.map((action, i) => {
          const Icon = ACTION_ICONS[i] || ShieldAlert
          const label = ACTION_LABELS[i] || `Protocol ${i + 1}`
          const color = ACTION_COLORS[i] || '#3b82f6'

          return (
            <div
              key={i}
              className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/5 hover:bg-white/[0.02] transition-all duration-300 group"
            >
              <div className="flex-shrink-0 flex flex-col items-center">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold border"
                  style={{
                    backgroundColor: `${color}0c`,
                    borderColor: `${color}25`,
                    color,
                  }}
                >
                  0{i + 1}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  <p className="text-[11px] font-bold tracking-wider uppercase" style={{ color }}>
                    {label}
                  </p>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  {highlightCybercrime(action)}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all self-center" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

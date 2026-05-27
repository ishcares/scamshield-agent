import { ShieldAlert, Sparkles, Fingerprint } from 'lucide-react'

export default function PatternMatch({ patternMatch }) {
  if (!patternMatch) return null

  const { matched, detail, confidence } = patternMatch
  const confidencePct = Math.round(confidence || 0)

  return (
    <div
      className={`surface p-6 border transition-all duration-300 ${
        matched
          ? 'border-rose-500/20 bg-gradient-to-br from-rose-500/[0.02] to-transparent'
          : 'border-white/[0.04]'
      }`}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <Fingerprint className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pattern Verification</h3>
            <p className="text-[11px] text-slate-500">Cross-referencing global threat signatures</p>
          </div>
        </div>
        {matched ? (
          <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold tracking-wider uppercase bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            Signature Match
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Unique Signature
          </div>
        )}
      </div>

      {/* Confidence Bar */}
      {matched && (
        <div className="mb-5 bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-slate-400 font-medium">Scam Pattern Similarity</span>
            <span className={`font-mono font-bold ${confidencePct >= 80 ? 'text-rose-400' : confidencePct >= 60 ? 'text-orange-400' : 'text-amber-400'}`}>
              {confidencePct}% Match
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${confidencePct}%`,
                background: confidencePct >= 80
                  ? 'linear-gradient(90deg, #f43f5e, #e11d48)'
                  : confidencePct >= 60
                  ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                  : 'linear-gradient(90deg, #3b82f6, #f59e0b)',
              }}
            />
          </div>
        </div>
      )}

      {/* Detail */}
      <div className="text-sm text-slate-300 leading-relaxed font-medium bg-white/[0.01] border border-white/[0.03] p-4 rounded-xl">
        {detail}
      </div>

      {matched && (
        <div className="mt-4 pt-4 border-t border-white/5 flex items-start gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 animate-pulse flex-shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            This communication structure mirrors active scam campaigns. Proceeding with caution or terminating contact is strongly recommended.
          </p>
        </div>
      )}

      {!matched && (
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          No matching threat profiles were found in our public registry. Note: New scam campaign layouts change rapidly; lack of match does not guarantee absolute safety.
        </p>
      )}
    </div>
  )
}

const RISK_CONFIG = {
  LOW: {
    label: 'Low Risk',
    dotColor: '#10b981', // Emerald green
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20 bg-emerald-500/5',
  },
  MEDIUM: {
    label: 'Moderate Risk',
    dotColor: '#f59e0b', // Amber
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/20 bg-amber-500/5',
  },
  HIGH: {
    label: 'High Risk',
    dotColor: '#f97316', // Orange
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/25 bg-orange-500/5',
  },
  CRITICAL: {
    label: 'Critical Risk',
    dotColor: '#ef4444', // Red
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/30 bg-rose-500/10',
    animate: 'animate-pulse',
  },
}

export default function RiskBadge({ level, size = 'default', showEmoji = false }) {
  const config = RISK_CONFIG[level] || RISK_CONFIG.MEDIUM
  const isLarge = size === 'large'
  const isCritical = level === 'CRITICAL'

  return (
    <span
      className={`
        inline-flex items-center gap-2 font-medium tracking-wide border rounded-full transition-all duration-300
        ${config.borderColor}
        ${isLarge ? 'text-xs px-4 py-1.5' : 'text-[11px] px-2.5 py-0.5'}
        ${config.animate || ''}
      `}
    >
      {/* Elegantly animated minimal status dot */}
      <span className="relative flex h-2 w-2">
        {isCritical && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: config.dotColor }} />
        )}
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ backgroundColor: config.dotColor }}
        />
      </span>
      <span className={`font-semibold ${config.textColor} uppercase tracking-wider text-[10px]`}>
        {config.label}
      </span>
    </span>
  )
}

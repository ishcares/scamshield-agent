import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { Radio, RefreshCw, Activity, Heart, ShieldAlert, Award, FileText, Globe } from 'lucide-react'
import RiskBadge from './RiskBadge'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function ScamFeed() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isOnline, setIsOnline] = useState(true)

  const fetchReports = useCallback(async (isManual = false) => {
    try {
      if (isManual) setLoading(true)
      setError(null)
      const res = await axios.get(`${API_URL}/api/reports/recent`)
      setReports(res.data.reports || [])
      setLastUpdated(new Date())
      setIsOnline(true)
    } catch (err) {
      console.error('[ScamFeed] Error:', err.message)
      setError('Could not connect to server')
      setIsOnline(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchReports(false), 30000)
    return () => clearInterval(interval)
  }, [fetchReports])

  const categoryIcon = (cat) => {
    if (!cat) return <Globe className="w-3.5 h-3.5 text-slate-400" />
    const c = cat.toLowerCase()
    if (c.includes('phishing')) return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
    if (c.includes('onboarding') || c.includes('fee')) return <Award className="w-3.5 h-3.5 text-amber-400" />
    if (c.includes('intern')) return <FileText className="w-3.5 h-3.5 text-blue-400" />
    if (c.includes('task') || c.includes('earning')) return <Activity className="w-3.5 h-3.5 text-purple-400" />
    if (c.includes('scholarship')) return <Award className="w-3.5 h-3.5 text-emerald-400" />
    if (c.includes('impersonat')) return <Heart className="w-3.5 h-3.5 text-rose-400" />
    return <Globe className="w-3.5 h-3.5 text-slate-400" />
  }

  return (
    <div className="surface flex flex-col h-full max-h-[calc(100vh-6rem)] overflow-hidden border border-white/[0.04]">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/5">
            <Radio className="w-4 h-4 text-blue-400" />
            {isOnline && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white">Community Ledger</h2>
            <p className="text-[10px] text-slate-500 font-mono">
              {lastUpdated
                ? `LIVE · UPDATED ${formatDistanceToNow(lastUpdated, { addSuffix: true }).toUpperCase()}`
                : 'SYNCHRONIZING...'}
            </p>
          </div>
        </div>
        <button
          id="scam-feed-refresh"
          onClick={() => fetchReports(true)}
          disabled={loading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50 border border-transparent hover:border-white/5"
          title="Refresh feed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats bar */}
      <div className="px-5 py-2.5 bg-white/[0.01] border-b border-white/[0.04] flex items-center gap-1.5 flex-shrink-0 text-[11px] font-medium text-slate-500">
        <Activity className="w-3.5 h-3.5 text-slate-600" />
        <span>
          {reports.length > 0 ? `${reports.length} global reports active` : '0 active signatures'}
        </span>
        {reports.filter(r => r.riskLevel === 'CRITICAL').length > 0 && (
          <span className="ml-auto text-[10px] text-rose-400 font-bold uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/15">
            {reports.filter(r => r.riskLevel === 'CRITICAL').length} Critical Threats
          </span>
        )}
      </div>

      {/* Feed list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-5 h-5 border border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-[11px] text-slate-500 font-mono">RETRIEVING TRUST SIGNAL NETWORK...</p>
          </div>
        )}

        {!loading && error && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <p className="text-sm text-slate-400 font-medium">Network Offline</p>
            <p className="text-[11px] text-slate-600 max-w-xs leading-relaxed">
              Unable to sync with regional trust data servers. Check local status.
            </p>
            <button
              onClick={() => fetchReports(true)}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold mt-1 transition-colors"
            >
              Force Sync
            </button>
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-lg text-slate-400">
              🛡️
            </div>
            <p className="text-xs text-slate-400 font-medium">No Incidents Reported</p>
            <p className="text-[11px] text-slate-600 max-w-[200px] leading-relaxed">
              Global registry is clean. Initiate a search scan to seed report data.
            </p>
          </div>
        )}

        {reports.map((report, i) => (
          <div
            key={report._id || i}
            className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] hover:bg-white/[0.02] transition-all duration-300 animate-fade-in-up group"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-white/5 border border-white/5">
                  {categoryIcon(report.scamCategory)}
                </div>
                <RiskBadge level={report.riskLevel} size="small" showEmoji={false} />
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {report.timestamp
                  ? formatDistanceToNow(new Date(report.timestamp), { addSuffix: true }).toUpperCase()
                  : '—'}
              </span>
            </div>

            {report.scamCategory && report.scamCategory !== 'Unknown' && (
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">
                {report.scamCategory}
              </p>
            )}

            <p className="text-xs text-slate-300 leading-relaxed font-medium line-clamp-2">
              {report.investigationSummary}
            </p>

            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/[0.03] text-[10px] text-slate-500 font-mono">
              <span className="uppercase tracking-wider">{report.source || 'text-scan'}</span>
              {report.isFastTrack && (
                <span className="text-rose-400 font-bold uppercase tracking-wider ml-auto">⚡ KNOWN PATTERN</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.04] flex-shrink-0 bg-white/[0.01]">
        <p className="text-center text-[10px] text-slate-600 font-mono tracking-wide uppercase">
          Autonomous Synchronization Enabled
        </p>
      </div>
    </div>
  )
}

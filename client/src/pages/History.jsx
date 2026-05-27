import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { formatDistanceToNow, format } from 'date-fns'
import { History, Filter, ChevronLeft, ChevronRight, RefreshCw, Search, FileText, Calendar, Terminal } from 'lucide-react'
import RiskBadge from '../components/RiskBadge'

const API_URL = import.meta.env.VITE_API_URL || ''

const RISK_FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export default function HistoryPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit: 15 }
      if (riskFilter !== 'ALL') params.riskLevel = riskFilter
      const res = await axios.get(`${API_URL}/api/reports`, { params })
      setReports(res.data.reports || [])
      setPagination(res.data.pagination || { total: 0, pages: 1 })
    } catch (err) {
      setError('Could not load reports. Is the server running?')
    } finally {
      setLoading(false)
    }
  }, [page, riskFilter])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  useEffect(() => {
    setPage(1)
  }, [riskFilter])

  return (
    <div className="max-w-6xl mx-auto px-6">
      
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-semibold tracking-wider text-xs uppercase mb-1">
            <History className="w-4 h-4" />
            Global Repository
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Trust Audit Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            {pagination.total > 0 ? `${pagination.total.toLocaleString()} threat signatures indexed in ledger` : 'Registry of audited suspicious communication metrics'}
          </p>
        </div>
        <button
          id="history-refresh"
          onClick={fetchReports}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 bg-white/5 text-slate-400
                     hover:text-white hover:border-white/10 hover:bg-white/[0.08] transition-all text-xs font-bold uppercase tracking-wider self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Synchronize Ledger</span>
        </button>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 mb-6 flex-wrap bg-white/[0.01] border border-white/[0.03] p-3 rounded-2xl">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mr-2">
          <Filter className="w-3.5 h-3.5 text-slate-600" />
          Audit Class:
        </span>
        {RISK_FILTERS.map((f) => (
          <button
            key={f}
            id={`filter-${f.toLowerCase()}`}
            onClick={() => setRiskFilter(f)}
            className={`text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-xl border transition-all duration-300 ${
              riskFilter === f
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.05)]'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Report list */}
        <div className="flex-1 min-w-0">
          {loading && (
            <div className="space-y-3.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="surface p-5 animate-pulse border border-white/[0.04]">
                  <div className="flex gap-4">
                    <div className="w-24 h-6 bg-white/5 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/5 rounded w-3/4" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="surface p-12 text-center border border-white/[0.04]">
              <Search className="w-10 h-10 text-slate-600 mx-auto mb-4" />
              <p className="text-sm font-semibold text-slate-400">{error}</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">Ensure local host server connection is operational and check connectivity protocols.</p>
            </div>
          )}

          {!loading && !error && reports.length === 0 && (
            <div className="surface p-16 text-center border border-white/[0.04]">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-4" />
              <p className="text-sm font-semibold text-slate-300">Ledger Log Empty</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                {riskFilter !== 'ALL' ? `No signatures corresponding to the ${riskFilter} index could be retrieved.` : 'Initiate communication threat logs to seed local repositories.'}
              </p>
            </div>
          )}

          {!loading && reports.length > 0 && (
            <div className="space-y-3.5">
              {reports.map((r) => (
                <button
                  key={r._id}
                  onClick={() => setSelected(selected?._id === r._id ? null : r)}
                  className={`w-full text-left surface p-5 transition-all duration-300 border
                    hover:border-white/10 hover:bg-white/[0.01] group
                    ${selected?._id === r._id ? 'border-blue-500/30 bg-blue-500/[0.02]' : 'border-white/[0.04]'}
                  `}
                >
                  <div className="flex items-start gap-4">
                    <RiskBadge level={r.riskLevel} size="small" showEmoji={false} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.scamCategory && r.scamCategory !== 'Unknown' && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded">{r.scamCategory}</span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono capitalize">• {r.source || 'text-scan'}</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-auto">
                          {r.timestamp
                            ? formatDistanceToNow(new Date(r.timestamp), { addSuffix: true }).toUpperCase()
                            : '—'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mt-2.5 leading-relaxed font-medium line-clamp-2">
                        {r.investigationSummary}
                      </p>
                      {r.redFlags && r.redFlags.length > 0 && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-3 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-slate-600" />
                          <span>{r.redFlags.length} Signature Anomalies flagged</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {selected?._id === r._id && r.redFlags && (
                    <div className="mt-4 pt-4 border-t border-white/[0.04] space-y-3">
                      <div className="space-y-2">
                        {r.redFlags.slice(0, 5).map((flag, i) => (
                          <div key={i} className="text-xs text-amber-400 font-semibold flex items-start gap-2 bg-amber-500/[0.02] border border-amber-500/10 p-2.5 rounded-xl">
                            <span>⚠</span>
                            <span>{flag}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-2 bg-white/[0.01] border border-white/[0.03] px-3.5 py-2 rounded-xl self-start">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        <span>AUDITED ON: {r.timestamp ? format(new Date(r.timestamp), 'PPpp').toUpperCase() : '—'}</span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                id="history-prev"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-white/5 bg-white/5 text-slate-400
                           hover:text-white hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed
                           transition-all text-xs font-bold uppercase tracking-wider"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
              <span className="text-xs text-slate-500 font-mono">
                PAGE {page} OF {pagination.pages}
              </span>
              <button
                id="history-next"
                onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                disabled={page === pagination.pages}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-white/5 bg-white/5 text-slate-400
                           hover:text-white hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed
                           transition-all text-xs font-bold uppercase tracking-wider"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * AgentStatusPanel.jsx
 * =====================
 * Fixed bottom-right status badge showing the live ADK agent pipeline health.
 * Calls /api/agent-status every 30s to show:
 *   - Google ADK: ACTIVE / DEGRADED
 *   - MongoDB MCP: CONNECTED / FALLBACK
 *   - Model in use
 *   - Pipeline step count
 *
 * This makes the multi-step agent architecture instantly visible to hackathon judges.
 */

import { useState, useEffect, useCallback } from 'react'
import { Shield, Database, Cpu, ChevronUp, ChevronDown, Wifi, WifiOff } from 'lucide-react'

const RAW_API_URL = import.meta.env.VITE_API_URL || ''
const API_URL = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL

export default function AgentStatusPanel() {
  const [status, setStatus] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [lastFetch, setLastFetch] = useState(null)
  const [error, setError] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/agent-status`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setStatus(data)
      setLastFetch(new Date())
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  // Fetch on mount and every 30s
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const mcpConnected = status?.mongodbMcpServer?.connected
  const mcpMode = status?.mongodbMcpServer?.mode || 'UNKNOWN'
  const model = status?.agentPipeline?.modelUsed || 'gemini-2.5-flash'
  const steps = status?.agentPipeline?.stepsCount || 6
  const framework = status?.agentPipeline?.framework || 'Google ADK'

  // Overall health
  const isHealthy = !error && status?.status === 'active'

  return (
    <div
      id="agent-status-panel"
      className="fixed bottom-5 right-5 z-50 select-none"
    >
      {/* Expanded detail panel */}
      {expanded && (
        <div className="mb-2 w-72 surface border border-white/[0.06] p-4 rounded-2xl shadow-2xl animate-fade-in-up">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">Agent Status</span>
            </div>
            {lastFetch && (
              <span className="text-[9px] text-slate-600 font-mono">
                {lastFetch.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          {/* Status rows */}
          <div className="space-y-3">

            {/* ADK Agent */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ADK Agent</p>
                  <p className="text-[9px] text-slate-600 font-mono">{framework}</p>
                </div>
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border ${
                isHealthy
                  ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                  : 'text-amber-400 border-amber-500/20 bg-amber-500/10'
              }`}>
                {isHealthy ? 'ACTIVE' : 'DEGRADED'}
              </span>
            </div>

            {/* MongoDB MCP */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MongoDB MCP</p>
                  <p className="text-[9px] text-slate-600 font-mono">Atlas Vector Search</p>
                </div>
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border ${
                mcpConnected
                  ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                  : 'text-amber-400 border-amber-500/20 bg-amber-500/10'
              }`}>
                {mcpConnected ? 'MCP LIVE' : 'FALLBACK'}
              </span>
            </div>

            {/* Model */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Model</p>
                  <p className="text-[9px] text-slate-600 font-mono">Vertex AI</p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-purple-400 font-mono bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-lg">
                {model}
              </span>
            </div>

            {/* Pipeline info */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex gap-1 flex-1">
                {Array.from({ length: steps }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-1 rounded-full bg-blue-500/30"
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
              <span className="text-[9px] text-slate-500 font-mono flex-shrink-0">{steps} steps</span>
            </div>

            {/* MCP mode detail */}
            <p className="text-[9px] text-slate-600 font-mono text-center pt-1">
              {mcpMode.replace(/_/g, ' ')}
            </p>

          </div>
        </div>
      )}

      {/* Collapsed pill badge */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-lg transition-all duration-300
          ${isHealthy
            ? 'bg-[#090d16]/90 border-white/[0.06] hover:border-emerald-500/20 backdrop-blur-md'
            : 'bg-[#090d16]/90 border-amber-500/20 backdrop-blur-md'
          }
        `}
        title="Agent Pipeline Status"
      >
        {/* Live indicator dot */}
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isHealthy ? 'bg-emerald-500 animate-pulse' : error ? 'bg-red-500' : 'bg-amber-500 animate-pulse'
        }`} />
        
        <Shield className="w-3 h-3 text-blue-400 flex-shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
          ADK Agent
        </span>

        {/* MCP badge */}
        <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
          mcpConnected
            ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
            : 'text-amber-400 border-amber-500/20 bg-amber-500/10'
        }`}>
          MCP {mcpConnected ? '●' : '○'}
        </span>

        {/* Connectivity indicator */}
        {error ? (
          <WifiOff className="w-3 h-3 text-rose-500" />
        ) : (
          <Wifi className="w-3 h-3 text-slate-600" />
        )}

        {expanded ? (
          <ChevronDown className="w-3 h-3 text-slate-500" />
        ) : (
          <ChevronUp className="w-3 h-3 text-slate-500" />
        )}
      </button>
    </div>
  )
}

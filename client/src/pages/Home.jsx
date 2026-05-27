import { useState, useRef } from 'react'
import axios from 'axios'
import { Shield, Sparkles, AlertOctagon, Terminal, Activity, HelpCircle } from 'lucide-react'
import UploadPanel from '../components/UploadPanel'
import InvestigationDashboard from '../components/InvestigationDashboard'
import ScamFeed from '../components/ScamFeed'

const RAW_API_URL = import.meta.env.VITE_API_URL || ''
const API_URL = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL

export default function Home() {
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const resultsRef = useRef(null)

  const handleAnalyze = async ({ text, file }) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      if (file) {
        formData.append('file', file)
      } else {
        formData.append('text', text)
      }

      const res = await axios.post(`${API_URL}/api/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // 60s for OCR + Gemini
      })

      setResult(res.data)

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        (err.code === 'ECONNABORTED' ? 'Request timed out. Please try again.' : null) ||
        'Investigation failed. Please check your connection and try again.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      
      {/* Hero section */}
      <div className="relative overflow-hidden mb-8 border-b border-white/[0.03] pb-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/[0.04] border border-blue-500/10 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Empowered by Gemini 1.5 Pro · Autonomous Trust Telemetry
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.1] max-w-3xl mx-auto">
            Democratizing scam intelligence with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">AI Precision</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mt-4 leading-relaxed font-medium">
            Analyze suspicious messages, payment links, corporate recruiters or upload WhatsApp screenshots. Get instant comprehensive investigative reporting.
          </p>

          {/* Clean minimal Stats metrics */}
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 mt-10">
            {[
              { label: 'Scam signatures', value: '1,500+ Registered' },
              { label: 'Multi-lingual capability', value: 'Hinglish Supported' },
              { label: 'Operational response', value: 'Instant (~8s)' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-xs font-bold text-white uppercase tracking-wider">{s.value}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main split grid layout */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel workspace: col-span-8 */}
          <div className="lg:col-span-8 space-y-6">
            
            <UploadPanel onAnalyze={handleAnalyze} isLoading={isLoading} />

            {/* Error messaging panel */}
            {error && (
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-rose-500/20 bg-rose-500/[0.02] text-rose-400 animate-fade-in-up">
                <AlertOctagon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">Investigation Failure</p>
                  <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Premium progressive loading placeholder */}
            {isLoading && (
              <div className="surface p-8 flex flex-col items-center justify-center gap-6 animate-fade-in-up text-center border border-white/[0.04]">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  {/* Glowing core */}
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center animate-pulse">
                    <Shield className="w-5 h-5 text-blue-400" />
                  </div>
                  {/* Rotating orbital */}
                  <div className="absolute inset-0 rounded-full border border-transparent border-t-blue-500 border-r-blue-500/30 animate-spin" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Compiling Trust Audit...</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Executing natural language audit parameters via Gemini 1.5 Pro</p>
                </div>
                
                {/* Visual telemetry scan log */}
                <div className="w-full max-w-xs bg-white/[0.01] border border-white/[0.03] rounded-xl p-4 text-left space-y-2.5 font-mono text-[10px] text-slate-500">
                  {[
                    'Initializing secure sandboxed auditor...',
                    'Auditing target communication parameters...',
                    'Analyzing domain authority & mail records...',
                    'Cross-referencing global similarity indexes...'
                  ].map((step, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 animate-pulse"
                      style={{ animationDelay: `${i * 300}ms` }}
                    >
                      <Activity className="w-3.5 h-3.5 text-blue-400/50" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dashboard audit results */}
            <div ref={resultsRef} className="pt-2">
              {result && !isLoading && <InvestigationDashboard result={result} />}
            </div>
          </div>

          {/* Right sidebar panel: col-span-4 */}
          <div className="lg:col-span-4 h-full">
            <div className="lg:sticky lg:top-24">
              <ScamFeed />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

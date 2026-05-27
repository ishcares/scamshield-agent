import { useState, useRef } from 'react'
import { Shield, Sparkles, AlertOctagon, Activity } from 'lucide-react'
import UploadPanel from '../components/UploadPanel'
import InvestigationDashboard from '../components/InvestigationDashboard'
import ScamFeed from '../components/ScamFeed'

const RAW_API_URL = import.meta.env.VITE_API_URL || ''
const API_URL = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL

export default function Home() {
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState('Executing natural language audit parameters via Gemini 1.5 Pro')
  const [loadingStep, setLoadingStep] = useState(0)
  const resultsRef = useRef(null)

  const handleAnalyze = async ({ text, file }) => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    setLoadingStep(0)
    setLoadingStatus('Running autonomous scam analysis via Gemini 1.5 Pro...')

    const formData = new FormData()
    if (file) {
      formData.append('file', file)
    } else {
      formData.append('text', text)
    }

    const executeRequest = async (attempt = 1) => {
      try {
        const response = await fetch(`${API_URL}/api/analyze`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const isServerWaking = response.status === 503 || response.status === 504;
          if (isServerWaking && attempt < 3) {
            setLoadingStatus(`Server waking up... retrying in 5s (Attempt ${attempt}/3)...`)
            await new Promise((resolve) => setTimeout(resolve, 5000))
            return await executeRequest(attempt + 1)
          }
          throw new Error(`Audit Gateway Error (HTTP ${response.status})`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let accumulatedResult = {}

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop()

          for (const line of lines) {
            if (!line.trim()) continue
            
            try {
              const parsed = JSON.parse(line)

              if (parsed.error) {
                throw new Error(parsed.error)
              }

              if (parsed.step !== undefined) {
                setLoadingStep(parsed.step)
                setLoadingStatus(parsed.status)

                // Accumulate dynamic values into result
                accumulatedResult = {
                  ...accumulatedResult,
                  ...parsed
                }
                setResult({ ...accumulatedResult })
              }
            } catch (jsonErr) {
              console.warn('[Stream Parsing Error]:', jsonErr.message)
            }
          }
        }

        // Scroll to results once complete
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)

      } catch (err) {
        const isNetworkErr = err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed to fetch');
        if (isNetworkErr && attempt < 3) {
          setLoadingStatus(`Server waking up... retrying in 5s (Attempt ${attempt}/3)...`)
          await new Promise((resolve) => setTimeout(resolve, 5000))
          return await executeRequest(attempt + 1)
        }
        throw err
      }
    }

    try {
      await executeRequest()
    } catch (err) {
      setError(err.message || 'Investigation failed. Please check your connection and try again.')
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
                  <p className="text-[11px] text-slate-500 mt-1">{loadingStatus}</p>
                </div>
                
                {/* 6-Step Agent Progress Indicators */}
                <div className="w-full max-w-sm bg-white/[0.01] border border-white/[0.03] rounded-2xl p-5 text-left space-y-3 font-sans text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 font-mono">Agent Operation Pipeline</div>
                  {[
                    'Step 1: Extracted entities (UPI, phone, domain, names)',
                    'Step 2: MongoDB ledger query & pattern vector matching',
                    'Step 3: Platform Trust Score calculation',
                    'Step 4: AI threat verdict & scam category audit',
                    'Step 5: Persisting telemetry logs to database',
                    'Step 6: Cybercrime helpline escalation mapping'
                  ].map((step, i) => {
                    const stepNum = i + 1;
                    const isCompleted = loadingStep > stepNum;
                    const isActive = loadingStep === stepNum;
                    
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 transition-all duration-300 ${
                          isCompleted ? 'text-emerald-400' : isActive ? 'text-blue-400 font-bold' : 'text-slate-600'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] font-bold transition-all
                          ${isCompleted 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : isActive 
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse' 
                            : 'bg-white/5 border-white/5 text-slate-600'
                          }
                        `}>
                          {isCompleted ? '✓' : stepNum}
                        </div>
                        <span className="flex-1 truncate">{step}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Dashboard audit results */}
            <div ref={resultsRef} className="pt-2">
              {result && (result.investigationSummary || result.extractedEntities) && <InvestigationDashboard result={result} isLoading={isLoading} />}
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

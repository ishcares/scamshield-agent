import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Shield, History, Home, AlertTriangle, Sparkles, Terminal } from 'lucide-react'
import ErrorBoundary from './components/ErrorBoundary'
import HomePage from './pages/Home'
import HistoryPage from './pages/History'

function Navbar() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isHistory = location.pathname === '/history'

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-[#090d16]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Premium Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/5 group-hover:border-blue-500/20 group-hover:bg-blue-500/[0.02] transition-all duration-300">
            <Shield className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
            <div className="absolute inset-0 bg-blue-400/5 rounded-xl blur-md group-hover:bg-blue-400/10 transition-all" />
          </div>
          <div className="flex items-center">
            <span className="text-sm font-bold tracking-widest text-slate-400 group-hover:text-white uppercase transition-colors">ScamShield</span>
            <span className="text-sm font-black tracking-widest text-blue-400 ml-1 uppercase">AI</span>
          </div>
          <span className="hidden sm:inline text-[9px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 tracking-wider">
            SANDBOX v1.2
          </span>
        </Link>

        {/* Navigation bar links */}
        <div className="flex items-center gap-1">
          <Link
            to="/"
            id="nav-home"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${
              isHome
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.05)]'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Investigate</span>
          </Link>
          <Link
            to="/history"
            id="nav-history"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${
              isHistory
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.05)]'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Ledger Logs</span>
          </Link>
        </div>

        {/* Live operational indicator */}
        <div className="hidden sm:flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Operational</span>
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="min-h-screen bg-[#090d16] relative overflow-hidden text-slate-200">
          
          {/* Global Ambient Glows & Noise Overlays */}
          <div className="noise-overlay" />
          <div className="ambient-blue -top-40 -left-40" />
          <div className="ambient-purple top-1/3 -right-40" />
          
          {/* Navbar */}
          <Navbar />
          
          {/* Main Workspace Frame */}
          <main className="pt-24 pb-12 relative z-10">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route
                path="*"
                element={
                  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
                    <AlertTriangle className="w-10 h-10 text-rose-400" />
                    <h1 className="text-xl font-bold uppercase tracking-wider text-white">404 — Sandbox Route Not Configured</h1>
                    <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                      The requested route path does not match any trust intelligence interface panels.
                    </p>
                    <Link to="/" className="btn-primary mt-2 text-xs uppercase font-bold tracking-wider py-2.5 px-5">
                      Return to Command Center
                    </Link>
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

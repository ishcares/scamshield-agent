import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
          <div className="glass-card p-10 max-w-lg w-full text-center animate-fade-in-up">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <AlertTriangle className="w-16 h-16 text-amber-400" />
                <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-2">
              An unexpected error occurred in the UI.
            </p>
            <p className="text-slate-500 text-xs font-mono mb-6 bg-slate-900 p-3 rounded-lg border border-white/5">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Shield, Upload, X, FileImage, Languages, AlertCircle, Sparkles, Terminal } from 'lucide-react'

const DEMO_SAMPLES = [
  {
    label: '🔴 Critical: Intern Onboarding Fee Scam',
    text: 'Congratulations! You have been selected for the Amazon India Summer Internship 2024. Please pay the onboarding fee of ₹1499 to confirm your seat. Send payment to UPI: hr.amazon.india@paytm. Your offer letter will be released after payment. Respond within 24 hours or your selection will be cancelled.',
  },
  {
    label: '🟠 High: Fake IT Corporate Job Offer',
    text: 'Dear Candidate, We are pleased to inform you that you have been shortlisted for Software Engineer position at Infosys Limited. Contact our HR at infosys.hiring@gmail.com. Please submit your documents and pay ₹500 registration fee via Google Pay to 9876543210.',
  },
  {
    label: '🟡 Medium: Suspicious Freelance Recruiter',
    text: 'Hi, I am Sarah from TechCorp Hiring. We found your profile on LinkedIn and feel you are a great fit for our Data Analyst role. Salary: 8-12 LPA. Please reply urgently as positions are filling fast. Interview scheduled for tomorrow.',
  },
]

export default function UploadPanel({ onAnalyze, isLoading }) {
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [isFocused, setIsFocused] = useState(false)

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) {
      setFile(accepted[0])
      const reader = new FileReader()
      reader.onload = () => setFilePreview(reader.result)
      reader.readAsDataURL(accepted[0])
      setText('')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: isLoading,
  })

  const clearFile = (e) => {
    e.stopPropagation()
    setFile(null)
    setFilePreview(null)
  }

  const handleSubmit = () => {
    if (!text.trim() && !file) return
    onAnalyze({ text: text.trim(), file })
  }

  const loadSample = (sample) => {
    setText(sample.text)
    setFile(null)
    setFilePreview(null)
  }

  const canSubmit = (text.trim().length >= 10 || file) && !isLoading

  return (
    <div className="surface p-8 border border-white/[0.04] relative overflow-hidden transition-all duration-300">
      
      {/* Background glow lines */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/[0.01] rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-semibold tracking-wider text-xs uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            AI Scam Intelligence
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Initiate Trust Protocol
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Audit domains, recruitment communication, screenshots, or transaction requests instantly.
          </p>
        </div>
        <div className="self-start md:self-center flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full">
          <Languages className="w-3.5 h-3.5 text-blue-400" />
          Hinglish & Multi-Lang Auditing
        </div>
      </div>

      {/* Perplexity-style command box */}
      <div
        className={`relative border rounded-2xl transition-all duration-300 bg-white/[0.01] p-3.5
          ${isFocused 
            ? 'border-blue-500/30 ring-1 ring-blue-500/10 bg-white/[0.02] shadow-[0_0_30px_rgba(59,130,246,0.05)]' 
            : 'border-white/[0.05] hover:border-white/10'
          }
          ${file ? 'border-blue-500/25 bg-blue-500/[0.01]' : ''}
        `}
      >
        {/* Upload preview or Input Area */}
        {filePreview ? (
          <div className="relative rounded-xl border border-white/5 bg-[#070b13]/80 p-4 mb-3">
            <img
              src={filePreview}
              alt="Uploaded screenshot"
              className="max-h-40 mx-auto rounded-lg object-contain border border-white/5"
            />
            <button
              id="clear-upload"
              onClick={clearFile}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:scale-105 transition-all"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center gap-2 mt-3">
              <FileImage className="w-3.5 h-3.5 text-blue-400" />
              <p className="text-xs text-blue-300 font-semibold truncate max-w-[200px]">{file.name}</p>
              <span className="text-[10px] text-slate-500 font-mono">
                ({(file.size / 1024).toFixed(0)} KB)
              </span>
            </div>
          </div>
        ) : (
          <textarea
            id="scam-text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isLoading}
            rows={5}
            placeholder="Paste raw messages, recruiter WhatsApp chat, unsolicited emails, or job details to run deep trust analysis..."
            className="w-full bg-transparent border-0 text-white placeholder-slate-500 text-sm focus:outline-none resize-none leading-relaxed font-sans"
          />
        )}

        {/* Action bar inside the command box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.04]">
          {/* File upload action */}
          <div
            {...getRootProps()}
            id="scam-dropzone"
            className={`flex items-center justify-center gap-2 border border-dashed rounded-xl px-4 py-2 cursor-pointer transition-all duration-200 text-xs font-semibold
              ${isDragActive
                ? 'border-blue-400/50 bg-blue-500/5 text-blue-300'
                : 'border-white/10 hover:border-white/20 text-slate-400 hover:text-slate-300'
              }
              ${isLoading ? 'opacity-40 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-4 h-4" />
            <span>{isDragActive ? 'Drop Screen...' : 'Attach Image Audit'}</span>
          </div>

          {/* Right actions: Char count + Action Button */}
          <div className="flex items-center gap-4 self-end sm:self-auto">
            {text && !file && (
              <span className="text-[10px] text-slate-500 font-mono font-medium">
                {text.length.toLocaleString()} / 15,000 chars
              </span>
            )}
            <button
              id="investigate-btn"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`btn-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200
                ${!canSubmit ? 'opacity-35 cursor-not-allowed' : ''}
              `}
            >
              {isLoading ? (
                <>
                  <Shield className="w-3.5 h-3.5 shield-pulse" />
                  <span>Auditing...</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Audit Signal</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Demo Scenario Pills Styled Elegantly Below */}
      <div className="mt-6 pt-5 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-3">
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
          <span>Select Audit Paradigm (Interactive Demo)</span>
        </div>
        <div className="flex flex-col gap-2">
          {DEMO_SAMPLES.map((s, i) => (
            <button
              key={i}
              id={`demo-sample-${i}`}
              onClick={() => loadSample(s)}
              disabled={isLoading}
              className="text-left text-xs px-4 py-3 rounded-xl border border-white/[0.03] text-slate-400 bg-white/[0.01]
                         hover:border-blue-500/20 hover:text-white hover:bg-blue-500/[0.02]
                         transition-all duration-200 disabled:opacity-40 flex items-center justify-between group font-medium"
            >
              <span>{s.label}</span>
              <span className="text-[10px] font-mono text-slate-600 group-hover:text-blue-400 transition-colors uppercase tracking-wider">LOAD PARADIGM →</span>
            </button>
          ))}
        </div>
      </div>

      {/* Privacy note */}
      {!file && !text && (
        <div className="flex items-start gap-2.5 mt-5 bg-white/[0.01] border border-white/[0.03] p-3.5 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-500" />
          <span className="text-[11px] text-slate-500 leading-relaxed font-medium">
            Trust protocol complies with confidential sandbox procedures. Submissions are processed locally and stored with secure sanitization parameters to prevent disclosure of personally identifiable factors.
          </span>
        </div>
      )}
    </div>
  )
}

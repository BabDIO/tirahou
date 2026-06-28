import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Shield, CheckCircle, XCircle, Search, GraduationCap, ArrowLeft, Calendar, User, FileText, ExternalLink } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { documentsApi } from '../../api'
import { formatDate } from '../../lib/utils'

export default function VerifyDocumentPage() {
  const { code } = useParams<{ code?: string }>()
  const navigate = useNavigate()
  const [inputCode, setInputCode] = useState(code ?? '')
  const [searchCode, setSearchCode] = useState(code ?? '')

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['verify-doc', searchCode],
    queryFn: () => documentsApi.verifyDocument(searchCode).then(r => r.data),
    enabled: !!searchCode,
    retry: false,
  })

  const handleSearch = () => {
    const trimmed = inputCode.trim().toUpperCase()
    if (trimmed) setSearchCode(trimmed)
  }

  const isValid = data?.valid === true
  const hasResult = !!data || isError

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 flex flex-col">
      {/* Grid pattern */}
      <div className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-lg tracking-tight">TIRAHOU</p>
              <p className="text-slate-500 text-[10px] tracking-wider uppercase">Plateforme Universitaire</p>
            </div>
          </button>
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-lg">

          {/* Title */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-white/[0.08] border border-white/[0.15] rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Shield className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">
              Vérification de document
            </h1>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              Entrez le code de vérification figurant sur le document pour confirmer son authenticité.
            </p>
          </div>

          {/* Search card */}
          <div className="bg-white/[0.06] border border-white/[0.12] rounded-3xl p-7 backdrop-blur-sm shadow-2xl">

            {/* Input */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Code de vérification
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.08] border border-white/[0.15] text-white placeholder:text-slate-600 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 font-mono text-sm uppercase tracking-widest"
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value.toUpperCase())}
                    placeholder="VER-XXXXXXXXXXXX"
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    spellCheck={false}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={!inputCode.trim() || isLoading}
                  className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed text-sm active:scale-95"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Vérifier
                </button>
              </div>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center gap-3 py-6">
                <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                <span className="text-slate-400 text-sm">Vérification en cours...</span>
              </div>
            )}

            {/* Valid result */}
            {!isLoading && isValid && data && (
              <div className="space-y-4" style={{ animation: 'slideUp 0.3s ease-out' }}>
                {/* Success banner */}
                <div className="flex items-center gap-4 p-5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-black text-emerald-400 text-lg">Document authentique ✓</p>
                    <p className="text-emerald-400/70 text-xs mt-0.5">
                      Ce document est valide et a été émis par TIRAHOU.
                    </p>
                  </div>
                </div>

                {/* Document details */}
                <div className="bg-white/[0.05] border border-white/[0.1] rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.08] bg-white/[0.03]">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Détails du document</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {[
                      { icon: FileText, label: 'Type de document', value: data.doc_type },
                      { icon: User,     label: 'Titulaire',         value: data.student },
                      { icon: Calendar, label: 'Émis le',           value: formatDate(data.generated_at ?? null) },
                      { icon: Shield,   label: 'Statut',            value: data.status },
                    ].filter(r => r.value).map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/[0.06] rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex-1 flex items-center justify-between gap-2">
                          <span className="text-slate-400 text-xs">{label}</span>
                          <span className="text-white text-sm font-semibold text-right">{value}</span>
                        </div>
                      </div>
                    ))}
                    {data.valid_until && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="flex-1 flex items-center justify-between gap-2">
                          <span className="text-slate-400 text-xs">Valide jusqu'au</span>
                          <span className="text-amber-400 text-sm font-semibold">{formatDate(data.valid_until)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Code display */}
                <div className="flex items-center justify-between p-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl">
                  <span className="text-slate-500 text-xs">Code de vérification</span>
                  <span className="font-mono text-xs text-slate-300 bg-white/[0.06] px-3 py-1 rounded-lg">{searchCode}</span>
                </div>
              </div>
            )}

            {/* Invalid result */}
            {!isLoading && hasResult && !isValid && (
              <div className="space-y-4" style={{ animation: 'slideUp 0.3s ease-out' }}>
                <div className="flex items-center gap-4 p-5 bg-red-500/10 border border-red-500/25 rounded-2xl">
                  <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <p className="font-black text-red-400 text-lg">Document introuvable ✗</p>
                    <p className="text-red-400/70 text-xs mt-0.5">
                      Ce code ne correspond à aucun document dans notre système.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl space-y-2">
                  <p className="text-slate-300 text-sm font-semibold">Causes possibles :</p>
                  <ul className="space-y-1.5">
                    {[
                      'Code incomplet ou mal saisi (vérifiez la casse)',
                      'Document annulé ou révoqué',
                      'Document émis par un autre établissement',
                    ].map(cause => (
                      <li key={cause} className="flex items-start gap-2 text-slate-400 text-xs">
                        <span className="text-red-400 font-bold flex-shrink-0 mt-0.5">→</span>
                        {cause}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => { setInputCode(''); setSearchCode('') }}
                  className="w-full py-3 border border-white/[0.15] text-slate-300 hover:text-white hover:border-white/30 font-semibold rounded-2xl transition-all text-sm">
                  Réessayer avec un autre code
                </button>
              </div>
            )}

            {/* Idle state */}
            {!searchCode && (
              <div className="text-center py-4">
                <p className="text-slate-600 text-xs">
                  Le code de vérification se trouve sur votre document officiel TIRAHOU (sous le QR code).
                </p>
              </div>
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-slate-700 text-xs mt-8 flex items-center justify-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Service de vérification public — TIRAHOU · Aucun compte requis
          </p>
        </div>
      </main>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

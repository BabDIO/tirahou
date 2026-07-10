import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Award, CheckCircle, XCircle, Search, GraduationCap, ArrowLeft, User, BookOpen, Calendar } from 'lucide-react'
import { admissionsApi } from '../../api'
import { formatDate } from '../../lib/utils'

interface AdmissionResult {
  application_number: string
  applicant_name: string
  program_name: string
  decision: string
  decision_display: string
  acceptance_deadline: string | null
  published_at: string
}

const DECISION_STYLE: Record<string, { icon: typeof CheckCircle; bg: string; border: string; text: string; title: string }> = {
  admis: { icon: CheckCircle, bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400', title: 'Félicitations, vous êtes admis(e) !' },
  admis_attente: { icon: CheckCircle, bg: 'bg-amber-500/10', border: 'border-amber-500/25', text: 'text-amber-400', title: 'Vous êtes sur liste d\'attente' },
  refuse: { icon: XCircle, bg: 'bg-red-500/10', border: 'border-red-500/25', text: 'text-red-400', title: 'Candidature non retenue' },
}

export default function VerifyAdmissionPage() {
  const navigate = useNavigate()
  const [inputNumber, setInputNumber] = useState('')
  const [searchNumber, setSearchNumber] = useState('')

  const { data, isLoading, isError } = useQuery<AdmissionResult>({
    queryKey: ['verify-admission', searchNumber],
    queryFn: () => admissionsApi.checkResult(searchNumber).then(r => r.data),
    enabled: !!searchNumber,
    retry: false,
  })

  const handleSearch = () => {
    const trimmed = inputNumber.trim().toUpperCase()
    if (trimmed) setSearchNumber(trimmed)
  }

  const hasResult = !!data || isError
  const style = data ? DECISION_STYLE[data.decision] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 flex flex-col">
      <div className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <header className="relative z-10 px-6 py-4 border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-lg tracking-tight">TIRAHOU</p>
              <p className="text-slate-500 text-[10px] tracking-wider uppercase">Plateforme Universitaire</p>
            </div>
          </button>
          <button onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Connexion
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-white/[0.08] border border-white/[0.15] rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Award className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">
              Résultats d'admission
            </h1>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              Entrez votre numéro de dossier de candidature pour consulter le résultat.
            </p>
          </div>

          <div className="bg-white/[0.06] border border-white/[0.12] rounded-3xl p-7 backdrop-blur-sm shadow-2xl">
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Numéro de dossier
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.08] border border-white/[0.15] text-white placeholder:text-slate-600 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 font-mono text-sm uppercase tracking-widest"
                    value={inputNumber}
                    onChange={e => setInputNumber(e.target.value.toUpperCase())}
                    placeholder="CAND-XXXXXXXX"
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    spellCheck={false}
                  />
                </div>
                <button onClick={handleSearch} disabled={!inputNumber.trim() || isLoading}
                  className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed text-sm active:scale-95">
                  {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                  Consulter
                </button>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center gap-3 py-6">
                <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                <span className="text-slate-400 text-sm">Recherche en cours...</span>
              </div>
            )}

            {!isLoading && data && style && (
              <div className="space-y-4" style={{ animation: 'slideUp 0.3s ease-out' }}>
                <div className={`flex items-center gap-4 p-5 ${style.bg} border ${style.border} rounded-2xl`}>
                  <div className={`w-12 h-12 ${style.bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                    <style.icon className={`w-6 h-6 ${style.text}`} />
                  </div>
                  <div>
                    <p className={`font-black ${style.text} text-lg`}>{style.title}</p>
                    <p className={`${style.text}/70 text-xs mt-0.5 opacity-70`}>{data.decision_display}</p>
                  </div>
                </div>

                <div className="bg-white/[0.05] border border-white/[0.1] rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.08] bg-white/[0.03]">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Détails du dossier</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {[
                      { icon: User, label: 'Candidat', value: data.applicant_name },
                      { icon: BookOpen, label: 'Programme', value: data.program_name },
                      { icon: Calendar, label: 'Publié le', value: formatDate(data.published_at) },
                    ].map(({ icon: Icon, label, value }) => (
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
                    {data.acceptance_deadline && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="flex-1 flex items-center justify-between gap-2">
                          <span className="text-slate-400 text-xs">Date limite de confirmation</span>
                          <span className="text-amber-400 text-sm font-semibold">{formatDate(data.acceptance_deadline)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isLoading && hasResult && !data && (
              <div className="space-y-4" style={{ animation: 'slideUp 0.3s ease-out' }}>
                <div className="flex items-center gap-4 p-5 bg-red-500/10 border border-red-500/25 rounded-2xl">
                  <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <p className="font-black text-red-400 text-lg">Résultat non disponible</p>
                    <p className="text-red-400/70 text-xs mt-0.5">
                      Ce numéro est introuvable ou le résultat n'a pas encore été publié.
                    </p>
                  </div>
                </div>
                <button onClick={() => { setInputNumber(''); setSearchNumber('') }}
                  className="w-full py-3 border border-white/[0.15] text-slate-300 hover:text-white hover:border-white/30 font-semibold rounded-2xl transition-all text-sm">
                  Réessayer avec un autre numéro
                </button>
              </div>
            )}

            {!searchNumber && (
              <div className="text-center py-4">
                <p className="text-slate-600 text-xs">
                  Le numéro de dossier vous a été communiqué lors du dépôt de votre candidature.
                </p>
              </div>
            )}
          </div>

          <p className="text-center text-slate-700 text-xs mt-8 flex items-center justify-center gap-2">
            <Award className="w-3.5 h-3.5" />
            Service de consultation public — TIRAHOU · Aucun compte requis
          </p>
        </div>
      </main>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

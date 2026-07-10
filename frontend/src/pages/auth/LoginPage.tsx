import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Mail, Lock, Eye, EyeOff, ArrowRight,
  GraduationCap, Users, BarChart3, BookOpen,
  CheckCircle, Sparkles, ChevronRight, ShieldCheck,
} from 'lucide-react'
import { authApi } from '../../api'
import { useAuthStore } from '../../store/authStore'

const schema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})
type FormData = z.infer<typeof schema>

const DEMO_ACCOUNTS = [
  { role: 'Super Admin',            email: 'admin@tirahou.edu',         password: 'Admin123!',  color: 'bg-red-500' },
  { role: 'Admin Scolarité',        email: 'scolarite@tirahou.edu',     password: 'Scolarite123!',   color: 'bg-blue-500' },
  { role: 'Admin Financier',        email: 'financier@tirahou.edu',     password: 'Financier123!',   color: 'bg-green-500' },
  { role: 'Resp. Pédagogique',      email: 'responsable@tirahou.edu',   password: 'Responsable123!',   color: 'bg-indigo-500' },
  { role: 'Bibliothécaire',         email: 'bibliothecaire@tirahou.edu',password: 'Biblio123!',   color: 'bg-amber-600' },
  { role: 'Enseignant',             email: 'enseignant@tirahou.edu',    password: 'Enseignant123!',   color: 'bg-cyan-500' },
  { role: 'Étudiant',               email: 'etudiant@tirahou.edu',      password: 'Etudiant123!',   color: 'bg-emerald-500' },
]

const FEATURES = [
  { icon: GraduationCap, label: 'Système LMD complet',   sub: 'Licence · Master · Doctorat' },
  { icon: BookOpen,      label: 'Campus virtuel intégré', sub: 'LMS + Classes virtuelles' },
  { icon: BarChart3,     label: 'Analytics & pilotage',   sub: 'Détection décrochage IA' },
  { icon: Users,         label: 'Multi-rôles & RBAC',     sub: '13 profils utilisateurs' },
]

function isTruthyFlag(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0 && isTruthyFlag(v[0])
  if (typeof v === 'string') return v.length > 0 && v.toLowerCase() !== 'false'
  return !!v
}

function extractDetailStr(body: Record<string, unknown> | undefined): string | undefined {
  const d = body?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && typeof d[0] === 'string') return d[0]
  return undefined
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [showDemo, setShowDemo] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState('')

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    if (mfaRequired && !mfaCode.trim()) {
      setServerError('Saisissez le code de votre application d\'authentification.')
      return
    }
    try {
      const res = await authApi.login(mfaRequired ? { ...data, mfa_code: mfaCode.trim() } : data)
      const { access, refresh, user } = res.data
      const { setAuth } = useAuthStore.getState()
      setAuth(user, access, refresh)
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as {
        isNetworkError?: boolean
        response?: { status?: number; data?: Record<string, unknown> }
      }
      if (e?.isNetworkError || !e?.response) {
        setServerError('Serveur inaccessible. Vérifiez que le backend est démarré.')
        return
      }
      const body = e.response?.data
      if (isTruthyFlag(body?.mfa_required)) {
        setMfaRequired(true)
        setServerError(extractDetailStr(body) ?? 'Code de double authentification requis.')
        return
      }
      if (isTruthyFlag(body?.account_locked)) {
        setServerError(extractDetailStr(body) ?? 'Compte verrouillé après plusieurs échecs. Contactez un administrateur.')
        return
      }
      const s = e.response?.status
      if (s === 401 || s === 400) {
        setServerError(mfaRequired ? 'Code invalide.' : 'Email ou mot de passe incorrect.')
      } else if (s === 429) {
        setServerError('Trop de tentatives. Patientez quelques minutes.')
      } else if (s === 403) {
        setServerError('Compte désactivé. Contactez l\'administrateur.')
      } else {
        const detail = extractDetailStr(body)
        const nonField = body?.non_field_errors
        const message = body?.message
        if (detail) setServerError(detail)
        else if (Array.isArray(nonField) && nonField.length) setServerError(String(nonField[0]))
        else if (typeof message === 'string') setServerError(message)
        else setServerError('Erreur inattendue.')
      }
    }
  }

  const fillDemo = (email: string, password: string) => {
    setValue('email', email); setValue('password', password); setShowDemo(false)
  }

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">

      {/* ── Panneau gauche — branding ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" style={{ animation: 'pulse 4s ease-in-out infinite' }} />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl" style={{ animation: 'pulse 6s ease-in-out infinite' }} />

        <div className="relative flex flex-col h-full p-12">
          {/* Logo TIRAHOU */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-2xl tracking-tight">TIRAHOU</p>
              <p className="text-blue-400/70 text-[10px] tracking-[0.2em] uppercase font-medium">Plateforme Universitaire</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-10">
            {/* Badge */}
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 text-xs font-semibold tracking-wide">Plateforme v1.0 · Opérationnelle</span>
              </div>

              <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
                Gérez votre<br />
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  université
                </span><br />
                entièrement.
              </h1>
              <p className="text-slate-400 mt-5 leading-relaxed text-base max-w-md">
                De la candidature à la diplomation — un seul système pour tous vos processus académiques,
                pédagogiques et financiers.
              </p>
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-start gap-3 p-4 bg-white/[0.04] border border-white/[0.07] rounded-2xl hover:bg-white/[0.07] transition-colors group">
                  <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                    <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold leading-tight">{label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 pt-6 border-t border-white/[0.07]">
              {[
                { value: '19', label: 'Modules' },
                { value: '525', label: 'Endpoints' },
                { value: '13', label: 'Rôles' },
                { value: '60+', label: 'Écrans' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-700 text-xs">© {new Date().getFullYear()} TIRAHOU — Tous droits réservés</p>
        </div>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-gray-50/50 relative">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <div className="relative w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-xl">TIRAHOU</p>
              <p className="text-gray-400 text-xs">Plateforme Universitaire</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Connexion</h2>
            <p className="text-gray-500 text-sm mt-1.5">Accédez à votre espace institutionnel TIRAHOU</p>
          </div>

          {/* Error */}
          {serverError && (
            <div className="mb-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
              <span className="text-red-500 font-black text-base flex-shrink-0">✕</span>
              <p>{serverError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="prenom.nom@tirahou.edu"
                  autoComplete="email"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border bg-white text-sm text-gray-900 placeholder:text-gray-300 outline-none transition-all shadow-sm
                    ${errors.email ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}`}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-red-600">⚠ {errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Mot de passe</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full pl-11 pr-12 py-3.5 rounded-2xl border bg-white text-sm text-gray-900 placeholder:text-gray-300 outline-none transition-all shadow-sm
                    ${errors.password ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}`}
                  {...register('password')}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-600">⚠ {errors.password.message}</p>}
            </div>

            {mfaRequired && (
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Code d'authentification</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus
                    placeholder="123456" maxLength={6}
                    value={mfaCode} onChange={e => setMfaCode(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm text-gray-900 tracking-[0.3em] font-semibold placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-normal outline-none transition-all shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">Ouvrez votre application d'authentification (Google Authenticator, Authy...)</p>
              </div>
            )}

            <button type="submit" disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 active:scale-[0.99] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed text-sm">
              {isSubmitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connexion...</>
              ) : (
                <>Se connecter <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Demo */}
          <div className="mt-5">
            <button onClick={() => setShowDemo(!showDemo)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-100 rounded-2xl hover:from-blue-100 hover:to-violet-100 transition-all">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">Comptes de démonstration</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-blue-400 transition-transform duration-200 ${showDemo ? 'rotate-90' : ''}`} />
            </button>

            {showDemo && (
              <div className="mt-2 p-3 bg-white border border-gray-100 rounded-2xl shadow-xl space-y-1 max-h-64 overflow-y-auto">
                {DEMO_ACCOUNTS.map(({ role, email, password, color }) => (
                  <button key={email} onClick={() => fillDemo(email, password)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group">
                    <div className={`w-7 h-7 ${color} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-white text-[10px] font-black">{role[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800">{role}</p>
                      <p className="text-[10px] text-gray-400 truncate">{email}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-gray-400 text-xs">
            <Lock className="w-3 h-3" />
            <span>Connexion sécurisée par JWT · HTTPS</span>
          </div>
        </div>
      </div>
    </div>
  )
}

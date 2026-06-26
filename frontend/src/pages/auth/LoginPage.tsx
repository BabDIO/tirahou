import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Mail, Lock, Eye, EyeOff, ArrowRight,
  GraduationCap, Users, BarChart3, BookOpen,
  CheckCircle, Sparkles, ChevronRight,
} from 'lucide-react'
import { authApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/axios'
import { Button } from '../../components/ui'

const schema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})
type FormData = z.infer<typeof schema>

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'admin@siguvh.edu', password: 'Admin@2024', color: 'bg-red-500' },
  { role: 'Admin Scolarité', email: 'scolarite@siguvh.edu', password: 'Test@2024', color: 'bg-blue-500' },
  { role: 'Admin Financier', email: 'financier@siguvh.edu', password: 'Test@2024', color: 'bg-green-500' },
  { role: 'Responsable Pédagogique', email: 'responsable@siguvh.edu', password: 'Test@2024', color: 'bg-indigo-500' },
  { role: 'Chef de département', email: 'chef.dept@siguvh.edu', password: 'Test@2024', color: 'bg-violet-500' },
  { role: 'Enseignant', email: 'teacher01@uvhci.edu', password: 'Test@2024', color: 'bg-cyan-500' },
  { role: 'Tuteur', email: 'tuteur@siguvh.edu', password: 'Test@2024', color: 'bg-sky-500' },
  { role: 'Bibliothécaire', email: 'bibliothecaire@siguvh.edu', password: 'Test@2024', color: 'bg-amber-600' },
  { role: 'Étudiant', email: 'etudiant@siguvh.edu', password: 'Test@2024', color: 'bg-emerald-500' },
  { role: 'Étudiant (données)', email: 'student025@uvhci.edu', password: 'Test@2024', color: 'bg-teal-500' },
  { role: 'Doctorant', email: 'doctorant@siguvh.edu', password: 'Test@2024', color: 'bg-fuchsia-600' },
]

const FEATURES = [
  { icon: GraduationCap, label: 'Gestion LMD complète', sub: 'Licence, Master, Doctorat' },
  { icon: BookOpen, label: 'Campus virtuel intégré', sub: 'LMS + Classes virtuelles' },
  { icon: BarChart3, label: 'Analytics & pilotage', sub: 'Détection décrochage IA' },
  { icon: Users, label: 'Multi-rôles & RBAC', sub: '13 profils utilisateurs' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [showDemo, setShowDemo] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await authApi.login(data)
      const { access, refresh } = res.data
      const { setAuth } = useAuthStore.getState()
      localStorage.setItem('access_token', access)
      const meRes = await api.get('/auth/me/')
      setAuth(meRes.data, access, refresh)
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as {
        isNetworkError?: boolean
        response?: { data?: { detail?: string; error?: string; message?: string } }
        message?: string
      }

      if (e?.isNetworkError || !e?.response) {
        setServerError(
          '⚠️ Serveur inaccessible. Vérifiez que le backend Django est démarré sur http://localhost:8000'
        )
        return
      }

      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        setServerError('Email ou mot de passe incorrect.')
      } else if (status === 429) {
        setServerError('Trop de tentatives. Veuillez patienter quelques minutes.')
      } else if (status === 403) {
        setServerError('Compte désactivé ou verrouillé. Contactez l\'administrateur.')
      } else {
        setServerError(
          e?.response?.data?.detail ??
          e?.response?.data?.message ??
          'Une erreur est survenue. Réessayez.'
        )
      }
    }
  }

  const fillDemo = (email: string, password: string) => {
    setValue('email', email)
    setValue('password', password)
    setShowDemo(false)
  }

  return (
    <div className="min-h-screen flex bg-slate-950 overflow-hidden">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-primary-950 to-violet-950" />
        <div className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-xl tracking-tight">SIGUVH</p>
              <p className="text-slate-500 text-[11px] tracking-widest uppercase">Université Virtuelle Hybride</p>
            </div>
          </div>

          {/* Main headline */}
          <div className="flex-1 flex flex-col justify-center space-y-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 text-xs font-semibold tracking-wide">Plateforme opérationnelle v1.0</span>
              </div>
              <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
                La plateforme<br />
                <span className="bg-gradient-to-r from-primary-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  universitaire
                </span><br />
                de demain.
              </h1>
              <p className="text-slate-400 mt-5 leading-relaxed text-base max-w-md">
                Gérez l'ensemble de votre université depuis une seule plateforme —
                académique, pédagogique, financier et analytique.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-start gap-3 p-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl hover:bg-white/[0.07] transition-colors group">
                  <div className="w-9 h-9 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary-500/30 transition-colors">
                    <Icon className="w-4 h-4 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold leading-tight">{label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 pt-6 border-t border-white/[0.08]">
              {[
                { value: '60+', label: 'Pages' },
                { value: '36', label: 'Endpoints API' },
                { value: '13', label: 'Rôles' },
                { value: '100%', label: 'CDC' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-slate-700 text-xs">
            © {new Date().getFullYear()} SIGUVH — Tous droits réservés
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white relative">
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <div className="relative w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-gray-900 text-xl">SIGUVH</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Connexion</h2>
            <p className="text-gray-400 text-sm mt-2">Accédez à votre espace institutionnel</p>
          </div>

          {/* Error */}
          {serverError && (
            <div className={`mb-6 flex items-start gap-3 p-4 rounded-2xl text-sm border ${
              serverError.includes('Serveur') || serverError.includes('inaccessible')
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex-shrink-0 mt-0.5">
                {serverError.includes('Serveur') || serverError.includes('inaccessible')
                  ? <span className="text-amber-600 font-bold text-base">⚠️</span>
                  : <span className="text-red-600 font-bold text-xs bg-red-100 w-5 h-5 rounded-full flex items-center justify-center">✕</span>
                }
              </div>
              <div>
                <p className="font-semibold">{serverError}</p>
                {(serverError.includes('Serveur') || serverError.includes('inaccessible')) && (
                  <p className="text-xs mt-1 opacity-80">
                    Commande : <code className="bg-amber-100 px-1 rounded">python manage.py runserver</code>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="votre@email.edu"
                  autoComplete="email"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm bg-gray-50 text-gray-900 placeholder:text-gray-400 outline-none transition-all
                    ${errors.email
                      ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-red-50'
                      : 'border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:bg-white'
                    }`}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <span>⚠</span> {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Mot de passe
                </label>
                <button type="button" className="text-xs text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full pl-11 pr-12 py-3.5 rounded-2xl border text-sm bg-gray-50 text-gray-900 placeholder:text-gray-400 outline-none transition-all
                    ${errors.password
                      ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-red-50'
                      : 'border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:bg-white'
                    }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <span>⚠</span> {errors.password.message}
                </p>
              )}
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:bg-primary-600 peer-checked:border-primary-600 transition-all" />
                <CheckCircle className="absolute inset-0 w-5 h-5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
              <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">Se souvenir de moi</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 active:scale-[0.99] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-gray-900/20 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6">
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-violet-50 border border-primary-100 rounded-2xl hover:from-primary-100 hover:to-violet-100 transition-all group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-semibold text-primary-700">Comptes de démonstration</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-primary-500 transition-transform ${showDemo ? 'rotate-90' : ''}`} />
            </button>

            {showDemo && (
              <div className="mt-2 p-3 bg-white border border-gray-100 rounded-2xl shadow-lg space-y-1.5 max-h-72 overflow-y-auto">
                {DEMO_ACCOUNTS.map(({ role, email, password, color }) => (
                  <button
                    key={email}
                    onClick={() => fillDemo(email, password)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className={`w-7 h-7 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-[10px] font-black">{role[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800">{role}</p>
                      <p className="text-[10px] text-gray-400 truncate">{email}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-center text-gray-400 text-xs mt-8 flex items-center justify-center gap-2">
            <Lock className="w-3 h-3" />
            Connexion sécurisée — JWT + HTTPS
          </p>
        </div>
      </div>
    </div>
  )
}

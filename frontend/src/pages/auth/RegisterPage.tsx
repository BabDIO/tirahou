import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, User as UserIcon, Phone,
  GraduationCap, FileText, Award, ShieldCheck,
} from 'lucide-react'
import { authApi } from '../../api'
import { useAuthStore } from '../../store/authStore'

const schema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Au moins 8 caractères'),
  password_confirm: z.string().min(1, 'Confirmation requise'),
}).refine((data) => data.password === data.password_confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['password_confirm'],
})
type FormData = z.infer<typeof schema>

const STEPS = [
  { icon: UserIcon, label: 'Créez votre compte', sub: 'Quelques informations de base' },
  { icon: FileText, label: 'Déposez votre candidature', sub: 'Choisissez un programme, joignez vos documents' },
  { icon: Award, label: 'Suivez la décision', sub: 'Recevez le résultat directement sur votre espace' },
]

function extractServerError(err: unknown): string {
  const e = err as { isNetworkError?: boolean; response?: { status?: number; data?: Record<string, unknown> } }
  if (e?.isNetworkError || !e?.response) return 'Serveur inaccessible. Réessayez plus tard.'
  const body = e.response?.data
  if (body && typeof body === 'object') {
    const detail = (body as Record<string, unknown>).detail ?? (body as Record<string, unknown>).message
    if (typeof detail === 'string') return detail
    // Erreurs de validation par champ (DRF) : { email: ["..."], password: ["..."] }
    for (const key of ['email', 'password', 'first_name', 'last_name', 'phone']) {
      const fieldErr = (body as Record<string, unknown>)[key]
      if (Array.isArray(fieldErr) && typeof fieldErr[0] === 'string') return fieldErr[0]
    }
  }
  return 'Erreur lors de la création du compte. Réessayez.'
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await authApi.register({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || undefined,
        password: data.password,
      })
      const { access, refresh, user } = res.data
      useAuthStore.getState().setAuth(user, access, refresh)
      navigate('/my-applications')
    } catch (err: unknown) {
      setServerError(extractServerError(err))
    }
  }

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">

      {/* ── Panneau gauche — branding ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" style={{ animation: 'pulse 4s ease-in-out infinite' }} />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl" style={{ animation: 'pulse 6s ease-in-out infinite' }} />

        <div className="relative flex flex-col h-full p-12">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-2xl tracking-tight">TIRAHOU</p>
              <p className="text-blue-400/70 text-[10px] tracking-[0.2em] uppercase font-medium">Plateforme Universitaire</p>
            </div>
          </Link>

          <div className="flex-1 flex flex-col justify-center space-y-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 text-xs font-semibold tracking-wide">Candidatures ouvertes</span>
              </div>

              <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
                Rejoignez<br />
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  TIRAHOU
                </span>
              </h1>
              <p className="text-slate-400 mt-5 leading-relaxed text-base max-w-md">
                Créez votre compte candidat, déposez votre dossier et suivez son instruction en ligne —
                sans vous déplacer.
              </p>
            </div>

            <div className="space-y-3">
              {STEPS.map(({ icon: Icon, label, sub }, i) => (
                <div key={label} className="flex items-start gap-3 p-4 bg-white/[0.04] border border-white/[0.07] rounded-2xl">
                  <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-300 text-sm font-black">
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-blue-400" />
                      <p className="text-white text-sm font-semibold leading-tight">{label}</p>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-700 text-xs">© {new Date().getFullYear()} TIRAHOU — Tous droits réservés</p>
        </div>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-gray-50/50 relative overflow-y-auto">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <div className="relative w-full max-w-md py-8">

          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-gray-900 dark:text-gray-50 text-xl">TIRAHOU</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs">Plateforme Universitaire</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900 dark:text-gray-50 tracking-tight">Créer un compte</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5">Pour déposer une candidature à TIRAHOU</p>
          </div>

          {serverError && (
            <div className="mb-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
              <span className="text-red-500 font-black text-base flex-shrink-0">✕</span>
              <p>{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Prénom</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <input
                    type="text" placeholder="Aïssata" autoComplete="given-name"
                    className={`w-full pl-11 pr-3 py-3.5 rounded-2xl border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-50 placeholder:text-gray-300 outline-none transition-all shadow-sm
                      ${errors.first_name ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-gray-200 dark:border-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}`}
                    {...register('first_name')}
                  />
                </div>
                {errors.first_name && <p className="mt-1.5 text-xs text-red-600">⚠ {errors.first_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Nom</label>
                <input
                  type="text" placeholder="Koné" autoComplete="family-name"
                  className={`w-full px-4 py-3.5 rounded-2xl border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-50 placeholder:text-gray-300 outline-none transition-all shadow-sm
                    ${errors.last_name ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-gray-200 dark:border-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}`}
                  {...register('last_name')}
                />
                {errors.last_name && <p className="mt-1.5 text-xs text-red-600">⚠ {errors.last_name.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  type="email" placeholder="prenom.nom@example.com" autoComplete="email"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-50 placeholder:text-gray-300 outline-none transition-all shadow-sm
                    ${errors.email ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-gray-200 dark:border-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}`}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-red-600">⚠ {errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Téléphone <span className="normal-case text-gray-400 font-medium">(optionnel)</span></label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  type="tel" placeholder="+223 7X XX XX XX" autoComplete="tel"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-50 placeholder:text-gray-300 outline-none transition-all shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register('phone')}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="8 caractères minimum" autoComplete="new-password"
                  className={`w-full pl-11 pr-12 py-3.5 rounded-2xl border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-50 placeholder:text-gray-300 outline-none transition-all shadow-sm
                    ${errors.password ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-gray-200 dark:border-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}`}
                  {...register('password')}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-600">⚠ {errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-50 placeholder:text-gray-300 outline-none transition-all shadow-sm
                    ${errors.password_confirm ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-gray-200 dark:border-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}`}
                  {...register('password_confirm')}
                />
              </div>
              {errors.password_confirm && <p className="mt-1.5 text-xs text-red-600">⚠ {errors.password_confirm.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 active:scale-[0.99] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed text-sm">
              {isSubmitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Création du compte...</>
              ) : (
                <>Créer mon compte <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Déjà un compte ? <Link to="/login" className="text-blue-600 font-semibold hover:underline">Se connecter</Link>
          </p>

          <div className="mt-8 flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-xs">
            <ShieldCheck className="w-3 h-3" />
            <span>Vos données sont protégées · JWT · HTTPS</span>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { CheckCircle, MessageSquare, User, Bell, Sparkles } from 'lucide-react'
import { Card } from '../../components/ui'
import { useAuthStore } from '../../store/authStore'

export default function SimpleDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-slate-300" />
            <span className="text-slate-300 text-sm font-medium">{greeting},</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{user?.full_name ?? 'Bienvenue'}</h1>
          <p className="text-slate-300 text-sm mt-1">
            Votre espace TIRAHOU — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <Card title="État de la session" subtitle="Connexion sécurisée">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            Connexion réussie
          </div>
          <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            Interface chargée
          </div>
        </div>
      </Card>

      <Card title="Accès rapide" subtitle="Fonctionnalités disponibles pour votre profil">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 text-left hover:bg-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-700/30 dark:hover:bg-blue-800/30 transition-colors"
          >
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Mon profil</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Informations personnelles</p>
          </button>
          <button
            onClick={() => navigate('/communication')}
            className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-xl p-4 text-left hover:bg-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 dark:border-rose-700/30 dark:hover:bg-rose-800/30 transition-colors"
          >
            <MessageSquare className="w-5 h-5 text-rose-600 dark:text-rose-400 mb-2" />
            <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">Communication</p>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">Messages & annonces</p>
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 text-left hover:bg-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 dark:border-amber-700/30 dark:hover:bg-amber-800/30 transition-colors"
          >
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2" />
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Notifications</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Suivre l'actualité</p>
          </button>
        </div>
      </Card>
    </div>
  )
}

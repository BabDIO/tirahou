import { useAuthStore } from '../../store/authStore'
import { BookOpen, Users, TrendingUp, Award, Sparkles } from 'lucide-react'
import { StatsCard, Card, Alert } from '../../components/ui'

export default function ResponsableDashboard() {
  const { user } = useAuthStore()
  
  return (
    <div className="space-y-6 p-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Espace Responsable Pédagogique</h1>
            <p className="text-purple-200">Bonjour, {user?.full_name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Programmes" value="12" icon={<BookOpen className="w-5 h-5" />} color="bg-purple-500" />
        <StatsCard title="Enseignants" value="87" icon={<Users className="w-5 h-5" />} color="bg-blue-500" />
        <StatsCard title="Étudiants" value="1,428" icon={<TrendingUp className="w-5 h-5" />} color="bg-green-500" />
        <StatsCard title="Moyenne" value="14.2/20" icon={<Award className="w-5 h-5" />} color="bg-amber-500" />
      </div>

      <Alert type="info">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <div>
            <p className="font-semibold text-purple-900">Dashboard Responsable Pédagogique</p>
            <p className="text-sm text-purple-700">
              Interface simplifiée pour le rôle responsable pédagogique.
            </p>
          </div>
        </div>
      </Alert>
    </div>
  )
}
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Award, Calendar, FileText, TrendingUp, Clock,
  Sparkles, Video, Briefcase, CreditCard,
} from 'lucide-react'
import { StatsCard, Card, Button, Spinner } from '../../components/ui'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/axios'

interface UpcomingClass {
  id: number | string
  name: string
  time: string
}

interface StudentStats {
  courses_count: number
  average: number
  credits: number
  total_credits: number
  attendance_rate: number
}

const STUDENT_STATS: StudentStats = {
  courses_count: 8,
  average: 13.6,
  credits: 42,
  total_credits: 60,
  attendance_rate: 91,
}

const UPCOMING_CLASSES: UpcomingClass[] = [
  { id: 1, name: 'Algorithmique avancée', time: "Aujourd'hui · 14h00" },
  { id: 2, name: 'Bases de données', time: 'Demain · 09h00' },
  { id: 3, name: 'Anglais technique', time: 'Demain · 11h30' },
]

export default function StudentDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => api.get('/student/dashboard/').then(r => r.data),
    initialData: STUDENT_STATS,
  })

  const { data: upcomingClasses } = useQuery({
    queryKey: ['upcoming-classes'],
    queryFn: () => api.get('/student/upcoming-classes/').then(r => r.data),
    initialData: UPCOMING_CLASSES,
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner text="Chargement de votre espace..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span className="text-emerald-200 text-sm font-medium">{greeting},</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>
            <p className="text-emerald-200 text-sm mt-1">
              Bienvenue sur votre espace personnel — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white/90 font-medium">Assiduité: {stats.attendance_rate}%</span>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Mes cours"
          value={stats.courses_count}
          icon={<BookOpen className="w-5 h-5" />}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          subtitle="Ce semestre"
          onClick={() => navigate('/student/courses')}
        />
        <StatsCard
          title="Moyenne générale"
          value={`${stats.average}/20`}
          icon={<Award className="w-5 h-5" />}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          subtitle="Session en cours"
          onClick={() => navigate('/my-grades')}
        />
        <StatsCard
          title="Crédits obtenus"
          value={`${stats.credits}/${stats.total_credits}`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          subtitle="Progression LMD"
          onClick={() => navigate('/my-enrollment')}
        />
        <StatsCard
          title="Assiduité"
          value={`${stats.attendance_rate}%`}
          icon={<Clock className="w-5 h-5" />}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
          subtitle="Taux de présence"
          onClick={() => navigate('/my-attendance-student')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Prochains cours" subtitle="Emploi du temps">
            <div className="space-y-3">
              {upcomingClasses?.map((c: UpcomingClass) => (
                <div key={c.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="w-11 h-11 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.time}</p>
                  </div>
                  <Button size="sm" onClick={() => navigate('/my-virtual-classes')}>
                    <Video className="w-3.5 h-3.5" /> Rejoindre
                  </Button>
                </div>
              ))}
              <button
                onClick={() => navigate('/my-schedule')}
                className="w-full text-center text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium py-2"
              >
                Voir mon emploi du temps →
              </button>
            </div>
          </Card>
        </div>

        <Card title="Actions rapides" subtitle="Mon espace">
          <div className="space-y-2">
            <button onClick={() => navigate('/my-grades')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left">
              <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Mes notes</span>
            </button>
            <button onClick={() => navigate('/my-schedule')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Mon emploi du temps</span>
            </button>
            <button onClick={() => navigate('/my-documents')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Mes documents</span>
            </button>
            <button onClick={() => navigate('/my-finance')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left">
              <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Mes paiements</span>
            </button>
            <button onClick={() => navigate('/my-internship')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left">
              <Briefcase className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Mon stage / mémoire</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

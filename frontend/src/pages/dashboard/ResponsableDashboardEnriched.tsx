import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Award, Users, BookOpen, TrendingUp, Sparkles,
  BarChart3, CheckCircle, AlertTriangle, Target,
  GraduationCap, FileText, Calendar, TrendingDown
} from 'lucide-react'
import { StatsCard, Card, Badge, Progress, Alert, Spinner } from '../../components/ui'
import { formatNumber, cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/axios'

// Données simulées pour démonstration
const RESPONSABLE_DATA = {
  programs: {
    total: 12,
    active: 10,
    by_type: [
      { type: 'Licence', count: 6 },
      { type: 'Master', count: 4 },
      { type: 'Doctorat', count: 2 },
    ]
  },
  academic: {
    students_total: 1428,
    teachers_total: 87,
    average_grade: 14.2,
    success_rate: 78.5
  },
  validation: {
    pending_grades: 245,
    pending_validation: 18,
    validated_this_month: 142,
    rejection_rate: 3.2
  },
  quality: {
    satisfaction_rate: 89.3,
    retention_rate: 92.8,
    dropout_risk: 5.4,
    improvement_target: '+15%'
  }
}

export default function ResponsableDashboardEnriched() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['responsable-dashboard'],
    queryFn: () => api.get('/responsable/dashboard/').then(r => r.data),
    initialData: RESPONSABLE_DATA
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner text="Chargement des données pédagogiques..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span className="text-purple-200 text-sm font-medium">{greeting},</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>
            <p className="text-purple-200 text-sm mt-1">
              Pilotage pédagogique TIRAHOU — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white/90 font-medium">Taux réussite: {dashboardData.academic.success_rate}%</span>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Programmes"
          value={dashboardData.programs.total}
          icon={<BookOpen className="w-5 h-5" />}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          subtitle={`${dashboardData.programs.active} actifs`}
          onClick={() => navigate('/responsable/programs')}
        />
        <StatsCard
          title="Étudiants"
          value={formatNumber(dashboardData.academic.students_total)}
          icon={<Users className="w-5 h-5" />}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          subtitle="Total inscriptions"
          onClick={() => navigate('/students')}
        />
        <StatsCard
          title="Moyenne générale"
          value={`${dashboardData.academic.average_grade}/20`}
          icon={<Award className="w-5 h-5" />}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
          subtitle="Session en cours"
          onClick={() => navigate('/evaluation')}
        />
        <StatsCard
          title="Taux réussite"
          value={`${dashboardData.academic.success_rate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          subtitle="Performance académique"
          onClick={() => navigate('/analytics')}
        />
      </div>

      {/* ── Middle Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Programs Overview */}
        <Card title="Types de programmes" subtitle="Répartition par niveau">
          <div className="space-y-4">
            {dashboardData.programs.by_type.map((program) => {
              const percentage = Math.round((program.count / dashboardData.programs.total) * 100)
              return (
                <div key={program.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{program.type}</span>
                    <span className="text-sm font-bold text-gray-900">{program.count} programmes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-purple-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600">{percentage}%</span>
                  </div>
                </div>
              )
            })}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Programmes actifs</span>
                <span className="text-lg font-bold text-gray-900">
                  {dashboardData.programs.active}/{dashboardData.programs.total}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Validation Status */}
        <Card title="Validation des notes" subtitle="État des travaux">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">En attente</p>
                <p className="text-lg font-bold text-amber-700">{dashboardData.validation.pending_validation}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xs text-emerald-600 uppercase tracking-wide mb-1">Validées</p>
                <p className="text-lg font-bold text-emerald-700">{dashboardData.validation.validated_this_month}</p>
              </div>
            </div>
            <Progress 
              value={Math.round((dashboardData.validation.validated_this_month / dashboardData.validation.pending_grades) * 100)} 
              label="Progression validation" 
              color="bg-emerald-500" 
              size="md" 
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Taux de rejet:</span>
              <span className="font-bold text-red-600">{dashboardData.validation.rejection_rate}%</span>
            </div>
          </div>
        </Card>

        {/* Quality Indicators */}
        <Card title="Indicateurs qualité" subtitle="Suivi pédagogique">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Satisfaction</p>
                  <p className="text-xs text-gray-500">Enquêtes étudiants</p>
                </div>
              </div>
              <Badge label={`${dashboardData.quality.satisfaction_rate}%`} className="badge-emerald" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Rétention</p>
                  <p className="text-xs text-gray-500">Taux maintien</p>
                </div>
              </div>
              <Badge label={`${dashboardData.quality.retention_rate}%`} className="badge-blue" />
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Risque décrochage</p>
                  <p className="text-xs text-gray-500">À surveiller</p>
                </div>
              </div>
              <Badge label={`${dashboardData.quality.dropout_risk}%`} className="badge-amber" />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Bottom Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending Actions */}
        <Card title="Actions en attente" subtitle="Requièrent votre attention">
          <div className="space-y-3">
            {[
              { action: 'Validation notes Master Data', program: 'Master Data Science', deadline: 'Demain', priority: 'haute' },
              { action: 'Révision programme Licence Info', program: 'Licence Informatique', deadline: '3 jours', priority: 'moyenne' },
              { action: 'Rapport qualité semestre', program: 'Tous programmes', deadline: '5 jours', priority: 'normale' },
              { action: 'Entretien enseignant vacataire', program: 'BTS Gestion', deadline: '1 semaine', priority: 'normale' },
            ].map((task, i) => (
              <div key={i} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                  task.priority === 'haute' ? 'bg-red-100 text-red-600' :
                  task.priority === 'moyenne' ? 'bg-amber-100 text-amber-600' :
                  'bg-blue-100 text-blue-600'
                )}>
                  {task.priority === 'haute' ? <AlertTriangle className="w-4 h-4" /> :
                   task.priority === 'moyenne' ? <Target className="w-4 h-4" /> :
                   <Calendar className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{task.action}</p>
                  <p className="text-xs text-gray-500">
                    {task.program} • Échéance: {task.deadline}
                  </p>
                </div>
                <Badge 
                  label={task.priority === 'haute' ? 'Haute' : 
                         task.priority === 'moyenne' ? 'Moyenne' : 'Normale'}
                  className={task.priority === 'haute' ? 'badge-red' :
                             task.priority === 'moyenne' ? 'badge-amber' : 'badge-blue'}
                  dot
                />
              </div>
            ))}
            <button 
              onClick={() => navigate('/responsable/programs')}
              className="w-full text-center text-sm text-purple-600 hover:text-purple-700 font-medium py-2"
            >
              Voir toutes les tâches →
            </button>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card title="Actions rapides" subtitle="Gestion pédagogique">
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate('/responsable/programs')}
              className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 text-left hover:bg-purple-100 transition-colors"
            >
              <BookOpen className="w-5 h-5 text-purple-600 mb-2" />
              <p className="text-sm font-semibold text-purple-900">Programmes</p>
              <p className="text-xs text-purple-700 mt-1">Pilotage pédagogique</p>
            </button>
            <button 
              onClick={() => navigate('/evaluation')}
              className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 text-left hover:bg-blue-100 transition-colors"
            >
              <Award className="w-5 h-5 text-blue-600 mb-2" />
              <p className="text-sm font-semibold text-blue-900">Validation</p>
              <p className="text-xs text-blue-700 mt-1">Notes et résultats</p>
            </button>
            <button 
              onClick={() => navigate('/teachers')}
              className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 text-left hover:bg-emerald-100 transition-colors"
            >
              <Users className="w-5 h-5 text-emerald-600 mb-2" />
              <p className="text-sm font-semibold text-emerald-900">Enseignants</p>
              <p className="text-xs text-emerald-700 mt-1">Gestion équipe</p>
            </button>
            <button 
              onClick={() => navigate('/analytics')}
              className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 text-left hover:bg-amber-100 transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-amber-600 mb-2" />
              <p className="text-sm font-semibold text-amber-900">Analytics</p>
              <p className="text-xs text-amber-700 mt-1">Indicateurs qualité</p>
            </button>
          </div>
        </Card>
      </div>

      {/* ── Improvement Goals ── */}
      <Card title="Objectifs d'amélioration" subtitle="Performance pédagogique">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900">Taux réussite</p>
                <p className="text-xs text-emerald-700">Objectif: {dashboardData.quality.improvement_target}</p>
              </div>
            </div>
            <Progress value={78} label="Actuel: 78%" color="bg-emerald-500" />
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Rétention</p>
                <p className="text-xs text-blue-700">Objectif: 95%+</p>
              </div>
            </div>
            <Progress value={92.8} label="Actuel: 92.8%" color="bg-blue-500" />
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-900">Satisfaction</p>
                <p className="text-xs text-purple-700">Objectif: 95%+</p>
              </div>
            </div>
            <Progress value={89.3} label="Actuel: 89.3%" color="bg-purple-500" />
          </div>
        </div>
      </Card>
    </div>
  )
}
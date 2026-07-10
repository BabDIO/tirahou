import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap, Users, CreditCard, BookOpen,
  TrendingUp, AlertTriangle, ArrowUpRight, Sparkles,
  BarChart3, FileText, Calendar, UserCheck,
  CheckCircle, XCircle, Clock, Building2
} from 'lucide-react'
import { StatsCard, Card, Badge, Progress, Alert, Spinner } from '../../components/ui'
import { formatCurrency, cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/axios'

// Types pour les données
interface ProgramStatus {
  name: string
  status: 'actif' | 'en_cours'
  students: number
}

interface SystemActivity {
  action: string
  user: string
  amount?: string
  course?: string
  time: string
  type: 'success' | 'finance' | 'academic' | 'document'
}

// Données simulées pour démonstration
const MOCK_DATA = {
  students: {
    total: 1428,
    by_status: [
      { status: 'Actif', count: 1250 },
      { status: 'En pause', count: 95 },
      { status: 'Diplômé', count: 83 },
    ],
    trend: 8.2
  },
  teachers: {
    total: 87,
    by_type: [
      { type: 'Permanent', count: 45 },
      { type: 'Vacataire', count: 32 },
      { type: 'Invité', count: 10 },
    ]
  },
  finance: {
    total_invoiced: 12500000,
    total_paid: 10850000,
    collection_rate: 86.8
  },
  academic: {
    programs: 12,
    courses: 245,
    active_classes: 187
  },
  system: {
    uptime: 99.8,
    active_sessions: 342,
    pending_tasks: 18
  }
}

const enrollmentTrend = [
  { month: 'Jan', inscrits: 120, objectif: 100 },
  { month: 'Fév', inscrits: 185, objectif: 150 },
  { month: 'Mar', inscrits: 210, objectif: 180 },
  { month: 'Avr', inscrits: 195, objectif: 200 },
  { month: 'Mai', inscrits: 240, objectif: 220 },
  { month: 'Juin', inscrits: 280, objectif: 250 },
]

export default function SuperAdminDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: systemStats, isLoading } = useQuery({
    queryKey: ['system-stats'],
    queryFn: () => api.get('/system/stats/').then(r => r.data),
    initialData: MOCK_DATA
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner text="Chargement des statistiques système..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-orange-600 to-amber-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -right-4 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span className="text-amber-200 text-sm font-medium">{greeting},</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{user?.full_name ?? 'Super Admin'}</h1>
            <p className="text-amber-200 text-sm mt-1">
              Vue d'ensemble complète du système TIRAHOU — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white/90 font-medium">Système: {systemStats.system?.uptime ?? 99.8}% uptime</span>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Étudiants"
          value={systemStats.students.total.toLocaleString()}
          icon={<GraduationCap className="w-5 h-5" />}
          color="bg-gradient-to-br from-primary-500 to-primary-600"
          trend={{ value: systemStats.students.trend, label: 'croissance' }}
          subtitle={`${systemStats.students.by_status?.[0]?.count ?? 0} actifs`}
          onClick={() => navigate('/students')}
        />
        <StatsCard
          title="Enseignants"
          value={systemStats.teachers.total}
          icon={<Users className="w-5 h-5" />}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          subtitle={`${systemStats.teachers.by_type?.[0]?.count ?? 0} permanents`}
          onClick={() => navigate('/teachers')}
        />
        <StatsCard
          title="Revenus"
          value={formatCurrency(systemStats.finance.total_paid)}
          icon={<CreditCard className="w-5 h-5" />}
          color="bg-gradient-to-br from-amber-500 to-orange-500"
          trend={{ value: systemStats.finance.collection_rate, label: '% collecté' }}
          subtitle={`${systemStats.finance.collection_rate}% taux de collecte`}
          onClick={() => navigate('/finance')}
        />
        <StatsCard
          title="Cours"
          value={systemStats.academic.courses}
          icon={<BookOpen className="w-5 h-5" />}
          color="bg-gradient-to-br from-violet-500 to-violet-600"
          subtitle={`${systemStats.academic.active_classes} actifs`}
          onClick={() => navigate('/lms')}
        />
      </div>

      {/* ── Middle Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Program Status */}
        <Card title="Programmes académiques" subtitle="12 programmes actifs">
          <div className="space-y-3">
            {[
              { name: 'Licence Informatique', status: 'actif' as const, students: 320 },
              { name: 'Master Data Science', status: 'actif' as const, students: 185 },
              { name: 'Doctorat IA', status: 'en_cours' as const, students: 42 },
              { name: 'BTS Gestion', status: 'actif' as const, students: 156 },
            ].map((program: ProgramStatus) => (
              <div key={program.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{program.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{program.students} étudiants</p>
                </div>
                <Badge 
                  label={program.status === 'actif' ? 'Actif' : 'En cours'}
                  className={program.status === 'actif' ? 'badge-green' : 'badge-blue'}
                  dot
                />
              </div>
            ))}
            <button 
              onClick={() => navigate('/programs')}
              className="w-full text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium py-2"
            >
              Voir tous les programmes →
            </button>
          </div>
        </Card>

        {/* Financial Summary */}
        <Card title="Résumé financier" subtitle="Année académique en cours">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-3">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Encaissé</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(systemStats.finance.total_paid)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Facturé</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(systemStats.finance.total_invoiced)}</p>
              </div>
            </div>
            <Progress 
              value={systemStats.finance.collection_rate} 
              label="Taux de collecte" 
              color="bg-emerald-500" 
              size="md" 
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Restant à collecter:</span>
              <span className="font-bold text-red-600 dark:text-red-400">
                {formatCurrency(systemStats.finance.total_invoiced - systemStats.finance.total_paid)}
              </span>
            </div>
          </div>
        </Card>

        {/* System Health */}
        <Card title="Santé du système" subtitle="Monitoring en temps réel">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Serveurs</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">3/3 opérationnels</p>
                </div>
              </div>
              <Badge label="100%" className="badge-green" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Uptime</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">30 derniers jours</p>
                </div>
              </div>
              <Badge label={`${systemStats.system?.uptime ?? 99.8}%`} className="badge-blue" />
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-100 dark:border-amber-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Tâches en attente</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Requiert attention</p>
                </div>
              </div>
              <Badge label={systemStats.system?.pending_tasks ?? 18} className="badge-amber" />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Bottom Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Activity */}
        <Card title="Activité récente" subtitle="Dernières 24 heures">
          <div className="space-y-3">
            {[
              { action: 'Nouvelle inscription', user: 'Étudiant DIARRA', time: '10:45', type: 'success' as const },
              { action: 'Paiement reçu', user: 'Famille KONE', amount: '450,000 FCFA', time: '09:22', type: 'finance' as const },
              { action: 'Cours créé', user: 'Prof. DIALLO', course: 'Algèbre linéaire', time: '14:18', type: 'academic' as const },
              { action: 'Document validé', user: 'Scolarité', document: 'Attestation', time: '16:05', type: 'document' as const },
            ].map((activity: SystemActivity, i) => (
              <div key={i} className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  activity.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300' :
                  activity.type === 'finance' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' :
                  activity.type === 'academic' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                )}>
                  {activity.type === 'success' ? <UserCheck className="w-4 h-4" /> :
                   activity.type === 'finance' ? <CreditCard className="w-4 h-4" /> :
                   activity.type === 'academic' ? <BookOpen className="w-4 h-4" /> :
                   <FileText className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{activity.action}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.user}
                    {activity.amount && ` • ${activity.amount}`}
                    {activity.course && ` • ${activity.course}`}
                  </p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{activity.time}</span>
              </div>
            ))}
            <button 
              onClick={() => navigate('/admin/audit')}
              className="w-full text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium py-2"
            >
              Voir le journal complet →
            </button>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card title="Actions rapides" subtitle="Gestion administrative">
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate('/admin/users')}
              className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 text-left hover:bg-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-700/30 dark:hover:bg-blue-800/30 transition-colors"
            >
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Gestion utilisateurs</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Créer/modifier des comptes</p>
            </button>
            <button 
              onClick={() => navigate('/admin/settings')}
              className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 text-left hover:bg-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 dark:border-gray-700/30 dark:hover:bg-gray-800/30 transition-colors"
            >
              <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400 mb-2" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">Paramètres système</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">Configurer la plateforme</p>
            </button>
            <button 
              onClick={() => navigate('/analytics')}
              className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 text-left hover:bg-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 dark:border-emerald-700/30 dark:hover:bg-emerald-800/30 transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Rapports analytiques</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">Visualiser les données</p>
            </button>
            <button 
              onClick={() => navigate('/admissions')}
              className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 text-left hover:bg-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 dark:border-purple-700/30 dark:hover:bg-purple-800/30 transition-colors"
            >
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">Suivi admissions</p>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">Statistiques inscriptions</p>
            </button>
          </div>
        </Card>
      </div>

      {/* ── Footer Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 dark:text-gray-400">Sessions actives</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{systemStats.system?.active_sessions ?? 342}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 dark:text-gray-400">Utilisateurs actifs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {((systemStats.students?.total || 0) + (systemStats.teachers?.total || 0)).toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 dark:text-gray-400">Documents générés</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">1,245</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 dark:text-gray-400">Taux satisfaction</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">94.2%</p>
        </div>
      </div>
    </div>
  )
}
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Users, FileText, TrendingUp, Sparkles,
  Library, AlertTriangle, CheckCircle, Clock, ArrowUpRight,
} from 'lucide-react'
import { StatsCard, Card, Badge, Alert, Spinner } from '../../components/ui'
import { formatNumber, cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/axios'

interface LoanEntry {
  student: string
  title: string
  date: string
  status: 'rendu' | 'en_cours' | 'en_retard'
}

interface LibraryData {
  catalog: {
    total_documents: number
    new_this_month: number
    categories: { name: string; count: number; color: string }[]
  }
  loans: {
    active: number
    overdue: number
    returned_this_month: number
    attendance_trend: number
  }
  recent_loans: LoanEntry[]
}

const EMPTY_DATA: LibraryData = {
  catalog: { total_documents: 0, new_this_month: 0, categories: [] },
  loans: { active: 0, overdue: 0, returned_this_month: 0, attendance_trend: 0 },
  recent_loans: [],
}

export default function BibliothecaireDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['library-dashboard'],
    queryFn: () => api.get('/library/dashboard/').then(r => r.data),
    initialData: EMPTY_DATA,
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner text="Chargement des données bibliothèque..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-600 via-orange-600 to-orange-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span className="text-amber-200 text-sm font-medium">{greeting},</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>
            <p className="text-amber-200 text-sm mt-1">
              Gestion du fonds documentaire — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white/90 font-medium">{data.loans.active} emprunts actifs</span>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Documents"
          value={formatNumber(data.catalog.total_documents)}
          icon={<BookOpen className="w-5 h-5" />}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
          subtitle={`+${data.catalog.new_this_month} ce mois`}
          onClick={() => navigate('/bibliothecaire')}
        />
        <StatsCard
          title="Emprunts actifs"
          value={formatNumber(data.loans.active)}
          icon={<Users className="w-5 h-5" />}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
          subtitle="En circulation"
          onClick={() => navigate('/bibliothecaire')}
        />
        <StatsCard
          title="Retours du mois"
          value={formatNumber(data.loans.returned_this_month)}
          icon={<FileText className="w-5 h-5" />}
          color="bg-gradient-to-br from-yellow-500 to-yellow-600"
          subtitle="Documents rendus"
          onClick={() => navigate('/bibliothecaire')}
        />
        <StatsCard
          title="Fréquentation"
          value={`+${data.loans.attendance_trend}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-gradient-to-br from-lime-500 to-lime-600"
          trend={{ value: data.loans.attendance_trend, label: 'ce mois' }}
          subtitle="Vs mois dernier"
        />
      </div>

      {/* ── Middle Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Catalog Breakdown */}
        <Card title="Répartition du catalogue" subtitle="Par catégorie" className="lg:col-span-2">
          <div className="space-y-4">
            <div className="space-y-3">
              {data.catalog.categories.map((cat: LibraryData['catalog']['categories'][number]) => {
                const percentage = data.catalog.total_documents ? Math.round((cat.count / data.catalog.total_documents) * 100) : 0
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-50">{formatNumber(cat.count)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', cat.color)} style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{percentage}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">Total catalogue</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-50">{formatNumber(data.catalog.total_documents)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Loan status ring */}
        <Card title="État des emprunts" subtitle="Vue d'ensemble">
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="45" fill="none" stroke="#f59e0b" strokeWidth="8"
                      strokeDasharray={`${(data.loans.active + data.loans.returned_this_month) ? (data.loans.active / (data.loans.active + data.loans.returned_this_month)) * 282.7 : 0} 282.7`}
                      strokeLinecap="round" transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-gray-900 dark:text-gray-50">{data.loans.active}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">En cours</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Rendus ce mois</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{data.loans.returned_this_month}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">En retard</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{data.loans.overdue}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Bottom Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Loans */}
        <Card title="Emprunts récents" subtitle="Dernières 72 heures">
          <div className="space-y-3">
            {data.recent_loans.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Aucun emprunt récent.</p>
            )}
            {data.recent_loans.map((loan: LoanEntry, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    loan.status === 'rendu' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300' :
                    loan.status === 'en_cours' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' :
                    'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                  )}>
                    {loan.status === 'rendu' ? <CheckCircle className="w-4 h-4" /> :
                     loan.status === 'en_cours' ? <Clock className="w-4 h-4" /> :
                     <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{loan.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{loan.student} • {loan.date}</p>
                  </div>
                </div>
                <Badge
                  label={loan.status === 'rendu' ? 'Rendu' : loan.status === 'en_cours' ? 'En cours' : 'Retard'}
                  className={loan.status === 'rendu' ? 'badge-green' : loan.status === 'en_cours' ? 'badge-blue' : 'badge-red'}
                  dot
                />
              </div>
            ))}
            <button
              onClick={() => navigate('/bibliothecaire')}
              className="w-full text-center text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium py-2"
            >
              Voir tous les emprunts →
            </button>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card title="Actions rapides" subtitle="Gestion documentaire">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/bibliothecaire')}
              className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 text-left hover:bg-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 dark:border-amber-700/30 dark:hover:bg-amber-800/30 transition-colors"
            >
              <Library className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2" />
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Fonds documentaire</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Gérer le catalogue</p>
            </button>
            <button
              onClick={() => navigate('/library')}
              className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-xl p-4 text-left hover:bg-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 dark:border-cyan-700/30 dark:hover:bg-cyan-800/30 transition-colors"
            >
              <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400 mb-2" />
              <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-200">Catalogue public</p>
              <p className="text-xs text-cyan-700 dark:text-cyan-300 mt-1">Vue étudiants</p>
            </button>
            <button
              onClick={() => navigate('/documents')}
              className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-4 text-left hover:bg-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 dark:border-indigo-700/30 dark:hover:bg-indigo-800/30 transition-colors"
            >
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2" />
              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Documents étudiants</p>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">Pièces & dépôts</p>
            </button>
            <button
              onClick={() => navigate('/communication')}
              className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-xl p-4 text-left hover:bg-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 dark:border-rose-700/30 dark:hover:bg-rose-800/30 transition-colors"
            >
              <ArrowUpRight className="w-5 h-5 text-rose-600 dark:text-rose-400 mb-2" />
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">Relances</p>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">Retards d'emprunt</p>
            </button>
          </div>
        </Card>
      </div>

      {/* ── Alertes ── */}
      {data.loans.overdue > 0 && (
        <Alert type="warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">Emprunts en retard détectés</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {data.loans.overdue} emprunt(s) dépassent la date de retour et nécessitent une relance.
              </p>
            </div>
          </div>
        </Alert>
      )}
    </div>
  )
}

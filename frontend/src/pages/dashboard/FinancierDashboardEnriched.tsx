import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  CreditCard, TrendingUp, DollarSign, Sparkles,
  BarChart3, PieChart, AlertTriangle, CheckCircle,
  Users, FileText, Calendar, TrendingDown
} from 'lucide-react'
import { StatsCard, Card, Badge, Alert, Spinner } from '../../components/ui'
import { formatCurrency, cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/axios'

// Types pour les données
interface FinancialCategory {
  name: string
  amount: number
  color: string
}

interface RecentPayment {
  student: string
  amount: number
  date: string
  status: 'payee' | 'partiellement_payee' | 'en_retard'
}

interface FinancialData {
  summary: {
    total_invoiced: number
    total_paid: number
    collection_rate: number
    outstanding_amount: number
    invoices_count: number
    paid_invoices: number
  }
  trends: {
    monthly_revenue: string
    collection_efficiency: string
    overdue_invoices: number
    scholarships_approved: number
  }
  categories: FinancialCategory[]
  recent_payments: RecentPayment[]
}

// Données simulées pour démonstration
const FINANCIAL_DATA: FinancialData = {
  summary: {
    total_invoiced: 12500000,
    total_paid: 10850000,
    collection_rate: 86.8,
    outstanding_amount: 1650000,
    invoices_count: 1245,
    paid_invoices: 1082
  },
  trends: {
    monthly_revenue: '+8.5%',
    collection_efficiency: '+12.3%',
    overdue_invoices: -5.2,
    scholarships_approved: 42
  },
  categories: [
    { name: 'Frais inscription', amount: 4500000, color: 'bg-blue-500' },
    { name: 'Frais scolarité', amount: 6200000, color: 'bg-green-500' },
    { name: 'Services divers', amount: 1800000, color: 'bg-purple-500' },
  ],
  recent_payments: [
    { student: 'Moussa DIALLO', amount: 450000, date: 'Aujourd\'hui', status: 'payee' },
    { student: 'Fatou DIOP', amount: 320000, date: 'Hier', status: 'payee' },
    { student: 'Amadou KEITA', amount: 280000, date: 'Il y a 2 jours', status: 'partiellement_payee' },
    { student: 'Khadija TRAORE', amount: 150000, date: 'Il y a 3 jours', status: 'en_retard' },
  ]
}

export default function FinancierDashboardEnriched() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financial-dashboard'],
    queryFn: () => api.get('/finance/dashboard/').then(r => r.data),
    initialData: FINANCIAL_DATA
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner text="Chargement des données financières..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 rounded-2xl p-6 text-white">
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
              Gestion financière TIRAHOU — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white/90 font-medium">Collecte: {financialData.summary.collection_rate}%</span>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Revenus encaissés"
          value={formatCurrency(financialData.summary.total_paid)}
          icon={<CreditCard className="w-5 h-5" />}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          trend={{ value: financialData.trends.monthly_revenue, label: 'ce mois' }}
          subtitle="Sur total facturé"
          onClick={() => navigate('/finance')}
        />
        <StatsCard
          title="Factures émises"
          value={financialData.summary.invoices_count.toLocaleString()}
          icon={<DollarSign className="w-5 h-5" />}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          subtitle={`${financialData.summary.paid_invoices} payées`}
          onClick={() => navigate('/finance')}
        />
        <StatsCard
          title="Taux de collecte"
          value={`${financialData.summary.collection_rate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-gradient-to-br from-teal-500 to-teal-600"
          trend={{ value: financialData.trends.collection_efficiency, label: 'amélioration' }}
          subtitle="Performance"
          onClick={() => navigate('/finance')}
        />
        <StatsCard
          title="Bourses actives"
          value={financialData.trends.scholarships_approved}
          icon={<Users className="w-5 h-5" />}
          color="bg-gradient-to-br from-lime-500 to-lime-600"
          subtitle="Étudiants bénéficiaires"
          onClick={() => navigate('/finance/scholarships')}
        />
      </div>

      {/* ── Middle Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Breakdown */}
        <Card title="Répartition des revenus" subtitle="Par catégorie" className="lg:col-span-2">
          <div className="space-y-4">
            <div className="space-y-3">
              {financialData.categories.map((cat: FinancialCategory) => {
                const percentage = Math.round((cat.amount / financialData.summary.total_invoiced) * 100)
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-50">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${cat.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{percentage}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">Total facturé</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-50">
                  {formatCurrency(financialData.summary.total_invoiced)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Collection Progress */}
        <Card title="Performance de collecte" subtitle="Objectif: 90%">
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle 
                      cx="50" cy="50" r="45" 
                      fill="none" 
                      stroke="#e5e7eb" 
                      strokeWidth="8" 
                    />
                    <circle 
                      cx="50" cy="50" r="45" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="8" 
                      strokeDasharray={`${financialData.summary.collection_rate * 2.827} 282.7`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                      {financialData.summary.collection_rate}%
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Taux actuel</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Encaisse</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(financialData.summary.total_paid)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Restant</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(financialData.summary.outstanding_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Facturé</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(financialData.summary.total_invoiced)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Bottom Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Payments */}
        <Card title="Paiements récents" subtitle="Dernières 72 heures">
          <div className="space-y-3">
            {financialData.recent_payments.map((payment: RecentPayment) => (
              <div key={payment.student} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    payment.status === 'payee' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300' :
                    payment.status === 'partiellement_payee' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300' :
                    'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                  )}>
                    {payment.status === 'payee' ? <CheckCircle className="w-4 h-4" /> :
                     payment.status === 'partiellement_payee' ? <AlertTriangle className="w-4 h-4" /> :
                     <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{payment.student}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{payment.date} • {formatCurrency(payment.amount)}</p>
                  </div>
                </div>
                <Badge 
                  label={payment.status === 'payee' ? 'Payé' : 
                         payment.status === 'partiellement_payee' ? 'Partiel' : 'Retard'}
                  className={payment.status === 'payee' ? 'badge-green' :
                             payment.status === 'partiellement_payee' ? 'badge-amber' : 'badge-red'}
                  dot
                />
              </div>
            ))}
            <button 
              onClick={() => navigate('/finance')}
              className="w-full text-center text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium py-2"
            >
              Voir tous les paiements →
            </button>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card title="Actions rapides" subtitle="Gestion financière">
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate('/finance/journal')}
              className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 text-left hover:bg-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 dark:border-emerald-700/30 dark:hover:bg-emerald-800/30 transition-colors"
            >
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Journal de caisse</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">Saisie des opérations</p>
            </button>
            <button 
              onClick={() => navigate('/finance/scholarships')}
              className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 text-left hover:bg-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-700/30 dark:hover:bg-blue-800/30 transition-colors"
            >
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Bourses</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Gestion exonérations</p>
            </button>
            <button 
              onClick={() => navigate('/students')}
              className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 text-left hover:bg-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 dark:border-purple-700/30 dark:hover:bg-purple-800/30 transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">Rapports</p>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">Statistiques financières</p>
            </button>
            <button 
              onClick={() => navigate('/finance')}
              className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 text-left hover:bg-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 dark:border-amber-700/30 dark:hover:bg-amber-800/30 transition-colors"
            >
              <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2" />
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Échéances</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Relances paiements</p>
            </button>
          </div>
        </Card>
      </div>

      {/* ── Alertes ── */}
      {financialData.recent_payments.some((p: RecentPayment) => p.status === 'en_retard') && (
        <Alert type="warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">Paiements en retard détectés</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {financialData.recent_payments.filter((p: RecentPayment) => p.status === 'en_retard').length} paiement(s) nécessite(nt) une relance.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* ── Footer Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 dark:text-gray-400">Montant moyen</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {formatCurrency(Math.round(financialData.summary.total_paid / financialData.summary.paid_invoices))}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 dark:text-gray-400">Délai moyen</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">18 jours</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 dark:text-gray-400">Taux retard</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">3.2%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 dark:text-gray-400">Clients satisfaits</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">96.8%</p>
        </div>
      </div>
    </div>
  )
}
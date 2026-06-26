import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { CreditCard, TrendingUp, AlertCircle, CheckCircle, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { financeApi } from '../../api'
import { Card, Spinner, StatsCard, Badge, Progress, Alert } from '../../components/ui'
import { formatCurrency, formatDate, statusColor } from '../../lib/utils'

const monthlyData = [
  { month: 'Sep', encaisse: 1200000, facture: 2000000 },
  { month: 'Oct', encaisse: 3400000, facture: 4000000 },
  { month: 'Nov', encaisse: 5200000, facture: 6000000 },
  { month: 'Déc', encaisse: 6800000, facture: 8000000 },
  { month: 'Jan', encaisse: 7500000, facture: 9000000 },
  { month: 'Fév', encaisse: 8000000, facture: 10000000 },
]

export default function FinancierDashboard() {
  const { user } = useAuthStore()

  const { data: summary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => financeApi.getSummary().then(r => r.data),
  })

  const { data: invoices } = useQuery({
    queryKey: ['invoices-recent'],
    queryFn: () => financeApi.getInvoices({ page_size: 8, ordering: '-created_at' }).then(r => r.data),
  })

  const { data: payments } = useQuery({
    queryKey: ['payments-recent'],
    queryFn: () => financeApi.getPayments({ page_size: 5, ordering: '-paid_at' }).then(r => r.data),
  })

  const paidRate = summary?.total
    ? Math.round((summary.paid / summary.total) * 100) : 0

  const unpaid = invoices?.results?.filter((i: { status: string }) =>
    i.status === 'emise' || i.status === 'partiellement_payee'
  ) ?? []

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-green-200" />
              <span className="text-green-200 text-sm font-medium">Espace Finance</span>
            </div>
            <h1 className="text-2xl font-bold">{user?.full_name}</h1>
            <p className="text-green-200 text-sm mt-1">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-green-200 text-xs">Taux de collecte</p>
            <p className="text-4xl font-black">{paidRate}%</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Total facturé" value={formatCurrency(summary?.total ?? 0)}
          icon={<CreditCard className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Encaissé" value={formatCurrency(summary?.paid ?? 0)}
          icon={<CheckCircle className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          trend={{ value: paidRate, label: '% collecté' }} />
        <StatsCard title="Reste à collecter" value={formatCurrency((summary?.total ?? 0) - (summary?.paid ?? 0))}
          icon={<AlertCircle className="w-5 h-5" />} color="bg-gradient-to-br from-red-500 to-rose-500" />
        <StatsCard title="Factures impayées" value={unpaid.length}
          icon={<TrendingUp className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Évolution des encaissements" subtitle="Facturé vs Encaissé" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradFact" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradEnc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(v) => [formatCurrency(Number(v)), '']} />
              <Area type="monotone" dataKey="facture" name="Facturé" stroke="#3b82f6" strokeWidth={1.5}
                strokeDasharray="4 4" fill="url(#gradFact)" />
              <Area type="monotone" dataKey="encaisse" name="Encaissé" stroke="#10b981" strokeWidth={2.5}
                fill="url(#gradEnc)" dot={{ fill: '#10b981', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Taux de collecte" subtitle="Progression globale">
          <div className="space-y-5 pt-2">
            <div className="text-center">
              <p className="text-5xl font-black text-emerald-600">{paidRate}%</p>
              <p className="text-sm text-gray-400 mt-1">des frais collectés</p>
            </div>
            <Progress value={paidRate}
              color={paidRate >= 80 ? 'bg-emerald-500' : paidRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}
              size="lg" />
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Encaissé</p>
                <p className="text-sm font-bold text-emerald-600">{formatCurrency(summary?.paid ?? 0)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Reste</p>
                <p className="text-sm font-bold text-red-500">{formatCurrency((summary?.total ?? 0) - (summary?.paid ?? 0))}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Factures impayées */}
        <Card title="Factures en attente" subtitle="À relancer en priorité"
          action={unpaid.length > 0 ? <Badge label={`${unpaid.length} impayées`} className="badge-red" dot /> : undefined}>
          {unpaid.length === 0 ? (
            <Alert type="success">Toutes les factures sont à jour.</Alert>
          ) : (
            <div className="space-y-2">
              {unpaid.slice(0, 5).map((inv: { id: string; invoice_number: string; student_name: string; remaining_amount: number; status_display: string; status: string; due_date: string | null }) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{inv.student_name}</p>
                    <p className="text-xs text-gray-400">{inv.invoice_number} · Échéance: {formatDate(inv.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{formatCurrency(inv.remaining_amount)}</p>
                    <Badge label={inv.status_display} className={statusColor(inv.status)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Derniers paiements */}
        <Card title="Derniers paiements reçus" subtitle="Paiements récents">
          {!payments?.results?.length ? (
            <Alert type="info">Aucun paiement récent.</Alert>
          ) : (
            <div className="space-y-2">
              {payments.results.map((p: { id: string; amount: number; method_display: string; receipt_number: string; paid_at: string | null }) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-gray-400">{p.method_display} · {formatDate(p.paid_at)}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-gray-500">{p.receipt_number}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

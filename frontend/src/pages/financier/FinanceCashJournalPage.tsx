import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, TrendingUp, Download, Calendar } from 'lucide-react'
import { Card, StatsCard, Spinner, Empty, Alert, Badge } from '../../components/ui'
import { financeApi } from '../../api'
import { formatCurrency, formatDate } from '../../lib/utils'

const methodIcon: Record<string, string> = {
  mobile_money: '📱', carte_bancaire: '💳', virement: '🏦', caisse: '💵', cheque: '📄',
}

export default function FinanceCashJournalPage() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  const { data, isLoading } = useQuery({
    queryKey: ['cash-journal', startDate, endDate],
    queryFn: () => financeApi.getCashJournal({ start: startDate, end: endDate }).then(r => r.data),
  })

  const byMethod = (data?.payments ?? []).reduce((acc: Record<string, number>, p: { method: string; amount: number }) => {
    acc[p.method] = (acc[p.method] ?? 0) + p.amount
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Journal de Caisse</h1>
          <p className="text-gray-400 text-sm mt-0.5">Suivi des encaissements et rapprochement financier</p>
        </div>
        <button
          onClick={() => {
            const csv = ['Date,Étudiant,Montant,Mode,Reçu']
              .concat((data?.payments ?? []).map((p: { paid_at: string; amount: number; method: string; receipt_number: string }) =>
                `${formatDate(p.paid_at)},—,${p.amount},${p.method},${p.receipt_number}`
              )).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = `journal_${startDate}.csv`; a.click()
          }}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Exporter CSV
        </button>
      </div>

      {/* Date filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1">
          <label className="label">Date de début</label>
          <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="label">Date de fin</label>
          <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['Aujourd\'hui', 'Cette semaine', 'Ce mois'].map((label, i) => (
            <button key={label} onClick={() => {
              const now = new Date()
              if (i === 0) { setStartDate(now.toISOString().split('T')[0]); setEndDate(now.toISOString().split('T')[0]) }
              else if (i === 1) {
                const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1)
                setStartDate(mon.toISOString().split('T')[0]); setEndDate(now.toISOString().split('T')[0])
              } else {
                setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0])
                setEndDate(now.toISOString().split('T')[0])
              }
            }}
              className="px-3 py-2 text-xs font-medium bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors whitespace-nowrap">
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total encaissé" value={formatCurrency(data?.total ?? 0)}
          icon={<CreditCard className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Nombre de paiements" value={data?.count ?? 0}
          icon={<TrendingUp className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Période" value={startDate === endDate ? 'Journée' : 'Période'}
          icon={<Calendar className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600"
          subtitle={`${formatDate(startDate)} → ${formatDate(endDate)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* By method */}
        <Card title="Répartition par mode">
          {Object.keys(byMethod).length === 0 ? (
            <Alert type="info">Aucun paiement sur cette période.</Alert>
          ) : (
            <div className="space-y-3">
              {Object.entries(byMethod).map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    {methodIcon[method] ?? '💰'} {method.replace('_', ' ')}
                  </span>
                  <span className="font-bold text-sm text-gray-900">{formatCurrency(amount as number)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payments list */}
        <Card title="Détail des paiements" className="lg:col-span-2">
          {isLoading ? <Spinner /> : !data?.payments?.length ? (
            <Empty message="Aucun paiement sur cette période" icon={<CreditCard className="w-8 h-8" />} />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.payments.map((p: { id: string; amount: number; method: string; method_display: string; receipt_number: string; paid_at: string | null; status: string }) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{methodIcon[p.method] ?? '💰'}</span>
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

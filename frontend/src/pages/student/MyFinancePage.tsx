import { useQuery } from '@tanstack/react-query'
import { CreditCard, CheckCircle, Clock, Download, AlertTriangle, Calendar } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Alert, Progress } from '../../components/ui'
import { formatCurrency, formatDate, statusColor } from '../../lib/utils'
import api from '../../lib/axios'

interface Invoice {
  id: string
  invoice_number: string
  status: string
  status_display: string
  total_amount: number
  paid_amount: number
  discount_amount: number
  remaining_amount: number
  due_date: string | null
  academic_year: string
  items: { id: string; label: string; amount: number }[]
  payments: { id: string; amount: number; method_display: string; paid_at: string | null; receipt_number: string; status: string }[]
  installments: { id: string; number: number; amount: number; due_date: string; status: string }[]
}

export default function MyFinancePage() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: () => api.get('/invoices/').then(r => r.data),
  })

  const { data: scholarships } = useQuery({
    queryKey: ['my-scholarships'],
    queryFn: () => api.get('/scholarships/').then(r => r.data),
  })

  const allInvoices: Invoice[] = invoices?.results ?? []
  const schList = scholarships?.results ?? []
  const totalDue = allInvoices.reduce((s, inv) => s + Number(inv.remaining_amount), 0)
  const totalPaid = allInvoices.reduce((s, inv) => s + Number(inv.paid_amount), 0)
  const hasPending = allInvoices.some(inv => Number(inv.remaining_amount) > 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Mes Paiements</h1>
        <p className="text-gray-400 text-sm mt-0.5">Suivi de votre situation financière</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-primary-200" />
            <p className="text-primary-200 text-xs font-medium">Total facturé</p>
          </div>
          <p className="text-2xl font-black">{formatCurrency(allInvoices.reduce((s, i) => s + Number(i.total_amount), 0))}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-200" />
            <p className="text-emerald-200 text-xs font-medium">Montant payé</p>
          </div>
          <p className="text-2xl font-black">{formatCurrency(totalPaid)}</p>
        </div>
        <div className={`rounded-xl p-4 text-white ${totalDue > 0 ? 'bg-gradient-to-br from-red-500 to-rose-500' : 'bg-gradient-to-br from-emerald-500 to-emerald-600'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className={`w-4 h-4 ${totalDue > 0 ? 'text-red-200' : 'text-emerald-200'}`} />
            <p className={`text-xs font-medium ${totalDue > 0 ? 'text-red-200' : 'text-emerald-200'}`}>Reste à payer</p>
          </div>
          <p className="text-2xl font-black">{formatCurrency(totalDue)}</p>
        </div>
      </div>

      {hasPending && (
        <Alert type="warning" title="Paiement(s) en attente">
          Vous avez {formatCurrency(totalDue)} à régler. Rapprochez-vous du service financier ou effectuez votre paiement.
        </Alert>
      )}

      {isLoading ? <Spinner text="Chargement de vos factures..." /> : !allInvoices.length ? (
        <Empty icon={<CreditCard className="w-8 h-8" />} message="Aucune facture disponible"
          description="Vos factures apparaîtront après votre inscription. Contactez le service financier si nécessaire." />
      ) : (
        <div className="space-y-4">
          {allInvoices.map(inv => {
            const paidRate = Number(inv.total_amount) > 0 ? Math.round((Number(inv.paid_amount) / Number(inv.total_amount)) * 100) : 0
            return (
              <Card key={inv.id}>
                {/* Header facture */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-bold text-gray-900">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Année académique</p>
                  </div>
                  <Badge label={inv.status_display} className={statusColor(inv.status)} dot />
                </div>

                {/* Montants */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Total', value: formatCurrency(inv.total_amount) },
                    { label: 'Payé', value: formatCurrency(inv.paid_amount), green: true },
                    { label: 'Reste', value: formatCurrency(inv.remaining_amount), red: Number(inv.remaining_amount) > 0 },
                  ].map(({ label, value, green, red }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className={`font-bold text-sm ${green ? 'text-emerald-700' : red ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Barre de progression */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progression du paiement</span>
                    <span className="font-bold">{paidRate}%</span>
                  </div>
                  <Progress value={paidRate}
                    color={paidRate >= 100 ? 'bg-emerald-500' : paidRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}
                    size="md" />
                </div>

                {/* Lignes de détail */}
                {inv.items?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Détail</p>
                    <div className="space-y-1.5">
                      {inv.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{item.label}</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      {Number(inv.discount_amount) > 0 && (
                        <div className="flex items-center justify-between text-sm text-emerald-600">
                          <span>Remise / Bourse</span>
                          <span className="font-semibold">- {formatCurrency(inv.discount_amount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Historique paiements */}
                {inv.payments?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Paiements effectués</p>
                    <div className="space-y-2">
                      {inv.payments.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.amount)}</p>
                              <p className="text-xs text-gray-400">{p.method_display} · {formatDate(p.paid_at)}</p>
                            </div>
                          </div>
                          <span className="font-mono text-xs text-gray-500">{p.receipt_number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Échéancier */}
                {inv.installments?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Échéancier</p>
                    <div className="space-y-1.5">
                      {inv.installments.map(inst => (
                        <div key={inst.id} className={`flex items-center justify-between p-2.5 rounded-xl border ${
                          inst.status === 'paye' ? 'bg-emerald-50 border-emerald-100' :
                          inst.status === 'en_retard' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Calendar className={`w-4 h-4 ${
                              inst.status === 'paye' ? 'text-emerald-500' :
                              inst.status === 'en_retard' ? 'text-red-500' : 'text-gray-400'
                            }`} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Échéance {inst.number}</p>
                              <p className="text-xs text-gray-400">Au plus tard le {formatDate(inst.due_date)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{formatCurrency(inst.amount)}</p>
                            <Badge label={inst.status} className={statusColor(inst.status)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {inv.due_date && Number(inv.remaining_amount) > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Date d'échéance : <strong>{formatDate(inv.due_date)}</strong></span>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Bourses */}
      {schList.length > 0 && (
        <Card title="Mes Bourses & Exonérations">
          <div className="space-y-2">
            {schList.map((s: { id: string; type: string; amount: number; percentage: number; reason: string }) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.type}</p>
                  {s.reason && <p className="text-xs text-gray-400 mt-0.5">{s.reason}</p>}
                </div>
                <div className="text-right">
                  {Number(s.amount) > 0 && <p className="font-bold text-emerald-700">{formatCurrency(s.amount)}</p>}
                  {Number(s.percentage) > 0 && <p className="text-sm text-emerald-600">{s.percentage}%</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

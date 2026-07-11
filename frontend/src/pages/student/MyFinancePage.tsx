import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CreditCard, Clock, CheckCircle, Smartphone } from 'lucide-react'
import { Card, StatsCard, Badge, Progress, Modal, Button, Spinner, Empty } from '../../components/ui'
import { financeApi } from '../../api'
import { formatCurrency, formatDate, statusColor } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import type { Invoice } from '../../types'

const OPERATORS = [
  { value: 'OM', label: 'Orange Money' },
  { value: 'MOMO', label: 'MTN Mobile Money' },
  { value: 'MOOV', label: 'Moov Money' },
  { value: 'WAVE', label: 'Wave' },
]

export default function MyFinancePage() {
  const toast = useToast()
  const [payTarget, setPayTarget] = useState<Invoice | null>(null)
  const [phone, setPhone] = useState('')
  const [operator, setOperator] = useState('OM')

  const { data, isLoading } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: () => financeApi.getInvoices({ page_size: 100 }).then(r => r.data),
  })

  const payMut = useMutation({
    mutationFn: () => financeApi.payOnline(payTarget!.id, { phone, operator }),
    onSuccess: (res) => {
      const url = res.data.payment_url
      if (url) {
        toast.success('Redirection vers le paiement...')
        window.location.href = url
      }
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e?.response?.data?.error ?? 'Paiement en ligne indisponible — réglez en caisse.')
    },
  })

  const invoices: Invoice[] = data?.results ?? []
  const totalAmount = invoices.reduce((s, i) => s + Number(i.total_amount), 0)
  const paidAmount = invoices.reduce((s, i) => s + Number(i.paid_amount), 0)
  const remaining = totalAmount - paidAmount
  const percentPaid = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Ma situation financière</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Factures, paiements et échéances</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total facturé" value={formatCurrency(totalAmount)} icon={<CreditCard className="w-5 h-5" />} color="bg-blue-600" />
        <StatsCard title="Déjà payé" value={formatCurrency(paidAmount)} icon={<CheckCircle className="w-5 h-5" />} color="bg-emerald-600" />
        <StatsCard title="Reste à payer" value={formatCurrency(remaining)} icon={<Clock className="w-5 h-5" />} color="bg-amber-600" />
      </div>

      <Card title="Avancement des paiements">
        <Progress value={percentPaid} max={100} label="Progression" size="lg" color="bg-emerald-600" />
      </Card>

      <Card title="Mes factures" noPadding>
        {isLoading ? <Spinner text="Chargement..." /> : !invoices.length ? (
          <Empty message="Aucune facture" icon={<CreditCard className="w-8 h-8" />} />
        ) : (
          <div className="divide-y divide-gray-50">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between gap-3 p-4 flex-wrap">
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">{inv.invoice_number}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatCurrency(Number(inv.paid_amount))} / {formatCurrency(Number(inv.total_amount))} · Échéance {formatDate(inv.due_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={inv.status_display} className={statusColor(inv.status)} dot />
                  {inv.status !== 'payee' && inv.status !== 'annulee' && (
                    <Button size="sm" icon={<Smartphone className="w-3.5 h-3.5" />} onClick={() => setPayTarget(inv)}>
                      Payer en ligne
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="Paiement mobile money" subtitle={payTarget?.invoice_number} size="sm">
        {payTarget && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Montant restant</span>
              <span className="font-bold text-gray-900 dark:text-gray-50">{formatCurrency(Number(payTarget.remaining_amount))}</span>
            </div>
            <div>
              <label className="label">Opérateur</label>
              <div className="grid grid-cols-2 gap-2">
                {OPERATORS.map(op => (
                  <button key={op.value} type="button" onClick={() => setOperator(op.value)}
                    className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                      operator === op.value ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}>
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Numéro de téléphone *</label>
              <input className="input" placeholder="07 00 00 00 00" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <Button className="w-full" icon={<Smartphone className="w-4 h-4" />} loading={payMut.isPending}
              disabled={!phone.trim()} onClick={() => payMut.mutate()}>
              Lancer le paiement
            </Button>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Vous recevrez une demande de confirmation sur votre téléphone.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

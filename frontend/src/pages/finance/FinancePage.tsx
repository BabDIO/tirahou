import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Search, Plus, CreditCard, CheckCircle, Download, Gift, TrendingUp, AlertCircle, Calendar, Clock } from 'lucide-react'
import { financeApi } from '../../api'
import { Button, Input, Badge, Spinner, Empty, Pagination, Card, StatsCard, Modal, Progress, Alert } from '../../components/ui'
import { formatCurrency, formatDate, statusColor } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import type { Invoice, Installment } from '../../types'
import api from '../../lib/axios'

const methodIcons: Record<string, string> = {
  mobile_money: '📱', carte_bancaire: '💳', virement: '🏦', caisse: '💵', cheque: '📄',
}

export default function FinancePage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [installmentsInvoice, setInstallmentsInvoice] = useState<Invoice | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, search, statusFilter],
    queryFn: () => financeApi.getInvoices({ page, search, status: statusFilter || undefined }).then(r => r.data),
  })

  const { data: summary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => financeApi.getSummary().then(r => r.data),
  })

  const addPayment = useMutation({
    mutationFn: ({ id, amount, method }: { id: string; amount: number; method: string }) =>
      financeApi.addPayment(id, { amount, method }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      setSelected(null)
    },
  })

  const paidRate = summary?.total
    ? Math.round((summary.paid / summary.total) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Finance & Paiements</h1>
          <p className="text-gray-400 text-sm mt-0.5">{data?.count ?? 0} facture(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Gift className="w-4 h-4" />}
            onClick={() => setDiscountOpen(true)}>Bourse / Exonération</Button>
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>Nouvelle facture</Button>
        </div>
      </div>

      {/* KPI + collecte */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <StatsCard title="Total facturé" value={formatCurrency(summary?.total ?? 0)}
          icon={<CreditCard className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Total encaissé" value={formatCurrency(summary?.paid ?? 0)}
          icon={<CheckCircle className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          trend={{ value: paidRate, label: '% collecté' }} />
        <StatsCard title="Reste à collecter"
          value={formatCurrency((summary?.total ?? 0) - (summary?.paid ?? 0))}
          icon={<AlertCircle className="w-5 h-5" />} color="bg-gradient-to-br from-red-500 to-rose-500" />
        <Card className="flex flex-col justify-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Taux de collecte</p>
          <Progress value={paidRate} color={paidRate >= 80 ? 'bg-emerald-500' : paidRate >= 50 ? 'bg-amber-500' : 'bg-red-500'} size="lg" />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400">0%</span>
            <span className={`text-sm font-bold ${paidRate >= 80 ? 'text-emerald-600' : paidRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {paidRate}%
            </span>
            <span className="text-xs text-gray-400">100%</span>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par numéro, étudiant..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="input w-full sm:w-48">
            <option value="">Tous les statuts</option>
            <option value="emise">Émise</option>
            <option value="partiellement_payee">Partiellement payée</option>
            <option value="payee">Payée</option>
            <option value="annulee">Annulée</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card noPadding>
        {isLoading ? <Spinner text="Chargement des factures..." /> : !data?.results?.length ? (
          <Empty message="Aucune facture" icon={<CreditCard className="w-8 h-8" />} />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>N° Facture</th>
                    <th>Étudiant</th>
                    <th>Total</th>
                    <th>Payé</th>
                    <th>Reste</th>
                    <th>Progression</th>
                    <th>Statut</th>
                    <th>Échéance</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results?.map(inv => {
                    const pct = inv.total_amount > 0
                      ? Math.round((inv.paid_amount / inv.total_amount) * 100) : 0
                    return (
                      <tr key={inv.id}>
                        <td>
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                            {inv.invoice_number}
                          </span>
                        </td>
                        <td className="font-semibold text-sm text-gray-900">{inv.student_name}</td>
                        <td className="text-sm font-medium">{formatCurrency(inv.total_amount)}</td>
                        <td className="text-sm text-emerald-600 font-medium">{formatCurrency(inv.paid_amount)}</td>
                        <td className="text-sm text-red-500 font-medium">{formatCurrency(inv.remaining_amount)}</td>
                        <td className="w-24">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td><Badge label={inv.status_display} className={statusColor(inv.status)} dot /></td>
                        <td className="text-xs text-gray-400">{formatDate(inv.due_date)}</td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" icon={<Calendar className="w-3.5 h-3.5" />}
                              onClick={() => setInstallmentsInvoice(inv)}>
                              Échéancier
                            </Button>
                            <Button variant="ghost" size="sm" icon={<TrendingUp className="w-3.5 h-3.5" />}
                              onClick={() => setSelected(inv)}>
                              Paiement
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={data.count} pageSize={20} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={discountOpen} onClose={() => setDiscountOpen(false)}
        title="Bourse / Exonération / Remise" subtitle="Appliquer une réduction sur une facture" size="sm">
        <DiscountForm onSuccess={() => { setDiscountOpen(false); queryClient.invalidateQueries({ queryKey: ['invoices'] }) }} />
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)}
        title="Enregistrer un paiement" subtitle={selected?.invoice_number}>
        {selected && (
          <PaymentForm
            invoice={selected}
            onSubmit={(amount, method) => addPayment.mutate({ id: selected.id, amount, method })}
            loading={addPayment.isPending}
          />
        )}
      </Modal>

      {/* Create Invoice Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle facture" size="md">
        <InvoiceCreateForm onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['invoices'] }) }} onCancel={() => setCreateOpen(false)} />
      </Modal>

      {/* Installments Modal */}
      <Modal open={!!installmentsInvoice} onClose={() => setInstallmentsInvoice(null)}
        title="Échéancier de paiement" subtitle={installmentsInvoice?.invoice_number} size="md">
        {installmentsInvoice && <InstallmentsPanel invoice={installmentsInvoice} />}
      </Modal>
    </div>
  )
}

const installmentStatusBadge: Record<string, string> = {
  payee: 'badge-green', en_attente: 'badge-yellow', en_retard: 'badge-red',
}

function InstallmentsPanel({ invoice }: { invoice: Invoice }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState({ number: '', amount: '', due_date: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['installments', invoice.id],
    queryFn: () => financeApi.getInstallments({ invoice: invoice.id }).then(r => r.data),
  })

  const markPaid = useMutation({
    mutationFn: (id: string) => financeApi.markInstallmentPaid(id),
    onSuccess: () => { toast.success('Échéance marquée payée'); qc.invalidateQueries({ queryKey: ['installments', invoice.id] }) },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const createMut = useMutation({
    mutationFn: () => financeApi.createInstallment({
      invoice: invoice.id, number: Number(form.number), amount: Number(form.amount), due_date: form.due_date,
    }),
    onSuccess: () => {
      toast.success('Échéance créée')
      setForm({ number: '', amount: '', due_date: '' })
      qc.invalidateQueries({ queryKey: ['installments', invoice.id] })
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const installments: Installment[] = (data?.results ?? data) ?? []

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 rounded-xl p-3.5 flex items-center justify-between">
        <span className="text-sm text-gray-600">Reste à payer</span>
        <span className="font-bold text-red-500">{formatCurrency(invoice.remaining_amount)}</span>
      </div>

      {isLoading ? <Spinner /> : !installments.length ? (
        <Empty message="Aucune échéance définie" icon={<Calendar className="w-8 h-8" />}
          description="Ajoutez des échéances pour fractionner le paiement de cette facture." />
      ) : (
        <div className="space-y-2">
          {installments.map(inst => (
            <div key={inst.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Échéance #{inst.number}</p>
                  <p className="text-xs text-gray-400">Due le {formatDate(inst.due_date)} · {formatCurrency(inst.amount)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge label={inst.status} className={installmentStatusBadge[inst.status] ?? 'badge-gray'} dot />
                {inst.status !== 'payee' && (
                  <Button variant="secondary" size="xs" loading={markPaid.isPending}
                    onClick={() => markPaid.mutate(inst.id)}>Marquer payé</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-gray-100">
        <p className="label mb-2">Ajouter une échéance</p>
        <div className="grid grid-cols-3 gap-2">
          <input type="number" placeholder="N°" className="input" value={form.number}
            onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
          <input type="number" placeholder="Montant" className="input" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <input type="date" className="input" value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
        <Button className="w-full mt-3" size="sm" icon={<Plus className="w-3.5 h-3.5" />}
          loading={createMut.isPending}
          disabled={!form.number || !form.amount || !form.due_date}
          onClick={() => createMut.mutate()}>
          Ajouter l'échéance
        </Button>
      </div>
    </div>
  )
}

function PaymentForm({ invoice, onSubmit, loading }: {
  invoice: Invoice; onSubmit: (amount: number, method: string) => void; loading: boolean
}) {
  const [amount, setAmount] = useState(invoice.remaining_amount)
  const [method, setMethod] = useState('caisse')
  const pct = invoice.total_amount > 0 ? Math.round((invoice.paid_amount / invoice.total_amount) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Invoice summary */}
      <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-4 border border-gray-100 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 font-medium">Facture</span>
          <span className="font-mono text-sm font-bold text-gray-800">{invoice.invoice_number}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 font-medium">Étudiant</span>
          <span className="text-sm font-semibold text-gray-800">{invoice.student_name}</span>
        </div>
        <div className="divider my-0" />
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
            <p className="text-sm font-bold text-gray-800">{formatCurrency(invoice.total_amount)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Payé</p>
            <p className="text-sm font-bold text-emerald-600">{formatCurrency(invoice.paid_amount)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Reste</p>
            <p className="text-sm font-bold text-red-500">{formatCurrency(invoice.remaining_amount)}</p>
          </div>
        </div>
        <Progress value={pct} color={pct >= 100 ? 'bg-emerald-500' : 'bg-primary-500'} size="sm" />
      </div>

      <div>
        <label className="label">Montant à encaisser (FCFA)</label>
        <input type="number" className="input text-lg font-bold" value={amount}
          onChange={e => setAmount(Number(e.target.value))} max={invoice.remaining_amount} min={0} />
        <p className="text-xs text-gray-400 mt-1">Maximum : {formatCurrency(invoice.remaining_amount)}</p>
      </div>

      <div>
        <label className="label">Mode de paiement</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'caisse', label: 'Caisse' },
            { value: 'mobile_money', label: 'Mobile Money' },
            { value: 'virement', label: 'Virement' },
            { value: 'carte_bancaire', label: 'Carte Bancaire' },
          ].map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                method === m.value
                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <span>{methodIcons[m.value]}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      <Button className="w-full" size="lg" onClick={() => onSubmit(amount, method)} loading={loading}
        icon={<CheckCircle className="w-4 h-4" />}>
        Valider le paiement de {formatCurrency(amount)}
      </Button>
    </div>
  )
}

function DiscountForm({ onSuccess }: { onSuccess: () => void }) {
  const [invoiceId, setInvoiceId] = useState('')
  const [type, setType] = useState('bourse')
  const [amount, setAmount] = useState(0)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!invoiceId || !amount) { setError('Facture et montant requis'); return }
    setLoading(true); setError('')
    try {
      await api.post('/invoices/apply_discount/', { invoice: invoiceId, type, amount, reason })
      onSuccess()
    } catch { setError("Erreur lors de l'application.") }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">N° de facture</label>
        <input className="input" value={invoiceId} onChange={e => setInvoiceId(e.target.value)}
          placeholder="Ex: FACT-XXXXXXXX" />
      </div>
      <div>
        <label className="label">Type de réduction</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'bourse', label: '🎓 Bourse' },
            { value: 'exoneration', label: '✅ Exonération' },
            { value: 'remise', label: '💰 Remise' },
            { value: 'ristourne', label: '🎁 Ristourne' },
          ].map(t => (
            <button key={t.value} type="button" onClick={() => setType(t.value)}
              className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                type === t.value ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Montant (FCFA)</label>
        <input type="number" className="input" value={amount} onChange={e => setAmount(Number(e.target.value))} />
      </div>
      <div>
        <label className="label">Motif</label>
        <textarea className="input min-h-[70px] resize-none" value={reason}
          onChange={e => setReason(e.target.value)} placeholder="Ex: Bourse d'excellence, situation sociale..." />
      </div>
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Gift className="w-4 h-4" />}>
        Appliquer la réduction
      </Button>
    </div>
  )
}

function InvoiceCreateForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ student: '', academic_year: '', total_amount: '', due_date: '', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const { data: students } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => import('../../api').then(({ studentsApi }) => studentsApi.getStudents({ page_size: 100 }).then(r => r.data)),
  })
  const { data: years } = useQuery({
    queryKey: ['academic-years-list'],
    queryFn: () => import('../../api').then(({ academicApi }) => academicApi.getAcademicYears().then(r => r.data)),
  })

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.student) errs.student = 'Étudiant requis'
    if (!form.academic_year) errs.academic_year = 'Année académique requise'
    if (!form.total_amount || Number(form.total_amount) <= 0) errs.total_amount = 'Montant requis'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await import('../../api').then(({ financeApi }) => financeApi.createInvoice({
        student: form.student,
        academic_year: form.academic_year,
        total_amount: Number(form.total_amount),
        due_date: form.due_date || undefined,
        status: 'emise',
      } as never))
      toast.success('Facture créée avec succès')
      onSuccess()
    } catch {
      toast.error('Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Étudiant *</label>
        <select className={`input bg-white ${errors.student ? 'border-red-400' : ''}`}
          value={form.student} onChange={e => set('student', e.target.value)}>
          <option value="">— Sélectionner un étudiant —</option>
          {students?.results.map(s => (
            <option key={s.id} value={s.id}>{s.student_id} — {s.user.full_name}</option>
          ))}
        </select>
        {errors.student && <p className="mt-1 text-xs text-red-600">{errors.student}</p>}
      </div>
      <div>
        <label className="label">Année académique *</label>
        <select className={`input bg-white ${errors.academic_year ? 'border-red-400' : ''}`}
          value={form.academic_year} onChange={e => set('academic_year', e.target.value)}>
          <option value="">— Sélectionner —</option>
          {years?.results.map(y => (
            <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' (en cours)' : ''}</option>
          ))}
        </select>
        {errors.academic_year && <p className="mt-1 text-xs text-red-600">{errors.academic_year}</p>}
      </div>
      <div>
        <label className="label">Montant total (FCFA) *</label>
        <input type="number" className={`input ${errors.total_amount ? 'border-red-400' : ''}`}
          placeholder="150000" min={0} value={form.total_amount} onChange={e => set('total_amount', e.target.value)} />
        {errors.total_amount && <p className="mt-1 text-xs text-red-600">{errors.total_amount}</p>}
      </div>
      <div>
        <label className="label">Date d'échéance</label>
        <input type="date" className="input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input min-h-[60px] resize-none" placeholder="Observations..."
          value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={loading} icon={<CreditCard className="w-4 h-4" />}>
          Créer la facture
        </Button>
      </div>
    </form>
  )
}

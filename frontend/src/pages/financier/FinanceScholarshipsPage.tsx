import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Gift, Plus, Search, Users } from 'lucide-react'
import { Button, Input, Badge, Spinner, Empty, Pagination, Card, StatsCard, Modal, Alert } from '../../components/ui'
import { financeApi, studentsApi } from '../../api'
import { formatCurrency, formatDate } from '../../lib/utils'

const typeColor: Record<string, string> = {
  bourse: 'badge-blue', exoneration: 'badge-green', remise: 'badge-yellow', ristourne: 'badge-purple',
}
const typeIcon: Record<string, string> = {
  bourse: '🎓', exoneration: '✅', remise: '💰', ristourne: '🎁',
}

export default function FinanceScholarshipsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['scholarships', page, search, typeFilter],
    queryFn: () => financeApi.getScholarships({ page, search, type: typeFilter || undefined }).then(r => r.data),
  })

  const scholarships = data?.results ?? []
  const totalAmount = scholarships.reduce((s: number, sc: { amount: number }) => s + sc.amount, 0)
  const bourses = scholarships.filter((s: { type: string }) => s.type === 'bourse').length
  const exonerations = scholarships.filter((s: { type: string }) => s.type === 'exoneration').length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Bourses & Exonérations</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Gestion des réductions et aides financières</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={() => setCreateOpen(true)}>
          Nouvelle bourse
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total accordé" value={formatCurrency(totalAmount)}
          icon={<Gift className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Bourses" value={bourses}
          icon={<Users className="w-5 h-5" />} color="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatsCard title="Exonérations" value={exonerations}
          icon={<Gift className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
      </div>

      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par étudiant..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} className="input w-full sm:w-44">
            <option value="">Tous les types</option>
            <option value="bourse">Bourse</option>
            <option value="exoneration">Exonération</option>
            <option value="remise">Remise</option>
            <option value="ristourne">Ristourne</option>
          </select>
        </div>

        {isLoading ? <Spinner text="Chargement..." /> : !scholarships.length ? (
          <Empty message="Aucune bourse ou exonération" icon={<Gift className="w-8 h-8" />}
            action={<Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>Créer</Button>} />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Étudiant</th><th>Type</th><th>Montant</th>
                    <th>Motif</th><th>Accordé le</th>
                  </tr>
                </thead>
                <tbody>
                  {scholarships.map((sc: {
                    id: string; student: string; type: string; amount: number
                    reason: string; created_at: string
                  }) => (
                    <tr key={sc.id}>
                      <td className="font-semibold text-sm">{sc.student}</td>
                      <td>
                        <span className="flex items-center gap-1.5">
                          <span>{typeIcon[sc.type] ?? '💰'}</span>
                          <Badge label={sc.type} className={typeColor[sc.type] ?? 'badge-gray'} />
                        </span>
                      </td>
                      <td className="font-bold text-emerald-600">{formatCurrency(sc.amount)}</td>
                      <td className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{sc.reason || '—'}</td>
                      <td className="text-xs text-gray-400 dark:text-gray-500">{formatDate(sc.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={data.count} pageSize={20} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Accorder une bourse / exonération" size="md">
        <ScholarshipForm onSuccess={() => {
          setCreateOpen(false)
          queryClient.invalidateQueries({ queryKey: ['scholarships'] })
        }} />
      </Modal>
    </div>
  )
}

function ScholarshipForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ student: '', academic_year: '', type: 'bourse', amount: 0, reason: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const { data: students } = useQuery({
    queryKey: ['students-for-scholarship'],
    queryFn: () => studentsApi.getStudents({ page_size: 200 }).then(r => r.data),
  })

  const handleSubmit = async () => {
    if (!form.student || !form.amount) { setError('Étudiant et montant requis'); return }
    setLoading(true); setError('')
    try {
      await financeApi.createScholarship(form)
      onSuccess()
    } catch { setError('Erreur lors de la création.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">Étudiant *</label>
        <select className="input bg-white dark:bg-slate-900" value={form.student} onChange={e => set('student', e.target.value)}>
          <option value="">— Sélectionner —</option>
          {students?.results?.map((s: { id: string; student_id: string; user: { full_name: string } }) => (
            <option key={s.id} value={s.id}>{s.user.full_name} ({s.student_id})</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'bourse', label: '🎓 Bourse' },
              { value: 'exoneration', label: '✅ Exonération' },
              { value: 'remise', label: '💰 Remise' },
              { value: 'ristourne', label: '🎁 Ristourne' },
            ].map(t => (
              <button key={t.value} type="button" onClick={() => set('type', t.value)}
                className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                  form.type === t.value ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Montant (FCFA) *</label>
          <input type="number" className="input" value={form.amount}
            onChange={e => set('amount', Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="label">Motif</label>
        <textarea className="input min-h-[70px] resize-none" value={form.reason}
          onChange={e => set('reason', e.target.value)}
          placeholder="Ex: Bourse d'excellence, situation sociale difficile..." />
      </div>
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Gift className="w-4 h-4" />}>
        Accorder la réduction
      </Button>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Gift, Plus, Search, Users, Pencil, Trash2 } from 'lucide-react'
import { Button, Input, Badge, Spinner, Empty, Pagination, Card, StatsCard, Modal, Alert } from '../../components/ui'
import { financeApi, studentsApi, academicApi } from '../../api'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'

interface ScholarshipRow {
  id: string; student: string; student_name: string; type: string; amount: number
  reason: string; created_at: string; academic_year: string; percentage: number
}

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
  const [editScholarship, setEditScholarship] = useState<ScholarshipRow | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['scholarships', page, search, typeFilter],
    queryFn: () => financeApi.getScholarships({ page, search, type: typeFilter || undefined }).then(r => r.data),
  })

  const revokeMut = useMutation({
    mutationFn: (id: string) => financeApi.deleteScholarship(id),
    onSuccess: () => { toast.success('Bourse/exonération révoquée'); queryClient.invalidateQueries({ queryKey: ['scholarships'] }) },
    onError: () => toast.error('Erreur lors de la révocation'),
  })

  const handleRevoke = (sc: ScholarshipRow) => {
    if (window.confirm(`Révoquer cette ${sc.type === 'bourse' ? 'bourse' : 'réduction'} pour ${sc.student_name} ? Cette action est définitive.`)) {
      revokeMut.mutate(sc.id)
    }
  }

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
                    <th>Motif</th><th>Accordé le</th><th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(scholarships as ScholarshipRow[]).map(sc => (
                    <tr key={sc.id}>
                      <td className="font-semibold text-sm">{sc.student_name}</td>
                      <td>
                        <span className="flex items-center gap-1.5">
                          <span>{typeIcon[sc.type] ?? '💰'}</span>
                          <Badge label={sc.type} className={typeColor[sc.type] ?? 'badge-gray'} />
                        </span>
                      </td>
                      <td className="font-bold text-emerald-600">{formatCurrency(sc.amount)}</td>
                      <td className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{sc.reason || '—'}</td>
                      <td className="text-xs text-gray-400 dark:text-gray-500">{formatDate(sc.created_at)}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />}
                            onClick={() => setEditScholarship(sc)} />
                          <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />}
                            loading={revokeMut.isPending} onClick={() => handleRevoke(sc)} />
                        </div>
                      </td>
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

      <Modal open={!!editScholarship} onClose={() => setEditScholarship(null)} title="Modifier la bourse / exonération" size="md">
        {editScholarship && (
          <ScholarshipForm scholarship={editScholarship} onSuccess={() => {
            setEditScholarship(null)
            queryClient.invalidateQueries({ queryKey: ['scholarships'] })
          }} />
        )}
      </Modal>
    </div>
  )
}

function ScholarshipForm({ scholarship, onSuccess }: { scholarship?: ScholarshipRow; onSuccess: () => void }) {
  const [form, setForm] = useState(scholarship ? {
    student: scholarship.student, academic_year: scholarship.academic_year,
    type: scholarship.type, amount: scholarship.amount, reason: scholarship.reason,
  } : { student: '', academic_year: '', type: 'bourse', amount: 0, reason: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const { data: students } = useQuery({
    queryKey: ['students-for-scholarship'],
    queryFn: () => studentsApi.getStudents({ page_size: 200 }).then(r => r.data),
  })

  // `academic_year` est un champ obligatoire côté modèle (aucune valeur par
  // défaut) — ce formulaire ne le collectait pas du tout jusqu'ici, donc
  // toute création de bourse/exonération échouait silencieusement (le
  // formulaire n'affichait qu'un message d'erreur générique).
  const { data: years } = useQuery({
    queryKey: ['academic-years-for-scholarship'],
    queryFn: () => academicApi.getAcademicYears({ page_size: 50 }).then(r => r.data),
  })

  const handleSubmit = async () => {
    if (!form.student || !form.academic_year || !form.amount) { setError('Étudiant, année académique et montant requis'); return }
    setLoading(true); setError('')
    try {
      if (scholarship) await financeApi.updateScholarship(scholarship.id, form)
      else await financeApi.createScholarship(form)
      onSuccess()
    } catch { setError(scholarship ? 'Erreur lors de la modification.' : 'Erreur lors de la création.') }
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
      <div>
        <label className="label">Année académique *</label>
        <select className="input bg-white dark:bg-slate-900" value={form.academic_year} onChange={e => set('academic_year', e.target.value)}>
          <option value="">— Sélectionner —</option>
          {years?.results?.map((y: { id: string; label: string }) => (
            <option key={y.id} value={y.id}>{y.label}</option>
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
        {scholarship ? 'Enregistrer' : 'Accorder la réduction'}
      </Button>
    </div>
  )
}

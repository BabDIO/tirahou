import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, ClipboardCheck, Eye, CheckCircle, CreditCard, Plus, Filter } from 'lucide-react'
import { enrollmentApi, studentsApi, programsApi, academicApi } from '../../api'
import { Button, Input, Badge, Spinner, Empty, Pagination, Modal, Card, StatsCard, Alert, Tabs } from '../../components/ui'
import { formatDate, statusColor } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import type { AdminEnrollment, PedaEnrollment } from '../../types'

const statusColors: Record<string, string> = {
  en_attente: 'badge-yellow',
  validee: 'badge-green',
  rejetee: 'badge-red',
  annulee: 'badge-gray',
  confirmee: 'badge-green',
}

const typeColors: Record<string, string> = {
  premiere_inscription: 'badge-blue',
  reinscription: 'badge-purple',
  transfert: 'badge-orange',
}

export default function EnrollmentPage() {
  const [tab, setTab] = useState<'admin' | 'peda'>('admin')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<AdminEnrollment | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['enrollments', page, search, statusFilter],
    queryFn: () => enrollmentApi.getEnrollments({ page, search, status: statusFilter || undefined }).then(r => r.data),
    enabled: tab === 'admin',
  })

  const { data: pedaData, isLoading: pedaLoading } = useQuery({
    queryKey: ['peda-enrollments', page, search],
    queryFn: () => enrollmentApi.getPedaEnrollments({ page, search }).then(r => r.data),
    enabled: tab === 'peda',
  })

  const validateMutation = useMutation({
    mutationFn: (id: string) => enrollmentApi.validateEnrollment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('Inscription validée')
      setSelected(null)
    },
    onError: () => toast.error('Erreur lors de la validation'),
  })

  const validatePaymentMutation = useMutation({
    mutationFn: (id: string) => enrollmentApi.validatePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('Paiement validé')
    },
    onError: () => toast.error('Erreur lors de la validation du paiement'),
  })

  const total = data?.count ?? 0
  const enAttente = data?.results?.filter(e => e.status === 'en_attente').length ?? 0
  const validees = data?.results?.filter(e => e.status === 'validee').length ?? 0
  const paiementsValides = data?.results?.filter(e => e.payment_validated).length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Inscriptions</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Gestion des inscriptions administratives et pédagogiques</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={() => setCreateOpen(true)}>
          Nouvelle inscription
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Total inscriptions" value={total}
          icon={<ClipboardCheck className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="En attente" value={enAttente}
          icon={<ClipboardCheck className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
        <StatsCard title="Validées" value={validees}
          icon={<CheckCircle className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Paiements validés" value={paiementsValides}
          icon={<CreditCard className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'admin', label: 'Inscriptions administratives', icon: <ClipboardCheck className="w-4 h-4" /> },
          { key: 'peda', label: 'Inscriptions pédagogiques', icon: <CheckCircle className="w-4 h-4" /> },
        ]}
        active={tab} onChange={k => { setTab(k as 'admin' | 'peda'); setPage(1) }} variant="underline"
      />

      {/* Filters */}
      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par numéro, étudiant, programme..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
          {tab === 'admin' && (
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="input w-full sm:w-44">
              <option value="">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="validee">Validée</option>
              <option value="rejetee">Rejetée</option>
              <option value="annulee">Annulée</option>
            </select>
          )}
        </div>
      </Card>

      {/* Table Admin */}
      {tab === 'admin' && (
        <Card noPadding>
          {isLoading ? <Spinner text="Chargement des inscriptions..." /> : !data?.results?.length ? (
            <Empty message="Aucune inscription trouvée" icon={<ClipboardCheck className="w-8 h-8" />} />
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>N° Inscription</th>
                      <th>Étudiant</th>
                      <th>Programme</th>
                      <th>Type</th>
                      <th>Statut</th>
                      <th>Paiement</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map(enrollment => (
                      <tr key={enrollment.id}>
                        <td>
                          <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                            {enrollment.enrollment_number}
                          </span>
                        </td>
                        <td className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{enrollment.student_name}</td>
                        <td className="text-sm text-gray-600 dark:text-gray-400 max-w-[160px] truncate">{enrollment.program_name}</td>
                        <td>
                          <Badge label={enrollment.type} className={typeColors[enrollment.type] ?? 'badge-gray'} />
                        </td>
                        <td>
                          <Badge label={enrollment.status_display}
                            className={statusColors[enrollment.status] ?? 'badge-gray'} dot />
                        </td>
                        <td>
                          {enrollment.payment_validated ? (
                            <Badge label="Payé" className="badge-green" dot />
                          ) : (
                            <Badge label="En attente" className="badge-yellow" dot />
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => setSelected(enrollment)}>Voir</Button>
                            {enrollment.status === 'en_attente' && (
                              <Button variant="secondary" size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />}
                                loading={validateMutation.isPending}
                                onClick={() => validateMutation.mutate(enrollment.id)}>
                                Valider
                              </Button>
                            )}
                            {enrollment.status === 'validee' && !enrollment.payment_validated && (
                              <Button size="sm" icon={<CreditCard className="w-3.5 h-3.5" />}
                                loading={validatePaymentMutation.isPending}
                                onClick={() => validatePaymentMutation.mutate(enrollment.id)}>
                                Paiement ✓
                              </Button>
                            )}
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
      )}

      {/* Table Peda */}
      {tab === 'peda' && (
        <Card noPadding>
          {pedaLoading ? <Spinner text="Chargement..." /> : !pedaData?.results?.length ? (
            <Empty message="Aucune inscription pédagogique" icon={<ClipboardCheck className="w-8 h-8" />} />
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Étudiant</th>
                      <th>Semestre</th>
                      <th>Groupe</th>
                      <th>UE</th>
                      <th>Statut</th>
                      <th>Confirmé le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedaData.results.map((pe: PedaEnrollment) => (
                      <tr key={pe.id}>
                        <td className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{pe.student_name}</td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{pe.semester_label}</td>
                        <td className="text-sm text-gray-500 dark:text-gray-400">{pe.group_name ?? '—'}</td>
                        <td>
                          <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                            {pe.ue_count ?? '—'} UE
                          </span>
                        </td>
                        <td>
                          <Badge label={pe.status_display}
                            className={statusColors[pe.status] ?? 'badge-gray'} dot />
                        </td>
                        <td className="text-xs text-gray-400 dark:text-gray-500">{pe.confirmed_at ? formatDate(pe.confirmed_at) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={pedaData.count} pageSize={20} onChange={setPage} />
            </>
          )}
        </Card>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title="Dossier d'inscription" subtitle={selected?.enrollment_number} size="md">
        {selected && <EnrollmentDetail enrollment={selected} onValidate={() => validateMutation.mutate(selected.id)} />}
      </Modal>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle inscription" size="lg">
        <EnrollmentCreateForm
          onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['enrollments'] }) }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </div>
  )
}

function EnrollmentDetail({ enrollment, onValidate }: { enrollment: AdminEnrollment; onValidate: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary-50 to-violet-50 rounded-2xl border border-primary-100">
        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <ClipboardCheck className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <p className="font-bold text-gray-900 dark:text-gray-50">{enrollment.student_name}</p>
          <p className="text-xs font-mono text-primary-600">{enrollment.enrollment_number}</p>
          <div className="flex gap-2 mt-1.5">
            <Badge label={enrollment.status_display}
              className={statusColors[enrollment.status] ?? 'badge-gray'} dot />
            <Badge label={enrollment.type}
              className={typeColors[enrollment.type] ?? 'badge-gray'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Programme', enrollment.program_name],
          ['Paiement', enrollment.payment_validated ? '✅ Validé' : '⏳ En attente'],
          ['Notes', enrollment.notes || '—'],
        ].map(([label, value]) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5 col-span-2 sm:col-span-1 last:col-span-2">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{value}</p>
          </div>
        ))}
      </div>

      {enrollment.status === 'en_attente' && (
        <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <Button variant="danger" className="flex-1">Rejeter</Button>
          <Button className="flex-1" icon={<CheckCircle className="w-4 h-4" />} onClick={onValidate}>
            Valider l'inscription
          </Button>
        </div>
      )}
    </div>
  )
}

function EnrollmentCreateForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ student: '', program: '', academic_year: '', type: 'premiere_inscription', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const { data: students } = useQuery({ queryKey: ['students-list'], queryFn: () => studentsApi.getStudents({ page_size: 200 }).then(r => r.data) })
  const { data: programs } = useQuery({ queryKey: ['programs-list'], queryFn: () => programsApi.getPrograms({ page_size: 100 }).then(r => r.data) })
  const { data: years } = useQuery({ queryKey: ['years-list'], queryFn: () => academicApi.getAcademicYears().then(r => r.data) })

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.student) errs.student = 'Étudiant requis'
    if (!form.program) errs.program = 'Programme requis'
    if (!form.academic_year) errs.academic_year = 'Année académique requise'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await enrollmentApi.createEnrollment(form)
      toast.success('Inscription créée avec succès')
      onSuccess()
    } catch { toast.error('Erreur lors de la création') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Étudiant *</label>
        <select className={`input bg-white dark:bg-slate-900 ${errors.student ? 'border-red-400' : ''}`}
          value={form.student} onChange={e => set('student', e.target.value)}>
          <option value="">— Sélectionner un étudiant —</option>
          {students?.results?.map((s: { id: string; student_id: string; user: { full_name: string } }) => (
            <option key={s.id} value={s.id}>{s.student_id} — {s.user.full_name}</option>
          ))}
        </select>
        {errors.student && <p className="mt-1 text-xs text-red-600">{errors.student}</p>}
      </div>

      <div>
        <label className="label">Programme *</label>
        <select className={`input bg-white dark:bg-slate-900 ${errors.program ? 'border-red-400' : ''}`}
          value={form.program} onChange={e => set('program', e.target.value)}>
          <option value="">— Sélectionner un programme —</option>
          {programs?.results?.map((p: { id: string; code: string; name: string }) => (
            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
          ))}
        </select>
        {errors.program && <p className="mt-1 text-xs text-red-600">{errors.program}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Année académique *</label>
          <select className={`input bg-white dark:bg-slate-900 ${errors.academic_year ? 'border-red-400' : ''}`}
            value={form.academic_year} onChange={e => set('academic_year', e.target.value)}>
            <option value="">— Sélectionner —</option>
            {years?.results?.map((y: { id: string; label: string; is_current: boolean }) => (
              <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' (en cours)' : ''}</option>
            ))}
          </select>
          {errors.academic_year && <p className="mt-1 text-xs text-red-600">{errors.academic_year}</p>}
        </div>

        <div>
          <label className="label">Type d'inscription</label>
          <select className="input bg-white dark:bg-slate-900" value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="premiere_inscription">Première inscription</option>
            <option value="reinscription">Réinscription</option>
            <option value="transfert">Transfert</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Notes / Observations</label>
        <textarea className="input min-h-[70px] resize-none" placeholder="Observations..."
          value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={loading} icon={<ClipboardCheck className="w-4 h-4" />}>
          Créer l'inscription
        </Button>
      </div>
    </form>
  )
}

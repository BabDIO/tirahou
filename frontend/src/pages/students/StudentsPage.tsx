import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Eye, Pencil, GraduationCap, Filter, Download, CreditCard } from 'lucide-react'
import { studentsApi, analyticsApi, financeApi } from '../../api'
import { Button, Input, Badge, Spinner, Empty, Pagination, Modal, Card, StatsCard, Avatar, Alert, Tabs, SkeletonTable, DatePicker, Select } from '../../components/ui'
import { formatDate, formatCurrency, statusColor } from '../../lib/utils'
import { useDebounce } from '../../hooks/useDebounce'
import { useDownload } from '../../hooks/useDownload'
import { useToast } from '../../hooks/useToast'
import StudentCreateForm from '../../components/forms/StudentCreateForm'
import type { Student, Invoice } from '../../types'

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'inscrit', label: 'Inscrit' },
  { value: 'admis', label: 'Admis' },
  { value: 'diplome', label: 'Diplômé' },
  { value: 'abandonne', label: 'Abandonné' },
  { value: 'exclu', label: 'Exclu' },
]

const LEVEL_OPTIONS = [
  { value: '', label: 'Tous les niveaux' },
  { value: '1', label: 'Licence 1' },
  { value: '2', label: 'Licence 2' },
  { value: '3', label: 'Licence 3' },
  { value: '4', label: 'Master 1' },
  { value: '5', label: 'Master 2' },
]

const avatarColors = [
  'bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
]

export default function StudentsPage() {
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [statusFilter, setStatusFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [selected, setSelected] = useState<Student | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const queryClient = useQueryClient()

  const debouncedSearch = useDebounce(search, 400)
  const { downloadExcel } = useDownload()

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, debouncedSearch, statusFilter, levelFilter],
    queryFn: () => studentsApi.getStudents({
      page, search: debouncedSearch,
      status: statusFilter || undefined,
      current_level: levelFilter || undefined,
    }).then(r => r.data),
  })

  const total = data?.count ?? 0
  const inscrits = data?.results?.filter(s => s.status === 'inscrit').length ?? 0
  const admis = data?.results?.filter(s => s.status === 'admis').length ?? 0

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Étudiants</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
            {total} étudiant{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm"
            onClick={() => downloadExcel('students', {
              search: debouncedSearch || undefined,
              status: statusFilter || undefined,
              current_level: levelFilter || undefined,
            })}>
            Exporter
          </Button>
          <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={() => setCreateOpen(true)}>
            Nouvel étudiant
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total étudiants" value={total}
          icon={<GraduationCap className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Inscrits (page)" value={inscrits}
          icon={<GraduationCap className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Admis (page)" value={admis}
          icon={<GraduationCap className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
      </div>

      {/* Filters */}
      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Rechercher par nom, matricule, email..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="flex-1"
          />
          <Button
            variant="secondary"
            icon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
            size="md"
          >
            Filtres {(statusFilter || levelFilter) && <span className="w-1.5 h-1.5 bg-primary-500 rounded-full" />}
          </Button>
        </div>
        {showFilters && (
          <div className="px-4 pb-4 pt-0 flex flex-col sm:flex-row gap-3 border-t border-gray-50">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="input w-full sm:w-48">
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setPage(1) }} className="input w-full sm:w-48">
              {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {(statusFilter || levelFilter) && (
              <Button variant="ghost" size="md" onClick={() => { setStatusFilter(''); setLevelFilter(''); setPage(1) }}>
                Réinitialiser
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Table */}
      <Card noPadding>
        {isLoading ? (
          <Spinner text="Chargement des étudiants..." />
        ) : !data?.results?.length ? (
          <Empty
            message="Aucun étudiant trouvé"
            description="Essayez de modifier vos critères de recherche"
            icon={<GraduationCap className="w-8 h-8" />}
            action={<Button variant="secondary" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); setLevelFilter(''); setPage(1) }}>Réinitialiser</Button>}
          />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Étudiant</th>
                    <th>Matricule</th>
                    <th>Programme</th>
                    <th>Niveau</th>
                    <th>Statut</th>
                    <th>Inscription</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results?.map((student, idx) => (
                    <tr key={student.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={student.user.full_name}
                            src={student.photo}
                            size="md"
                            color={avatarColors[idx % avatarColors.length]}
                          />
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{student.user.full_name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{student.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md">
                          {student.student_id}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-400 max-w-[160px] truncate">{student.program_name ?? '—'}</td>
                      <td>
                        <span className="text-xs font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                          L{student.current_level}
                        </span>
                      </td>
                      <td>
                        <Badge label={student.status_display} className={statusColor(student.status)} dot />
                      </td>
                      <td className="text-xs text-gray-400 dark:text-gray-500">{formatDate(student.user.created_at)}</td>
                      <td className="text-right">
                        <Button
                          variant="ghost" size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => setSelected(student)}
                        >
                          Voir
                        </Button>
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

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Dossier étudiant"
        subtitle={selected?.student_id}
        size="lg"
      >
        {selected && <StudentDetail student={selected} onEdit={() => { setEditStudent(selected); setSelected(null) }} />}
      </Modal>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvel étudiant" size="xl">
        <StudentCreateForm onSuccess={() => setCreateOpen(false)} onCancel={() => setCreateOpen(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editStudent} onClose={() => setEditStudent(null)} title="Modifier l'étudiant" subtitle={editStudent?.student_id} size="lg">
        {editStudent && (
          <StudentEditForm student={editStudent}
            onSuccess={() => { setEditStudent(null); queryClient.invalidateQueries({ queryKey: ['students'] }) }}
            onCancel={() => setEditStudent(null)} />
        )}
      </Modal>
    </div>
  )
}

function StudentEditForm({ student, onSuccess, onCancel }: { student: Student; onSuccess: () => void; onCancel: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({
    gender: student.gender, nationality: student.nationality, birth_date: student.birth_date ?? '',
    birth_place: student.birth_place ?? '', national_id: student.national_id ?? '',
    address: student.address ?? '', current_level: student.current_level,
    status: student.status, baccalaureate_year: student.baccalaureate_year ?? '',
    baccalaureate_series: student.baccalaureate_series ?? '',
    emergency_contact_name: student.emergency_contact_name ?? '',
    emergency_contact_phone: student.emergency_contact_phone ?? '',
  })
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const updateMut = useMutation({
    mutationFn: () => studentsApi.updateStudent(student.id, form as Partial<Student>),
    onSuccess: () => { toast.success('Étudiant modifié'); onSuccess() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Erreur lors de la modification'),
  })

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <Select label="Genre" value={form.gender} onChange={e => set('gender', e.target.value)} options={[
          { value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }, { value: 'A', label: 'Autre' },
        ]} />
        <Select label="Statut" value={form.status} onChange={e => set('status', e.target.value)} options={[
          { value: 'candidat', label: 'Candidat' }, { value: 'admis', label: 'Admis' },
          { value: 'inscrit', label: 'Inscrit' }, { value: 'reinscrit', label: 'Réinscrit' },
          { value: 'diplome', label: 'Diplômé' }, { value: 'abandonne', label: 'Abandonné' },
          { value: 'exclu', label: 'Exclu' }, { value: 'suspendu', label: 'Suspendu' },
        ]} />
        <Input label="Nationalité" value={form.nationality} onChange={e => set('nationality', e.target.value)} />
        <DatePicker label="Date de naissance" max={new Date().toISOString().slice(0, 10)}
          value={form.birth_date} onChange={v => set('birth_date', v)} />
        <Input label="Lieu de naissance" value={form.birth_place} onChange={e => set('birth_place', e.target.value)} />
        <Input label="N° pièce d'identité" value={form.national_id} onChange={e => set('national_id', e.target.value)} />
        <div>
          <label className="label">Niveau</label>
          <select className="input bg-white dark:bg-slate-900" value={form.current_level} onChange={e => set('current_level', Number(e.target.value))}>
            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Niveau {n}</option>)}
          </select>
        </div>
        <Input label="Année bac" type="number" value={form.baccalaureate_year} onChange={e => set('baccalaureate_year', e.target.value)} />
        <Input label="Série bac" value={form.baccalaureate_series} onChange={e => set('baccalaureate_series', e.target.value)} />
      </div>
      <Input label="Adresse" value={form.address} onChange={e => set('address', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Contact urgence — nom" value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} />
        <Input label="Contact urgence — téléphone" value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} />
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" loading={updateMut.isPending} onClick={() => updateMut.mutate()}>Enregistrer</Button>
      </div>
    </div>
  )
}

function StudentDetail({ student, onEdit }: { student: Student; onEdit: () => void }) {
  const [tab, setTab] = useState('info')

  const { data: history } = useQuery({
    queryKey: ['student-history', student.id],
    queryFn: () => studentsApi.getAcademicHistory(student.id).then(r => r.data),
  })

  const { data: grades } = useQuery({
    queryKey: ['student-grades', student.id],
    queryFn: () => studentsApi.getGrades(student.id).then(r => r.data),
    enabled: tab === 'notes',
  })

  const { data: invoices } = useQuery({
    queryKey: ['student-invoices', student.id],
    queryFn: () => financeApi.getInvoices({ student: student.id }).then(r => r.data),
    enabled: tab === 'finances',
  })

  return (
    <div className="space-y-5">
      {/* Identity header */}
      <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-primary-50 to-violet-50 rounded-2xl border border-primary-100">
        <Avatar name={student.user.full_name} src={student.photo} size="xl" color="bg-primary-100 text-primary-700" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{student.user.full_name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{student.user.email}</p>
            </div>
            <Button variant="secondary" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={onEdit}>
              Modifier
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge label={student.status_display} className={statusColor(student.status)} dot />
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">#{student.student_id}</span>
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-semibold">
              Licence {student.current_level}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'info', label: 'Informations' },
          { key: 'parcours', label: 'Parcours académique' },
          { key: 'finances', label: 'Finances' },
          { key: 'notes', label: 'Notes' },
        ]}
        active={tab}
        onChange={setTab}
        variant="underline"
      />

      {/* Info tab */}
      {tab === 'info' && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Nationalité', student.nationality],
            ['Genre', student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : 'Autre'],
            ['Date de naissance', formatDate(student.birth_date)],
            ['Niveau actuel', `Licence ${student.current_level}`],
            ['Programme', student.program_name ?? '—'],
            ['Téléphone', student.user.phone || '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Parcours tab */}
      {tab === 'parcours' && (
        <div className="space-y-2">
          {Array.isArray(history) && history.length > 0 ? history.map((e: {
            id: string; enrollment_number: string; program_name: string;
            academic_year: string; status_display: string; status: string
          }) => (
            <div key={e.id} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">{e.program_name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{e.enrollment_number} · {e.academic_year}</p>
              </div>
              <Badge label={e.status_display} className={statusColor(e.status)} />
            </div>
          )) : (
            <Alert type="info">Aucun historique académique disponible.</Alert>
          )}
        </div>
      )}

      {/* Finances tab */}
      {tab === 'finances' && (
        <div className="space-y-2">
          {!invoices ? <Spinner size="sm" /> :
            (invoices.results ?? []).length > 0 ? (invoices.results as Invoice[]).map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatCurrency(Number(inv.paid_amount))} / {formatCurrency(Number(inv.total_amount))} · Échéance {formatDate(inv.due_date)}
                    </p>
                  </div>
                </div>
                <Badge label={inv.status_display} className={statusColor(inv.status)} />
              </div>
            )) : (
              <Alert type="info">Aucune facture pour cet étudiant.</Alert>
            )
          }
        </div>
      )}

      {/* Notes tab */}
      {tab === 'notes' && (
        <div className="space-y-2">
          {!grades ? <Spinner size="sm" /> :
            Array.isArray(grades) && grades.length > 0 ? grades.slice(0, 10).map((g: {
              id: string; ec_code: string; final_grade: number | null; status: string
            }) => (
              <div key={g.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="font-mono text-sm font-semibold text-primary-600">{g.ec_code}</span>
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-sm ${(g.final_grade ?? 0) >= 10 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {g.final_grade != null ? `${Number(g.final_grade).toFixed(2)}/20` : '—'}
                  </span>
                  <Badge label={g.status} className={statusColor(g.status)} />
                </div>
              </div>
            )) : <Alert type="info">Aucune note disponible.</Alert>
          }
        </div>
      )}
    </div>
  )
}

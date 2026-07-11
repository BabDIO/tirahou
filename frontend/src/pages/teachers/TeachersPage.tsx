import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Eye, UserCheck, Download, Mail, Phone, BookOpen, X, Clock, Trash2 } from 'lucide-react'
import { teachersApi, academicApi, teacherAvailabilityApi } from '../../api'
import { Button, Input, Badge, Spinner, Empty, Pagination, Modal, Card, StatsCard, Avatar, Alert, Tabs, Select } from '../../components/ui'
import { statusColor } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import api from '../../lib/axios'
import type { Teacher, TeacherAvailability } from '../../types'

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const gradeColors: Record<string, string> = {
  professeur: 'badge-purple',
  maitre_conference: 'badge-blue',
  maitre_assistant: 'badge-green',
  assistant: 'badge-yellow',
  vacataire: 'badge-gray',
  invite: 'badge-gray',
}

const avatarColors = [
  'bg-emerald-100 text-emerald-700', 'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700', 'bg-sky-100 text-sky-700',
  'bg-indigo-100 text-indigo-700', 'bg-violet-100 text-violet-700',
]

export default function TeachersPage() {
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [gradeFilter, setGradeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Teacher | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', page, search, gradeFilter, statusFilter],
    queryFn: () => teachersApi.getTeachers({
      page, search,
      grade: gradeFilter || undefined,
      status: statusFilter || undefined,
    }).then(r => r.data),
  })

  const permanents = data?.results?.filter(t => t.status === 'permanent').length ?? 0
  const vacataires = data?.results?.filter(t => t.status === 'vacataire').length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Enseignants</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">{data?.count ?? 0} enseignant(s) enregistré(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm">Exporter</Button>
          <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={() => setCreateOpen(true)}>Nouvel enseignant</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total enseignants" value={data?.count ?? 0}
          icon={<UserCheck className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Permanents" value={permanents}
          icon={<UserCheck className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600"
          subtitle="Corps enseignant permanent" />
        <StatsCard title="Vacataires" value={vacataires}
          icon={<UserCheck className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500"
          subtitle="Intervenants extérieurs" />
      </div>

      {/* Filters */}
      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par nom, matricule, email..." leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
          <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1) }} className="input w-full sm:w-48">
            <option value="">Tous les grades</option>
            <option value="assistant">Assistant</option>
            <option value="maitre_assistant">Maître-Assistant</option>
            <option value="maitre_conference">Maître de Conférences</option>
            <option value="professeur">Professeur</option>
            <option value="vacataire">Vacataire</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="input w-full sm:w-40">
            <option value="">Tous statuts</option>
            <option value="permanent">Permanent</option>
            <option value="vacataire">Vacataire</option>
            <option value="invite">Invité</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card noPadding>
        {isLoading ? <Spinner text="Chargement des enseignants..." /> : !data?.results?.length ? (
          <Empty message="Aucun enseignant trouvé" icon={<UserCheck className="w-8 h-8" />}
            description="Modifiez vos critères de recherche" />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Enseignant</th>
                    <th>Matricule</th>
                    <th>Grade</th>
                    <th>Statut</th>
                    <th>Département</th>
                    <th>Spécialités</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results?.map((teacher, idx) => (
                    <tr key={teacher.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={teacher.user.full_name} size="md"
                            color={avatarColors[idx % avatarColors.length]} />
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{teacher.user.full_name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{teacher.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md">
                          {teacher.teacher_id}
                        </span>
                      </td>
                      <td><Badge label={teacher.grade_display} className={gradeColors[teacher.grade] ?? 'badge-gray'} /></td>
                      <td><Badge label={teacher.status} className={statusColor(teacher.status)} dot /></td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{teacher.department_name ?? '—'}</td>
                      <td className="text-xs text-gray-400 dark:text-gray-500 max-w-[180px] truncate">{teacher.specialities || '—'}</td>
                      <td className="text-right">
                        <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => setSelected(teacher)}>Voir</Button>
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Dossier enseignant"
        subtitle={selected?.teacher_id} size="md">
        {selected && <TeacherDetail teacher={selected} />}
      </Modal>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvel enseignant" size="lg">
        <TeacherCreateForm onSuccess={() => setCreateOpen(false)} onCancel={() => setCreateOpen(false)} />
      </Modal>
    </div>
  )
}

function TeacherDetail({ teacher }: { teacher: Teacher }) {
  const [tab, setTab] = useState('info')
  const isExternal = teacher.status === 'vacataire' || teacher.status === 'invite'
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
        <Avatar name={teacher.user.full_name} size="xl" color="bg-emerald-100 text-emerald-700" />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{teacher.user.full_name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{teacher.user.email}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge label={teacher.grade_display} className={gradeColors[teacher.grade] ?? 'badge-gray'} />
            <Badge label={teacher.status} className={statusColor(teacher.status)} dot />
          </div>
        </div>
      </div>

      <Tabs tabs={[
        { key: 'info', label: 'Informations' },
        { key: 'dispo', label: 'Disponibilités' },
        { key: 'cours', label: 'Cours assignés' },
      ]} active={tab} onChange={setTab} variant="underline" />

      {tab === 'info' && (
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Matricule', teacher.teacher_id],
            ['Département', teacher.department_name ?? '—'],
            ['Téléphone', teacher.user.phone || '—'],
            ['Spécialités', teacher.specialities || '—'],
            ...(isExternal ? [
              ['Référence contrat', teacher.contract_reference || '—'],
              ['Taux horaire', teacher.hourly_rate != null ? `${teacher.hourly_rate} FCFA/h` : '—'],
            ] : []),
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'dispo' && <TeacherAvailabilityPanel teacher={teacher} />}

      {tab === 'cours' && (
        <Alert type="info">Les cours assignés seront affichés ici depuis le module LMS.</Alert>
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" size="sm" icon={<Mail className="w-3.5 h-3.5" />} className="flex-1">
          Envoyer un message
        </Button>
        <Button variant="secondary" size="sm" icon={<Phone className="w-3.5 h-3.5" />} className="flex-1">
          Appeler
        </Button>
        <Button variant="secondary" size="sm" icon={<BookOpen className="w-3.5 h-3.5" />} className="flex-1">
          Voir les cours
        </Button>
      </div>
    </div>
  )
}

function TeacherAvailabilityPanel({ teacher }: { teacher: Teacher }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [form, setForm] = useState({ day_of_week: '0', start_time: '08:00', end_time: '10:00', notes: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-availabilities', teacher.id],
    queryFn: () => teacherAvailabilityApi.getAvailabilities({ teacher: teacher.id }).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: () => teacherAvailabilityApi.createAvailability({
      teacher: teacher.id, day_of_week: Number(form.day_of_week) as never,
      start_time: form.start_time as never, end_time: form.end_time as never, notes: form.notes,
    }),
    onSuccess: () => {
      toast.success('Créneau ajouté')
      setForm(f => ({ ...f, notes: '' }))
      qc.invalidateQueries({ queryKey: ['teacher-availabilities', teacher.id] })
    },
    onError: () => toast.error('Erreur lors de l\'ajout du créneau'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => teacherAvailabilityApi.deleteAvailability(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher-availabilities', teacher.id] }),
  })

  const slots: TeacherAvailability[] = data?.results ?? []

  return (
    <div className="space-y-4">
      {isLoading ? <Spinner /> : !slots.length ? (
        <Empty icon={<Clock className="w-8 h-8" />} message="Aucun créneau de disponibilité déclaré" />
      ) : (
        <div className="space-y-2">
          {slots.map(slot => (
            <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <Clock className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{slot.day_display}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)} {slot.notes && `· ${slot.notes}`}</p>
                </div>
              </div>
              <button onClick={() => deleteMut.mutate(slot.id)} className="p-1.5 hover:bg-red-100 rounded-lg transition text-gray-400 dark:text-gray-500 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <select className="input" value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}>
          {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
        <input type="time" className="input" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
        <input type="time" className="input" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
        <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} loading={createMut.isPending} onClick={() => createMut.mutate()}>
          Ajouter
        </Button>
      </div>
    </div>
  )
}

function TeacherCreateForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    email: '', first_name: '', last_name: '', phone: '', password: '',
    grade: 'assistant', status: 'permanent', specialities: '', bio: '', office: '',
    department: '', weekly_hours_quota: 8, hourly_rate: '', contract_reference: '',
  })
  const isExternal = form.status === 'vacataire' || form.status === 'invite'

  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => academicApi.getDepartments({ page_size: 100 }).then(r => r.data),
  })

  const set = (k: string, v: string | number) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.email.includes('@')) errs.email = 'Email invalide'
    if (!form.first_name.trim()) errs.first_name = 'Prénom requis'
    if (!form.last_name.trim()) errs.last_name = 'Nom requis'
    if (form.password.length < 8) errs.password = 'Minimum 8 caractères'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const create = useMutation({
    mutationFn: async () => {
      const userRes = await api.post('/users/', {
        email: form.email, first_name: form.first_name, last_name: form.last_name,
        phone: form.phone, username: `${form.email.split('@')[0]}_${Date.now()}`,
        password: form.password, role_ids: [],
      })
      return teachersApi.createTeacher({
        user: userRes.data.id, grade: form.grade as never, status: form.status as never,
        department: form.department || undefined, specialities: form.specialities,
        bio: form.bio, office: form.office, weekly_hours_quota: form.weekly_hours_quota,
        hourly_rate: (isExternal && form.hourly_rate) ? Number(form.hourly_rate) as never : undefined,
        contract_reference: isExternal ? form.contract_reference : undefined,
      } as never)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      toast.success('Enseignant créé avec succès')
      onSuccess()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message ?? 'Erreur lors de la création')
    },
  })

  const handleSubmit = (ev: React.FormEvent) => { ev.preventDefault(); if (validate()) create.mutate() }
  const deptOptions = departments?.results.map(d => ({ value: d.id, label: `${d.acronym} — ${d.name}` })) ?? []

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Compte utilisateur</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Prénom *" placeholder="Jean" error={errors.first_name}
            value={form.first_name} onChange={e => set('first_name', e.target.value)} />
          <Input label="Nom *" placeholder="Dupont" error={errors.last_name}
            value={form.last_name} onChange={e => set('last_name', e.target.value)} />
          <Input label="Email *" type="email" error={errors.email}
            value={form.email} onChange={e => set('email', e.target.value)} />
          <Input label="Téléphone" value={form.phone} onChange={e => set('phone', e.target.value)} />
          <Input label="Mot de passe *" type="password" error={errors.password}
            className="sm:col-span-2" value={form.password} onChange={e => set('password', e.target.value)} />
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Profil académique</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Grade" options={[
            { value: 'assistant', label: 'Assistant' },
            { value: 'maitre_assistant', label: 'Maître-Assistant' },
            { value: 'maitre_conference', label: 'Maître de Conférences' },
            { value: 'professeur', label: 'Professeur' },
            { value: 'vacataire', label: 'Vacataire' },
          ]} value={form.grade} onChange={e => set('grade', e.target.value)} />
          <Select label="Statut" options={[
            { value: 'permanent', label: 'Permanent' },
            { value: 'vacataire', label: 'Vacataire' },
            { value: 'invite', label: 'Invité' },
          ]} value={form.status} onChange={e => set('status', e.target.value)} />
          <Select label="Département" options={deptOptions}
            value={form.department} onChange={e => set('department', e.target.value)} />
          <Input label="Bureau" placeholder="Bât. A, Bureau 12"
            value={form.office} onChange={e => set('office', e.target.value)} />
          <div>
            <label className="label">Quota hebdomadaire (h)</label>
            <input type="number" className="input" min={1} max={40}
              value={form.weekly_hours_quota} onChange={e => set('weekly_hours_quota', Number(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Spécialités</label>
            <input className="input" placeholder="Algorithmique, IA, Réseaux..."
              value={form.specialities} onChange={e => set('specialities', e.target.value)} />
          </div>
        </div>
      </div>
      {isExternal && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Contrat (vacataire / invité)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Référence de contrat" placeholder="CTR-2026-014"
              value={form.contract_reference} onChange={e => set('contract_reference', e.target.value)} />
            <div>
              <label className="label">Taux horaire (FCFA)</label>
              <input type="number" className="input" min={0}
                value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} />
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={create.isPending} icon={<UserCheck className="w-4 h-4" />}>
          Créer l'enseignant
        </Button>
      </div>
    </form>
  )
}

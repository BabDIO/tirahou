import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, BookMarked, Calendar, Plus, Settings, CheckCircle, Edit } from 'lucide-react'
import { academicApi } from '../../api'
import { Card, Spinner, StatsCard, Badge, Button, Modal, Alert, Tabs } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import api from '../../lib/axios'
import type { AcademicYear, Faculty, Department } from '../../types'

type Tab = 'years' | 'faculties' | 'departments' | 'regulations'

export default function AcademicPage() {
  const [tab, setTab] = useState<Tab>('years')
  const [createYearOpen, setCreateYearOpen] = useState(false)
  const [createFacOpen, setCreateFacOpen] = useState(false)
  const [createDeptOpen, setCreateDeptOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: years, isLoading: yearsLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => academicApi.getAcademicYears().then(r => r.data),
  })
  const { data: faculties } = useQuery({
    queryKey: ['faculties'],
    queryFn: () => academicApi.getFaculties().then(r => r.data),
  })
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => academicApi.getDepartments().then(r => r.data),
  })
  const { data: regulations } = useQuery({
    queryKey: ['regulations'],
    queryFn: () => api.get('/lmd-regulations/').then(r => r.data),
  })

  const setCurrentYear = useMutation({
    mutationFn: (id: string) => api.patch(`/academic-years/${id}/`, { is_current: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-years'] }),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Structure Académique</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Université, facultés, départements et règlements LMD</p>
        </div>
        <div className="flex gap-2">
          {tab === 'years' && <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateYearOpen(true)}>Nouvelle année</Button>}
          {tab === 'faculties' && <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateFacOpen(true)}>Nouvelle faculté</Button>}
          {tab === 'departments' && <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateDeptOpen(true)}>Nouveau département</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatsCard title="Années académiques" value={years?.count ?? 0}
          icon={<Calendar className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
        <StatsCard title="Facultés / Écoles" value={faculties?.count ?? 0}
          icon={<Building2 className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Départements / DER" value={departments?.count ?? 0}
          icon={<BookMarked className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Règlements LMD" value={regulations?.count ?? 0}
          icon={<Settings className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
      </div>

      <Tabs
        tabs={[
          { key: 'years', label: 'Années académiques', icon: <Calendar className="w-4 h-4" /> },
          { key: 'faculties', label: 'Facultés & Instituts', icon: <Building2 className="w-4 h-4" /> },
          { key: 'departments', label: 'Départements', icon: <BookMarked className="w-4 h-4" /> },
          { key: 'regulations', label: 'Règlements LMD', icon: <Settings className="w-4 h-4" /> },
        ]}
        active={tab} onChange={(k) => setTab(k as Tab)} variant="underline"
      />

      {/* Années académiques */}
      {tab === 'years' && (
        <Card noPadding>
          {yearsLoading ? <Spinner /> : (
            <div className="divide-y divide-gray-50">
              {years?.results.map((year: AcademicYear) => (
                <div key={year.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      year.is_current ? 'bg-emerald-100' : 'bg-gray-100'
                    }`}>
                      <Calendar className={`w-5 h-5 ${year.is_current ? 'text-emerald-600' : 'text-gray-400 dark:text-gray-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 dark:text-gray-50">{year.label}</p>
                        {year.is_current && <Badge label="En cours" className="badge-green" dot />}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatDate(year.start_date)} → {formatDate(year.end_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                      {year.candidature_start && (
                        <span>Candidatures: {formatDate(year.candidature_start)}</span>
                      )}
                      {year.admin_enrollment_start && (
                        <span>Inscriptions: {formatDate(year.admin_enrollment_start)}</span>
                      )}
                    </div>
                    {!year.is_current && (
                      <Button variant="secondary" size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />}
                        loading={setCurrentYear.isPending}
                        onClick={() => setCurrentYear.mutate(year.id)}>
                        Définir courante
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {!years?.results.length && (
                <div className="px-5 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">Aucune année académique</div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Facultés */}
      {tab === 'faculties' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {faculties?.results.map((fac: Faculty) => (
            <Card key={fac.id} hover>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-gray-50 text-sm">{fac.name}</p>
                  <p className="text-xs text-primary-600 font-mono mt-0.5">{fac.acronym}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{fac.university_name}</p>
                  {fac.email && <p className="text-xs text-gray-400 dark:text-gray-500">{fac.email}</p>}
                </div>
                <Button variant="ghost" size="xs" icon={<Edit className="w-3 h-3" />} />
              </div>
            </Card>
          ))}
          {!faculties?.results.length && (
            <div className="col-span-3 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">Aucune faculté</div>
          )}
        </div>
      )}

      {/* Départements */}
      {tab === 'departments' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {departments?.results.map((dept: Department) => (
            <Card key={dept.id} hover>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookMarked className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-gray-50 text-sm">{dept.name}</p>
                  <p className="text-xs font-mono text-emerald-600 mt-0.5">{dept.acronym}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{dept.faculty_name}</p>
                </div>
                <Button variant="ghost" size="xs" icon={<Edit className="w-3 h-3" />} />
              </div>
            </Card>
          ))}
          {!departments?.results.length && (
            <div className="col-span-2 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">Aucun département</div>
          )}
        </div>
      )}

      {/* Règlements LMD */}
      {tab === 'regulations' && (
        <div className="space-y-3">
          {regulations?.results?.length ? regulations.results.map((reg: {
            id: string; name: string; cycle: string; credits_per_semester: number;
            total_credits: number; passing_grade: number; compensation_allowed: boolean; max_years_allowed: number
          }) => (
            <Card key={reg.id} hover>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Settings className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-50">{reg.name}</p>
                    <p className="text-xs text-violet-600 font-semibold mt-0.5 uppercase tracking-wide">{reg.cycle}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  {[
                    ['Crédits/sem.', reg.credits_per_semester],
                    ['Total crédits', reg.total_credits],
                    ['Note passage', `${reg.passing_grade}/20`],
                    ['Durée max', `${reg.max_years_allowed} ans`],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Badge label={reg.compensation_allowed ? '✓ Compensation autorisée' : '✗ Pas de compensation'}
                  className={reg.compensation_allowed ? 'badge-green' : 'badge-red'} />
              </div>
            </Card>
          )) : (
            <Alert type="info">
              Aucun règlement LMD configuré. Créez les règlements depuis l'interface d'administration Django.
            </Alert>
          )}
        </div>
      )}

      {/* Modals création */}
      <Modal open={createYearOpen} onClose={() => setCreateYearOpen(false)}
        title="Nouvelle année académique" size="md">
        <CreateYearForm onSuccess={() => { setCreateYearOpen(false); queryClient.invalidateQueries({ queryKey: ['academic-years'] }) }} />
      </Modal>

      <Modal open={createFacOpen} onClose={() => setCreateFacOpen(false)}
        title="Nouvelle faculté / école / institut" size="sm">
        <CreateFacultyForm onSuccess={() => { setCreateFacOpen(false); queryClient.invalidateQueries({ queryKey: ['faculties'] }) }} />
      </Modal>

      <Modal open={createDeptOpen} onClose={() => setCreateDeptOpen(false)}
        title="Nouveau département / DER" size="sm">
        <CreateDeptForm onSuccess={() => { setCreateDeptOpen(false); queryClient.invalidateQueries({ queryKey: ['departments'] }) }} />
      </Modal>
    </div>
  )
}

function CreateYearForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    label: '', start_date: '', end_date: '', is_current: false,
    candidature_start: '', candidature_end: '',
    admin_enrollment_start: '', admin_enrollment_end: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.label || !form.start_date || !form.end_date) { setError('Libellé et dates requis'); return }
    setLoading(true); setError('')
    try {
      await api.post('/academic-years/', form)
      onSuccess()
    } catch { setError('Erreur lors de la création.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">Libellé (ex: 2024-2025)</label>
        <input className="input" value={form.label} onChange={e => set('label', e.target.value)} placeholder="2024-2025" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date de début</label>
          <input type="date" className="input" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Date de fin</label>
          <input type="date" className="input" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Début candidatures</label>
          <input type="date" className="input" value={form.candidature_start} onChange={e => set('candidature_start', e.target.value)} />
        </div>
        <div>
          <label className="label">Fin candidatures</label>
          <input type="date" className="input" value={form.candidature_end} onChange={e => set('candidature_end', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Début inscriptions</label>
          <input type="date" className="input" value={form.admin_enrollment_start} onChange={e => set('admin_enrollment_start', e.target.value)} />
        </div>
        <div>
          <label className="label">Fin inscriptions</label>
          <input type="date" className="input" value={form.admin_enrollment_end} onChange={e => set('admin_enrollment_end', e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_current} onChange={e => set('is_current', e.target.checked)}
          className="w-4 h-4 text-primary-600 rounded" />
        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Définir comme année courante</span>
      </label>
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Plus className="w-4 h-4" />}>
        Créer l'année académique
      </Button>
    </div>
  )
}

function CreateFacultyForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', acronym: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name || !form.acronym) { setError('Nom et acronyme requis'); return }
    setLoading(true); setError('')
    try { await api.post('/faculties/', form); onSuccess() }
    catch { setError('Erreur lors de la création.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">Nom complet</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="Faculté des Sciences et Technologies" />
      </div>
      <div>
        <label className="label">Acronyme</label>
        <input className="input" value={form.acronym} onChange={e => set('acronym', e.target.value)} placeholder="FST" />
      </div>
      <div>
        <label className="label">Email (optionnel)</label>
        <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="fst@universite.edu" />
      </div>
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Plus className="w-4 h-4" />}>
        Créer la faculté
      </Button>
    </div>
  )
}

function CreateDeptForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', acronym: '', faculty: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: faculties } = useQuery({
    queryKey: ['faculties'],
    queryFn: () => academicApi.getFaculties().then(r => r.data),
  })

  const handleSubmit = async () => {
    if (!form.name || !form.acronym || !form.faculty) { setError('Tous les champs sont requis'); return }
    setLoading(true); setError('')
    try { await api.post('/departments/', form); onSuccess() }
    catch { setError('Erreur lors de la création.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">Faculté de rattachement</label>
        <select className="input bg-white dark:bg-slate-900" value={form.faculty} onChange={e => set('faculty', e.target.value)}>
          <option value="">— Sélectionner —</option>
          {faculties?.results?.map((f: Faculty) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Nom du département</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="Département d'Informatique" />
      </div>
      <div>
        <label className="label">Acronyme</label>
        <input className="input" value={form.acronym} onChange={e => set('acronym', e.target.value)} placeholder="DI" />
      </div>
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Plus className="w-4 h-4" />}>
        Créer le département
      </Button>
    </div>
  )
}

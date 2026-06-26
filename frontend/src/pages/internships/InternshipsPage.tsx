import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, BookOpen, Plus, Eye, CheckCircle, Calendar, Users, FileText, Upload } from 'lucide-react'
import { Button, Input, Badge, Spinner, Empty, Card, StatsCard, Modal, Alert, Tabs } from '../../components/ui'
import { formatDate, statusColor } from '../../lib/utils'
import api from '../../lib/axios'

type Tab = 'internships' | 'memoires' | 'soutenances'

const statusColors: Record<string, string> = {
  en_cours: 'badge-blue', soumis: 'badge-yellow', valide: 'badge-green',
  rejete: 'badge-red', archive: 'badge-gray', planifie: 'badge-blue', realise: 'badge-green',
}

export default function InternshipsPage() {
  const [tab, setTab] = useState<Tab>('internships')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: internships, isLoading: intLoading } = useQuery({
    queryKey: ['internships', search],
    queryFn: () => api.get('/internships/', { params: { search } }).then(r => r.data),
    enabled: tab === 'internships',
  })

  const { data: memoires, isLoading: memLoading } = useQuery({
    queryKey: ['memoires', search],
    queryFn: () => api.get('/theses/', { params: { search } }).then(r => r.data),
    enabled: tab === 'memoires',
  })

  const { data: soutenances, isLoading: soutLoading } = useQuery({
    queryKey: ['soutenances', search],
    queryFn: () => api.get('/defenses/', { params: { search } }).then(r => r.data),
    enabled: tab === 'soutenances',
  })

  const validateMemoire = useMutation({
    mutationFn: (id: string) => api.post(`/theses/${id}/validate_subject/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memoires'] }),
  })

  const intCount = internships?.count ?? 0
  const memCount = memoires?.count ?? 0
  const soutCount = soutenances?.count ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Stages, Mémoires & Soutenances</h1>
          <p className="text-gray-400 text-sm mt-0.5">Suivi des travaux de fin d'études</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={() => setCreateOpen(true)}>
          {tab === 'internships' ? 'Nouveau stage' : tab === 'memoires' ? 'Nouveau mémoire' : 'Planifier soutenance'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Stages en cours" value={intCount}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Mémoires / Thèses" value={memCount}
          icon={<FileText className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
        <StatsCard title="Soutenances" value={soutCount}
          icon={<Calendar className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
      </div>

      <Tabs
        tabs={[
          { key: 'internships', label: 'Stages', icon: <BookOpen className="w-4 h-4" /> },
          { key: 'memoires', label: 'Mémoires & Thèses', icon: <FileText className="w-4 h-4" /> },
          { key: 'soutenances', label: 'Soutenances', icon: <Calendar className="w-4 h-4" /> },
        ]}
        active={tab} onChange={(k) => setTab(k as Tab)} variant="underline"
      />

      <Card noPadding>
        <div className="p-4">
          <Input placeholder="Rechercher par étudiant, sujet, encadreur..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Stages */}
        {tab === 'internships' && (
          intLoading ? <Spinner /> : !internships?.results?.length ? (
            <Empty message="Aucun stage enregistré" icon={<BookOpen className="w-8 h-8" />}
              description="Les conventions de stage apparaissent ici après dépôt" />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Étudiant</th><th>Entreprise</th><th>Sujet</th>
                    <th>Encadreur</th><th>Période</th><th>Statut</th><th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {internships.results.map((s: {
                    id: string; student_name: string; company_name: string; subject: string;
                    supervisor_name: string; start_date: string; end_date: string; status: string; status_display: string
                  }) => (
                    <tr key={s.id}>
                      <td className="font-semibold text-sm">{s.student_name}</td>
                      <td className="text-sm text-gray-600">{s.company_name}</td>
                      <td className="text-sm max-w-[200px] truncate">{s.subject}</td>
                      <td className="text-sm text-gray-600">{s.supervisor_name}</td>
                      <td className="text-xs text-gray-400">{formatDate(s.start_date)} → {formatDate(s.end_date)}</td>
                      <td><Badge label={s.status_display} className={statusColors[s.status] ?? 'badge-gray'} dot /></td>
                      <td className="text-right">
                        <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />}>Voir</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Mémoires */}
        {tab === 'memoires' && (
          memLoading ? <Spinner /> : !memoires?.results?.length ? (
            <Empty message="Aucun mémoire enregistré" icon={<FileText className="w-8 h-8" />}
              description="Les sujets de mémoire apparaissent ici après dépôt et validation" />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Étudiant</th><th>Titre</th><th>Type</th>
                    <th>Directeur</th><th>Dépôt final</th><th>Statut</th><th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {memoires.results.map((m: {
                    id: string; student_name: string; title: string; type: string;
                    director_name: string; final_submission_date: string | null;
                    status: string; status_display: string
                  }) => (
                    <tr key={m.id}>
                      <td className="font-semibold text-sm">{m.student_name}</td>
                      <td className="text-sm max-w-[200px] truncate font-medium">{m.title}</td>
                      <td><Badge label={m.type} className="badge-purple" /></td>
                      <td className="text-sm text-gray-600">{m.director_name}</td>
                      <td className="text-xs text-gray-400">{formatDate(m.final_submission_date)}</td>
                      <td><Badge label={m.status_display} className={statusColors[m.status] ?? 'badge-gray'} dot /></td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />}>Voir</Button>
                          {m.status === 'soumis' && (
                            <Button size="sm" variant="success" icon={<CheckCircle className="w-3.5 h-3.5" />}
                              loading={validateMemoire.isPending}
                              onClick={() => validateMemoire.mutate(m.id)}>Valider</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Soutenances */}
        {tab === 'soutenances' && (
          soutLoading ? <Spinner /> : !soutenances?.results?.length ? (
            <Empty message="Aucune soutenance planifiée" icon={<Calendar className="w-8 h-8" />} />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Étudiant</th><th>Titre mémoire</th><th>Date</th>
                    <th>Salle</th><th>Jury</th><th>Statut</th><th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {soutenances.results.map((s: {
                    id: string; student_name: string; memoire_title: string;
                    scheduled_date: string; room: string; jury_count: number;
                    status: string; status_display: string
                  }) => (
                    <tr key={s.id}>
                      <td className="font-semibold text-sm">{s.student_name}</td>
                      <td className="text-sm max-w-[180px] truncate">{s.memoire_title}</td>
                      <td className="text-sm">{formatDate(s.scheduled_date)}</td>
                      <td className="text-sm text-gray-600">{s.room || '—'}</td>
                      <td>
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <Users className="w-3 h-3" /> {s.jury_count} membres
                        </span>
                      </td>
                      <td><Badge label={s.status_display} className={statusColors[s.status] ?? 'badge-gray'} dot /></td>
                      <td className="text-right">
                        <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />}>PV</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)}
        title={tab === 'internships' ? 'Nouveau stage' : tab === 'memoires' ? 'Nouveau mémoire / thèse' : 'Planifier une soutenance'}
        size="md">
        {tab === 'internships' && <InternshipForm onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['internships'] }) }} />}
        {tab === 'memoires' && <MemoireForm onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['memoires'] }) }} />}
        {tab === 'soutenances' && <SoutenanceForm onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['soutenances'] }) }} />}
      </Modal>
    </div>
  )
}

function InternshipForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ student: '', company_name: '', subject: '', start_date: '', end_date: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.company_name || !form.subject) { setError('Entreprise et sujet requis'); return }
    setLoading(true); setError('')
    try { await api.post('/internships/', form); onSuccess() }
    catch { setError('Erreur lors de la création.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">Entreprise / Organisation</label>
        <input className="input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Nom de l'entreprise" />
      </div>
      <div>
        <label className="label">Sujet du stage</label>
        <textarea className="input min-h-[70px] resize-none" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Intitulé du sujet..." />
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
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Plus className="w-4 h-4" />}>
        Enregistrer le stage
      </Button>
    </div>
  )
}

function MemoireForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ title: '', type: 'memoire', keywords: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title) { setError('Titre requis'); return }
    setLoading(true); setError('')
    try { await api.post('/theses/', form); onSuccess() }
    catch { setError('Erreur lors de la création.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">Type</label>
        <select className="input bg-white" value={form.type} onChange={e => set('type', e.target.value)}>
          <option value="memoire">Mémoire de Master</option>
          <option value="these">Thèse de Doctorat</option>
          <option value="rapport">Rapport de stage</option>
        </select>
      </div>
      <div>
        <label className="label">Titre</label>
        <textarea className="input min-h-[80px] resize-none" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Titre complet du mémoire..." />
      </div>
      <div>
        <label className="label">Mots-clés</label>
        <input className="input" value={form.keywords} onChange={e => set('keywords', e.target.value)} placeholder="Ex: IA, apprentissage, données..." />
      </div>
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Upload className="w-4 h-4" />}>
        Déposer le sujet
      </Button>
    </div>
  )
}

function SoutenanceForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ memoire: '', scheduled_date: '', room: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.scheduled_date) { setError('Date requise'); return }
    setLoading(true); setError('')
    try { await api.post('/defenses/', form); onSuccess() }
    catch { setError('Erreur lors de la planification.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">Date et heure</label>
        <input type="datetime-local" className="input" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
      </div>
      <div>
        <label className="label">Salle</label>
        <input className="input" value={form.room} onChange={e => set('room', e.target.value)} placeholder="Ex: Salle de conférence A" />
      </div>
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Calendar className="w-4 h-4" />}>
        Planifier la soutenance
      </Button>
    </div>
  )
}

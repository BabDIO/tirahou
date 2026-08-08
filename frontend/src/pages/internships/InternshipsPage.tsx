import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, BookOpen, Plus, Eye, CheckCircle, XCircle, Calendar, Users, FileText, Upload, ShieldAlert, Award } from 'lucide-react'
import { Button, Input, Badge, Spinner, Empty, Card, StatsCard, Modal, Alert, Tabs } from '../../components/ui'
import { formatDate, statusColor } from '../../lib/utils'
import { studentsApi, academicApi, internshipsApi } from '../../api'
import { useToast } from '../../hooks/useToast'
import api from '../../lib/axios'

type Tab = 'internships' | 'memoires' | 'soutenances'

const statusColors: Record<string, string> = {
  en_cours: 'badge-blue', soumis: 'badge-yellow', valide: 'badge-green',
  rejete: 'badge-red', archive: 'badge-gray', planifie: 'badge-blue', realise: 'badge-green',
}

interface ThesisRow {
  id: string; student_name: string; title: string; type: string;
  director_name: string; final_submission_date: string | null;
  status: string; status_display: string;
  plagiarism_score: string | null; plagiarism_analysis_id: string; plagiarism_report_url: string;
}

interface DefenseRow {
  id: string; student_name: string; memoire_title: string;
  scheduled_date: string; room: string; jury_count: number;
  status: string; status_display: string; grade: string | null; mention: string; notes: string;
}

export default function InternshipsPage() {
  const [tab, setTab] = useState<Tab>('internships')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [thesisDetail, setThesisDetail] = useState<ThesisRow | null>(null)
  const [gradeDefense, setGradeDefense] = useState<DefenseRow | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

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
    onError: () => toast.error('Erreur lors de la validation du sujet'),
  })

  const rejectMemoire = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => internshipsApi.rejectSubject(id, reason),
    onSuccess: () => { toast.success('Sujet rejeté'); queryClient.invalidateQueries({ queryKey: ['memoires'] }) },
    onError: () => toast.error('Erreur lors du rejet du sujet'),
  })

  const checkPlagiarism = useMutation({
    mutationFn: (id: string) => internshipsApi.checkPlagiarism(id),
    onSuccess: (res) => {
      toast.success('Analyse anti-plagiat mise à jour')
      queryClient.invalidateQueries({ queryKey: ['memoires'] })
      setThesisDetail(prev => prev ? { ...prev, ...res.data } : prev)
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Erreur lors de la vérification anti-plagiat'),
  })

  const recordGrade = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { grade: string; mention?: string; comments?: string } }) =>
      internshipsApi.recordGrade(id, data),
    onSuccess: () => {
      toast.success('Note de soutenance enregistrée')
      queryClient.invalidateQueries({ queryKey: ['soutenances'] })
      setGradeDefense(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Erreur lors de la saisie de la note'),
  })

  const intCount = internships?.count ?? 0
  const memCount = memoires?.count ?? 0
  const soutCount = soutenances?.count ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Stages, Mémoires & Soutenances</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Suivi des travaux de fin d'études</p>
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
                      <td className="text-sm text-gray-600 dark:text-gray-400">{s.company_name}</td>
                      <td className="text-sm max-w-[200px] truncate">{s.subject}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{s.supervisor_name}</td>
                      <td className="text-xs text-gray-400 dark:text-gray-500">{formatDate(s.start_date)} → {formatDate(s.end_date)}</td>
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
                  {memoires.results.map((m: ThesisRow) => (
                    <tr key={m.id}>
                      <td className="font-semibold text-sm">{m.student_name}</td>
                      <td className="text-sm max-w-[200px] truncate font-medium">{m.title}</td>
                      <td><Badge label={m.type} className="badge-purple" /></td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{m.director_name}</td>
                      <td className="text-xs text-gray-400 dark:text-gray-500">{formatDate(m.final_submission_date)}</td>
                      <td><Badge label={m.status_display} className={statusColors[m.status] ?? 'badge-gray'} dot /></td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => setThesisDetail(m)}>Voir</Button>
                          {/* Le sujet nouvellement déposé porte le statut 'sujet_propose' —
                              le contrôle précédent comparait à 'soumis', une valeur qui
                              n'existe pas dans STATUS_CHOICES : le bouton Valider n'apparaissait
                              donc jamais, quel que soit le mémoire. */}
                          {m.status === 'sujet_propose' && (
                            <>
                              <Button size="sm" variant="success" icon={<CheckCircle className="w-3.5 h-3.5" />}
                                loading={validateMemoire.isPending}
                                onClick={() => validateMemoire.mutate(m.id)}>Valider</Button>
                              <Button size="sm" variant="danger" icon={<XCircle className="w-3.5 h-3.5" />}
                                loading={rejectMemoire.isPending}
                                onClick={() => {
                                  const reason = window.prompt('Motif du rejet du sujet :') ?? ''
                                  rejectMemoire.mutate({ id: m.id, reason })
                                }}>Rejeter</Button>
                            </>
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
                  {soutenances.results.map((s: DefenseRow) => (
                    <tr key={s.id}>
                      <td className="font-semibold text-sm">{s.student_name}</td>
                      <td className="text-sm max-w-[180px] truncate">{s.memoire_title}</td>
                      <td className="text-sm">{formatDate(s.scheduled_date)}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{s.room || '—'}</td>
                      <td>
                        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Users className="w-3 h-3" /> {s.jury_count} membres
                        </span>
                      </td>
                      <td>
                        <Badge label={s.status_display} className={statusColors[s.status] ?? 'badge-gray'} dot />
                        {s.grade && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{s.grade}/20 {s.mention && `— ${s.mention}`}</p>}
                      </td>
                      <td className="text-right">
                        <Button size="sm" variant={s.grade ? 'ghost' : 'success'} icon={<Award className="w-3.5 h-3.5" />}
                          onClick={() => setGradeDefense(s)}>
                          {s.grade ? 'Modifier la note' : 'Noter'}
                        </Button>
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

      {/* Détail mémoire — anti-plagiat */}
      <Modal open={!!thesisDetail} onClose={() => setThesisDetail(null)} title="Détail du mémoire" size="md">
        {thesisDetail && (
          <div className="space-y-4">
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-50">{thesisDetail.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{thesisDetail.student_name} — {thesisDetail.director_name}</p>
            </div>
            <Badge label={thesisDetail.status_display} className={statusColors[thesisDetail.status] ?? 'badge-gray'} dot />

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Analyse anti-plagiat</p>
              </div>
              {thesisDetail.plagiarism_score != null ? (
                <div className="flex items-center justify-between">
                  <p className={`text-2xl font-black ${Number(thesisDetail.plagiarism_score) >= 25 ? 'text-red-600' : Number(thesisDetail.plagiarism_score) >= 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {Number(thesisDetail.plagiarism_score).toFixed(1)}% de similarité
                  </p>
                  {thesisDetail.plagiarism_report_url && (
                    <a href={thesisDetail.plagiarism_report_url} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">
                      Voir le rapport complet
                    </a>
                  )}
                </div>
              ) : thesisDetail.plagiarism_analysis_id ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Analyse en cours...</p>
                  <Button size="sm" variant="secondary" loading={checkPlagiarism.isPending}
                    onClick={() => checkPlagiarism.mutate(thesisDetail.id)}>
                    Actualiser
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">Aucune analyse — le mémoire n'a pas encore été déposé (submit_final) ou le service anti-plagiat n'est pas configuré.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Notation de soutenance */}
      <Modal open={!!gradeDefense} onClose={() => setGradeDefense(null)} title="Noter la soutenance" size="sm">
        {gradeDefense && (
          <GradeDefenseForm defense={gradeDefense}
            loading={recordGrade.isPending}
            onSubmit={data => recordGrade.mutate({ id: gradeDefense.id, data })} />
        )}
      </Modal>
    </div>
  )
}

function GradeDefenseForm({ defense, loading, onSubmit }: {
  defense: DefenseRow; loading: boolean;
  onSubmit: (data: { grade: string; mention: string; comments: string }) => void
}) {
  const [grade, setGrade] = useState(defense.grade ?? '')
  const [mention, setMention] = useState(defense.mention ?? '')
  const [comments, setComments] = useState(defense.notes ?? '')

  return (
    <div className="space-y-4">
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
        <p className="font-semibold text-gray-900 dark:text-gray-50">{defense.student_name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{defense.memoire_title}</p>
      </div>
      <div>
        <label className="label">Note (sur 20) *</label>
        <input type="number" min={0} max={20} step={0.25} className="input"
          value={grade} onChange={e => setGrade(e.target.value)} />
      </div>
      <div>
        <label className="label">Mention</label>
        <input className="input" value={mention} onChange={e => setMention(e.target.value)}
          placeholder="Ex: Très bien" />
      </div>
      <div>
        <label className="label">Commentaires du jury</label>
        <textarea className="input min-h-[80px]" value={comments} onChange={e => setComments(e.target.value)} />
      </div>
      <Button className="w-full" icon={<Award className="w-4 h-4" />} loading={loading}
        disabled={!grade}
        onClick={() => onSubmit({ grade, mention, comments })}>
        Enregistrer la note
      </Button>
    </div>
  )
}

function InternshipForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ student: '', academic_year: '', company_name: '', subject: '', start_date: '', end_date: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: students } = useQuery({ queryKey: ['students-for-internship'], queryFn: () => studentsApi.getStudents({ page_size: 200 }).then(r => r.data) })
  const { data: years } = useQuery({ queryKey: ['years-for-internship'], queryFn: () => academicApi.getAcademicYears().then(r => r.data) })

  const handleSubmit = async () => {
    if (!form.student || !form.academic_year || !form.company_name || !form.subject) { setError('Étudiant, année académique, entreprise et sujet requis'); return }
    setLoading(true); setError('')
    try { await api.post('/internships/', form); onSuccess() }
    catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[]> } }
      const msgs = Object.values(e?.response?.data ?? {}).flat().join(' ')
      setError(msgs || 'Erreur lors de la création.')
    }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">Étudiant</label>
        <select className="input bg-white dark:bg-slate-900" value={form.student} onChange={e => set('student', e.target.value)}>
          <option value="">— Sélectionner un étudiant —</option>
          {students?.results?.map((s: { id: string; student_id: string; user: { full_name: string } }) => (
            <option key={s.id} value={s.id}>{s.student_id} — {s.user.full_name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Année académique</label>
        <select className="input bg-white dark:bg-slate-900" value={form.academic_year} onChange={e => set('academic_year', e.target.value)}>
          <option value="">— Sélectionner —</option>
          {years?.results?.map((y: { id: string; label: string }) => (
            <option key={y.id} value={y.id}>{y.label}</option>
          ))}
        </select>
      </div>
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
  const [form, setForm] = useState({ student: '', academic_year: '', title: '', type: 'memoire_master', keywords: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: students } = useQuery({ queryKey: ['students-for-thesis'], queryFn: () => studentsApi.getStudents({ page_size: 200 }).then(r => r.data) })
  const { data: years } = useQuery({ queryKey: ['years-for-thesis'], queryFn: () => academicApi.getAcademicYears().then(r => r.data) })

  const handleSubmit = async () => {
    if (!form.student || !form.academic_year || !form.title) { setError('Étudiant, année académique et titre requis'); return }
    setLoading(true); setError('')
    try { await api.post('/theses/', form); onSuccess() }
    catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[]> } }
      const msgs = Object.values(e?.response?.data ?? {}).flat().join(' ')
      setError(msgs || 'Erreur lors de la création.')
    }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">Étudiant</label>
        <select className="input bg-white dark:bg-slate-900" value={form.student} onChange={e => set('student', e.target.value)}>
          <option value="">— Sélectionner un étudiant —</option>
          {students?.results?.map((s: { id: string; student_id: string; user: { full_name: string } }) => (
            <option key={s.id} value={s.id}>{s.student_id} — {s.user.full_name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Année académique</label>
        <select className="input bg-white dark:bg-slate-900" value={form.academic_year} onChange={e => set('academic_year', e.target.value)}>
          <option value="">— Sélectionner —</option>
          {years?.results?.map((y: { id: string; label: string }) => (
            <option key={y.id} value={y.id}>{y.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Type</label>
        <select className="input bg-white dark:bg-slate-900" value={form.type} onChange={e => set('type', e.target.value)}>
          <option value="memoire_licence">Mémoire de Licence</option>
          <option value="memoire_master">Mémoire de Master</option>
          <option value="these_doctorat">Thèse de Doctorat</option>
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
  // Le modèle Defense a un champ `thesis` (pas `memoire`) — le formulaire
  // envoyait un nom de champ inexistant en plus de ne jamais le renseigner,
  // donc DRF le rejetait toujours faute de `thesis` requis.
  const [form, setForm] = useState({ thesis: '', scheduled_date: '', room: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: theses } = useQuery({
    queryKey: ['theses-for-defense'],
    queryFn: () => api.get('/theses/', { params: { page_size: 200 } }).then(r => r.data),
  })
  // Une soutenance par mémoire (OneToOne) — ne proposer que ceux qui n'en ont pas déjà une.
  const availableTheses = (theses?.results ?? []).filter((t: { defense: unknown }) => !t.defense)

  const handleSubmit = async () => {
    if (!form.thesis || !form.scheduled_date) { setError('Mémoire et date requis'); return }
    setLoading(true); setError('')
    try { await api.post('/defenses/', form); onSuccess() }
    catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[]> } }
      const msgs = Object.values(e?.response?.data ?? {}).flat().join(' ')
      setError(msgs || 'Erreur lors de la planification.')
    }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">Mémoire / Thèse</label>
        <select className="input bg-white dark:bg-slate-900" value={form.thesis} onChange={e => set('thesis', e.target.value)}>
          <option value="">— Sélectionner —</option>
          {availableTheses.map((t: { id: string; title: string; student_name: string }) => (
            <option key={t.id} value={t.id}>{t.student_name} — {t.title}</option>
          ))}
        </select>
      </div>
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

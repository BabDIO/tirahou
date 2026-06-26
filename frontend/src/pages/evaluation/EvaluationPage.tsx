import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Award, Plus, CheckCircle, BookOpen, BarChart3,
  Upload, Download, Eye, ClipboardList, AlertTriangle
} from 'lucide-react'
import { evaluationApi, academicApi } from '../../api'
import {
  Button, Input, Badge, Spinner, Empty, Pagination,
  Modal, Card, StatsCard, Alert, Tabs, Select
} from '../../components/ui'
import { formatDate, statusColor } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import { saveAs } from 'file-saver'
import type { Grade, ExamSession, SemesterResult, GradeContest } from '../../types'

type Tab = 'sessions' | 'notes' | 'results' | 'contests'

const statusGrade: Record<string, string> = {
  saisie: 'badge-yellow',
  validee: 'badge-blue',
  publiee: 'badge-green',
  contestee: 'badge-red',
}

export default function EvaluationPage() {
  const [tab, setTab] = useState<Tab>('sessions')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sessionFilter, setSessionFilter] = useState('')
  const [createSessionOpen, setCreateSessionOpen] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['exam-sessions'],
    queryFn: () => evaluationApi.getExamSessions().then(r => r.data),
    enabled: tab === 'sessions',
  })

  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ['grades', page, search, sessionFilter],
    queryFn: () => evaluationApi.getGrades({
      page, search,
      exam_session: sessionFilter || undefined,
    }).then(r => r.data),
    enabled: tab === 'notes',
  })

  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ['semester-results', page],
    queryFn: () => evaluationApi.getSemesterResults({ page }).then(r => r.data),
    enabled: tab === 'results',
  })

  const { data: contests } = useQuery({
    queryKey: ['grade-contests'],
    queryFn: () => evaluationApi.getGradeContests().then(r => r.data),
    enabled: tab === 'contests',
  })

  const openSession = useMutation({
    mutationFn: (id: string) => evaluationApi.openExamSession(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exam-sessions'] }); toast.success('Session ouverte') },
  })

  const closeSession = useMutation({
    mutationFn: (id: string) => evaluationApi.closeExamSession(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exam-sessions'] }); toast.success('Session fermée') },
  })

  const validateGrade = useMutation({
    mutationFn: (id: string) => evaluationApi.validateGrade(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['grades'] }); toast.success('Note validée') },
  })

  const publishGrade = useMutation({
    mutationFn: (id: string) => evaluationApi.publishGrade(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['grades'] }); toast.success('Note publiée') },
  })

  const handleExportGrades = async () => {
    const tid = toast.loading('Export en cours...')
    try {
      const res = await evaluationApi.exportGrades({ exam_session: sessionFilter || undefined })
      saveAs(new Blob([res.data]), 'notes.xlsx')
      toast.dismiss(tid); toast.success('Export téléchargé')
    } catch { toast.dismiss(tid); toast.error('Erreur export') }
  }

  const openSessions = sessions?.results?.filter((s: ExamSession) => s.is_open).length ?? 0
  const saisies = grades?.results?.filter(g => g.status === 'saisie').length ?? 0
  const publiees = grades?.results?.filter(g => g.status === 'publiee').length ?? 0
  const pendingContests = (contests as { count?: number })?.count ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Évaluations & Notes</h1>
          <p className="text-gray-400 text-sm mt-0.5">Sessions d'examens, saisie des notes et publication des résultats</p>
        </div>
        <div className="flex gap-2">
          {tab === 'notes' && (
            <>
              <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}
                onClick={handleExportGrades}>Exporter</Button>
              <Button variant="secondary" size="sm" icon={<Upload className="w-4 h-4" />}>
                Importer Excel
              </Button>
            </>
          )}
          {tab === 'sessions' && (
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateSessionOpen(true)}>
              Nouvelle session
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Sessions ouvertes" value={openSessions}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Notes saisies" value={grades?.count ?? 0}
          icon={<Award className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Notes publiées" value={publiees}
          icon={<CheckCircle className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
        <StatsCard title="Réclamations" value={pendingContests}
          icon={<AlertTriangle className="w-5 h-5" />} color="bg-gradient-to-br from-red-500 to-red-600" />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'sessions', label: 'Sessions d\'examen', icon: <BookOpen className="w-4 h-4" /> },
          { key: 'notes', label: 'Notes', icon: <Award className="w-4 h-4" />, count: saisies },
          { key: 'results', label: 'Résultats semestriels', icon: <BarChart3 className="w-4 h-4" /> },
          { key: 'contests', label: 'Réclamations', icon: <AlertTriangle className="w-4 h-4" />, count: pendingContests },
        ]}
        active={tab} onChange={k => { setTab(k as Tab); setPage(1) }} variant="underline"
      />

      {/* Sessions */}
      {tab === 'sessions' && (
        <Card noPadding>
          {sessionsLoading ? <Spinner text="Chargement des sessions..." /> : !sessions?.results?.length ? (
            <Empty message="Aucune session d'examen" icon={<BookOpen className="w-8 h-8" />} />
          ) : (
            <div className="divide-y divide-gray-50">
              {sessions.results.map((session: ExamSession) => (
                <div key={session.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      session.is_open ? 'bg-emerald-100' : 'bg-gray-100'
                    }`}>
                      <BookOpen className={`w-5 h-5 ${session.is_open ? 'text-emerald-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-sm">{session.semester}</p>
                        <Badge label={session.session_type_display}
                          className={session.session_type === 'session1' ? 'badge-blue' : 'badge-orange'} />
                        {session.is_open && <Badge label="Ouverte" className="badge-green" dot />}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {session.start_date ? formatDate(session.start_date) : '—'}
                        {session.end_date ? ` → ${formatDate(session.end_date)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!session.is_open ? (
                      <Button variant="secondary" size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />}
                        loading={openSession.isPending}
                        onClick={() => openSession.mutate(session.id)}>
                        Ouvrir
                      </Button>
                    ) : (
                      <Button variant="danger" size="sm"
                        loading={closeSession.isPending}
                        onClick={() => closeSession.mutate(session.id)}>
                        Fermer
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Notes */}
      {tab === 'notes' && (
        <>
          <Card noPadding>
            <div className="p-4 flex flex-col sm:flex-row gap-3">
              <Input placeholder="Rechercher par étudiant, EC..." leftIcon={<Search className="w-4 h-4" />}
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
              <select value={sessionFilter} onChange={e => { setSessionFilter(e.target.value); setPage(1) }}
                className="input w-full sm:w-52">
                <option value="">Toutes les sessions</option>
                {sessions?.results?.map((s: ExamSession) => (
                  <option key={s.id} value={s.id}>{s.semester} — {s.session_type_display}</option>
                ))}
              </select>
            </div>
          </Card>

          <Card noPadding>
            {gradesLoading ? <Spinner text="Chargement des notes..." /> : !grades?.results?.length ? (
              <Empty message="Aucune note saisie" icon={<Award className="w-8 h-8" />} />
            ) : (
              <>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Étudiant</th>
                        <th>EC</th>
                        <th>CC</th>
                        <th>Examen</th>
                        <th>Note finale</th>
                        <th>Statut</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.results.map((grade: Grade) => (
                        <tr key={grade.id}>
                          <td className="font-semibold text-gray-900 text-sm">{grade.student_name}</td>
                          <td>
                            <span className="font-mono text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-md">
                              {grade.ec_code}
                            </span>
                          </td>
                          <td className="text-sm text-gray-600">
                            {grade.cc_grade != null ? `${Number(grade.cc_grade).toFixed(2)}/20` : '—'}
                          </td>
                          <td className="text-sm text-gray-600">
                            {grade.exam_grade != null ? `${Number(grade.exam_grade).toFixed(2)}/20` : '—'}
                          </td>
                          <td>
                            <span className={`font-bold text-sm ${
                              grade.final_grade == null ? 'text-gray-400' :
                              Number(grade.final_grade) >= 10 ? 'text-emerald-600' : 'text-red-500'
                            }`}>
                              {grade.final_grade != null ? `${Number(grade.final_grade).toFixed(2)}/20` : '—'}
                            </span>
                            {grade.is_absent && <span className="ml-1 text-xs text-red-500">(ABS)</span>}
                          </td>
                          <td>
                            <Badge label={grade.status} className={statusGrade[grade.status] ?? 'badge-gray'} dot />
                          </td>
                          <td className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />}
                                onClick={() => setSelectedGrade(grade)} />
                              {grade.status === 'saisie' && (
                                <Button variant="secondary" size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />}
                                  loading={validateGrade.isPending}
                                  onClick={() => validateGrade.mutate(grade.id)}>
                                  Valider
                                </Button>
                              )}
                              {grade.status === 'validee' && (
                                <Button size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />}
                                  loading={publishGrade.isPending}
                                  onClick={() => publishGrade.mutate(grade.id)}>
                                  Publier
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={page} total={grades.count} pageSize={20} onChange={setPage} />
              </>
            )}
          </Card>
        </>
      )}

      {/* Résultats semestriels */}
      {tab === 'results' && (
        <Card noPadding>
          {resultsLoading ? <Spinner text="Chargement des résultats..." /> : !results?.results?.length ? (
            <Empty message="Aucun résultat disponible" icon={<BarChart3 className="w-8 h-8" />} />
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Étudiant</th>
                      <th>Semestre</th>
                      <th>Moyenne</th>
                      <th>Crédits</th>
                      <th>Décision</th>
                      <th>Rang</th>
                      <th>Publié</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.results.map((result: SemesterResult) => (
                      <tr key={result.id}>
                        <td className="font-semibold text-gray-900 text-sm">{result.student}</td>
                        <td className="text-sm text-gray-600">{result.semester_label}</td>
                        <td>
                          <span className={`font-bold text-sm ${
                            result.average == null ? 'text-gray-400' :
                            Number(result.average) >= 10 ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {result.average != null ? `${Number(result.average).toFixed(2)}/20` : '—'}
                          </span>
                        </td>
                        <td className="text-sm text-gray-600">{result.credits_obtained}/{result.semester}</td>
                        <td>
                          {result.decision && (
                            <Badge label={result.decision_display}
                              className={result.decision === 'admis' ? 'badge-green' : 'badge-red'} />
                          )}
                        </td>
                        <td className="text-sm text-gray-500">
                          {result.rank ? `#${result.rank}` : '—'}
                        </td>
                        <td>
                          {result.published
                            ? <Badge label="Publié" className="badge-green" dot />
                            : <Badge label="Non publié" className="badge-gray" dot />
                          }
                        </td>
                        <td className="text-right">
                          {!result.published && (
                            <Button variant="secondary" size="sm">Publier</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={results.count} pageSize={20} onChange={setPage} />
            </>
          )}
        </Card>
      )}

      {/* Réclamations */}
      {tab === 'contests' && (
        <Card noPadding>
          {!(contests as { results?: GradeContest[] })?.results?.length ? (
            <Empty message="Aucune réclamation en cours" icon={<AlertTriangle className="w-8 h-8" />}
              description="Les réclamations des étudiants apparaîtront ici" />
          ) : (
            <div className="divide-y divide-gray-50">
              {(contests as { results: GradeContest[] }).results.map((contest: GradeContest) => (
                <div key={contest.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{contest.student}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{contest.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge label={contest.status_display}
                        className={statusColor(contest.status)} />
                      {contest.status === 'soumise' && (
                        <div className="flex gap-1">
                          <Button variant="success" size="xs">Accepter</Button>
                          <Button variant="danger" size="xs">Rejeter</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Grade Detail Modal */}
      <Modal open={!!selectedGrade} onClose={() => setSelectedGrade(null)}
        title="Détail de la note" size="sm">
        {selectedGrade && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Étudiant', selectedGrade.student_name],
                ['EC', selectedGrade.ec_code],
                ['CC', selectedGrade.cc_grade != null ? `${Number(selectedGrade.cc_grade).toFixed(2)}/20` : '—'],
                ['Examen', selectedGrade.exam_grade != null ? `${Number(selectedGrade.exam_grade).toFixed(2)}/20` : '—'],
                ['Note finale', selectedGrade.final_grade != null ? `${Number(selectedGrade.final_grade).toFixed(2)}/20` : '—'],
                ['Statut', selectedGrade.status],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">{label}</p>
                  <p className="font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
            {selectedGrade.is_absent && (
              <Alert type="warning">Étudiant absent à cet examen.</Alert>
            )}
          </div>
        )}
      </Modal>

      {/* Create Session Modal */}
      <Modal open={createSessionOpen} onClose={() => setCreateSessionOpen(false)}
        title="Nouvelle session d'examen" size="md">
        <CreateSessionForm
          onSuccess={() => { setCreateSessionOpen(false); queryClient.invalidateQueries({ queryKey: ['exam-sessions'] }) }}
          onCancel={() => setCreateSessionOpen(false)}
        />
      </Modal>
    </div>
  )
}

function CreateSessionForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ semester: '', academic_year: '', session_type: 'session1', start_date: '', end_date: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: years } = useQuery({ queryKey: ['years-list'], queryFn: () => academicApi.getAcademicYears().then(r => r.data) })

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.semester || !form.academic_year) { toast.error('Semestre et année requis'); return }
    setLoading(true)
    try {
      await evaluationApi.createExamSession(form)
      toast.success('Session créée')
      onSuccess()
    } catch { toast.error('Erreur lors de la création') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Semestre (ID)</label>
        <input className="input" value={form.semester} onChange={e => set('semester', e.target.value)} placeholder="ID du semestre" />
      </div>
      <div>
        <label className="label">Année académique</label>
        <select className="input bg-white" value={form.academic_year} onChange={e => set('academic_year', e.target.value)}>
          <option value="">— Sélectionner —</option>
          {years?.results?.map((y: { id: string; label: string }) => (
            <option key={y.id} value={y.id}>{y.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Type de session</label>
        <select className="input bg-white" value={form.session_type} onChange={e => set('session_type', e.target.value)}>
          <option value="session1">Session 1 (Normale)</option>
          <option value="session2">Session 2 (Rattrapage)</option>
        </select>
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
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={loading}>Créer la session</Button>
      </div>
    </form>
  )
}

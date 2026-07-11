import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Award, Plus, CheckCircle, BookOpen, BarChart3,
  Upload, Download, Eye, ClipboardList, AlertTriangle, Gavel, Lock,
  MapPin, Clock, Users, Trash2,
} from 'lucide-react'
import { evaluationApi, academicApi, authApi } from '../../api'
import {
  Button, Input, Badge, Spinner, Empty, Pagination,
  Modal, Card, StatsCard, Alert, Tabs, Select
} from '../../components/ui'
import { formatDate, statusColor } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import { useExcel } from '../../hooks/useExcel'
import { saveAs } from 'file-saver'
import type { Grade, ExamSession, SemesterResult, GradeContest } from '../../types'

type Tab = 'sessions' | 'notes' | 'results' | 'contests' | 'jury' | 'planning'

interface RoomAssignmentT {
  id: string; exam_session: string; ec: string; ec_code: string; ec_name: string
  room: string | null; room_name: string | null; invigilator_names: string[]
  start_datetime: string; end_datetime: string; notes: string
}

interface JuryT {
  id: string; exam_session: string; exam_session_label: string
  president_name: string | null; member_names: string[]
  deliberation_date: string | null; is_closed: boolean
}

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
  const [contestAction, setContestAction] = useState<{ contest: GradeContest; type: 'accept' | 'reject' } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const toast = useToast()
  const { importFromExcel } = useExcel()

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

  const { data: juries, isLoading: juriesLoading } = useQuery({
    queryKey: ['juries'],
    queryFn: () => evaluationApi.getJuries().then(r => r.data),
    enabled: tab === 'jury',
  })

  const { data: roomAssignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['exam-room-assignments', sessionFilter],
    queryFn: () => evaluationApi.getRoomAssignments({ exam_session: sessionFilter || undefined }).then(r => r.data),
    enabled: tab === 'planning',
  })

  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false)

  const deleteAssignment = useMutation({
    mutationFn: (id: string) => evaluationApi.deleteRoomAssignment(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exam-room-assignments'] }); toast.success('Planification supprimée') },
  })

  const [createJuryOpen, setCreateJuryOpen] = useState(false)

  const closeJury = useMutation({
    mutationFn: (id: string) => evaluationApi.updateJury(id, { is_closed: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['juries'] }); toast.success('Jury clôturé') },
  })

  const handleDownloadPV = async (examSessionId: string) => {
    const tid = toast.loading('Génération du PV...')
    try {
      const res = await evaluationApi.downloadPV({ exam_session: examSessionId })
      saveAs(new Blob([res.data], { type: 'application/pdf' }), 'pv_deliberation.pdf')
      toast.dismiss(tid); toast.success('PV téléchargé')
    } catch { toast.dismiss(tid); toast.error('Erreur lors de la génération du PV') }
  }

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

  const handleDownloadTemplate = async () => {
    try {
      const res = await evaluationApi.downloadTemplate()
      saveAs(new Blob([res.data]), 'modele_notes.xlsx')
    } catch { toast.error('Erreur lors du téléchargement du modèle') }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    const tid = toast.loading('Import en cours...')
    try {
      const rows = await importFromExcel(file) as Record<string, unknown>[]
      const allGrades = await evaluationApi.getGrades({
        exam_session: sessionFilter || undefined, page_size: 1000,
      }).then(r => (r.data as { results: Grade[] }).results)

      let updated = 0, skipped = 0
      for (const row of rows) {
        const name = String(row['Nom complet'] ?? '').trim().toLowerCase()
        const ec = String(row['EC'] ?? '').trim().toLowerCase()
        const match = allGrades.find(g => g.student_name.trim().toLowerCase() === name && g.ec_code.trim().toLowerCase() === ec)
        if (!match) { skipped++; continue }
        const ccRaw = row['Note CC (0-20)']
        const examRaw = row['Note Examen (0-20)']
        const isAbsent = String(row['Absent (OUI/NON)'] ?? 'NON').trim().toUpperCase() === 'OUI'
        await evaluationApi.updateGrade(match.id, {
          cc_grade: ccRaw !== undefined && ccRaw !== '' ? Number(ccRaw) : match.cc_grade,
          exam_grade: examRaw !== undefined && examRaw !== '' ? Number(examRaw) : match.exam_grade,
          is_absent: isAbsent,
        })
        updated++
      }
      queryClient.invalidateQueries({ queryKey: ['grades'] })
      toast.dismiss(tid)
      toast.success(`${updated} note(s) mise(s) à jour${skipped ? ` — ${skipped} ligne(s) non reconnue(s) (vérifiez Nom complet / EC)` : ''}`)
    } catch {
      toast.dismiss(tid)
      toast.error('Fichier invalide — utilisez le modèle fourni')
    } finally {
      setImporting(false)
    }
  }

  const acceptContest = useMutation({
    mutationFn: ({ id, response, newGrade }: { id: string; response: string; newGrade?: number }) =>
      evaluationApi.acceptContest(id, { response, new_grade: newGrade }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-contests'] })
      queryClient.invalidateQueries({ queryKey: ['grades'] })
      toast.success('Réclamation acceptée')
      setContestAction(null)
    },
    onError: () => toast.error('Erreur lors du traitement'),
  })

  const rejectContest = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      evaluationApi.rejectContest(id, { response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-contests'] })
      toast.success('Réclamation rejetée')
      setContestAction(null)
    },
    onError: () => toast.error('Erreur lors du traitement'),
  })

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
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Sessions d'examens, saisie des notes et publication des résultats</p>
        </div>
        <div className="flex gap-2">
          {tab === 'notes' && (
            <>
              <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}
                onClick={handleExportGrades}>Exporter</Button>
              <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                Modèle
              </Button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
              <Button variant="secondary" size="sm" icon={<Upload className="w-4 h-4" />} loading={importing}
                onClick={() => fileInputRef.current?.click()}>
                Importer Excel
              </Button>
            </>
          )}
          {tab === 'sessions' && (
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateSessionOpen(true)}>
              Nouvelle session
            </Button>
          )}
          {tab === 'jury' && (
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateJuryOpen(true)}>
              Nouveau jury
            </Button>
          )}
          {tab === 'planning' && (
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateAssignmentOpen(true)}>
              Planifier un examen
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
          { key: 'jury', label: 'Jurys & PV', icon: <Gavel className="w-4 h-4" /> },
          { key: 'planning', label: 'Salles & surveillants', icon: <MapPin className="w-4 h-4" /> },
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
                      <BookOpen className={`w-5 h-5 ${session.is_open ? 'text-emerald-600' : 'text-gray-400 dark:text-gray-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 dark:text-gray-50 text-sm">{session.semester}</p>
                        <Badge label={session.session_type_display}
                          className={session.session_type === 'session1' ? 'badge-blue' : 'badge-orange'} />
                        {session.is_open && <Badge label="Ouverte" className="badge-green" dot />}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
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
                          <td className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{grade.student_name}</td>
                          <td>
                            <span className="font-mono text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-md">
                              {grade.ec_code}
                            </span>
                          </td>
                          <td className="text-sm text-gray-600 dark:text-gray-400">
                            {grade.cc_grade != null ? `${Number(grade.cc_grade).toFixed(2)}/20` : '—'}
                          </td>
                          <td className="text-sm text-gray-600 dark:text-gray-400">
                            {grade.exam_grade != null ? `${Number(grade.exam_grade).toFixed(2)}/20` : '—'}
                          </td>
                          <td>
                            <span className={`font-bold text-sm ${
                              grade.final_grade == null ? 'text-gray-400 dark:text-gray-500' :
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
                        <td className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{result.student}</td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{result.semester_label}</td>
                        <td>
                          <span className={`font-bold text-sm ${
                            result.average == null ? 'text-gray-400 dark:text-gray-500' :
                            Number(result.average) >= 10 ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {result.average != null ? `${Number(result.average).toFixed(2)}/20` : '—'}
                          </span>
                        </td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{result.credits_obtained}/{result.semester}</td>
                        <td>
                          {result.decision && (
                            <Badge label={result.decision_display}
                              className={result.decision === 'admis' ? 'badge-green' : 'badge-red'} />
                          )}
                        </td>
                        <td className="text-sm text-gray-500 dark:text-gray-400">
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
                        <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{contest.student}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{contest.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge label={contest.status_display}
                        className={statusColor(contest.status)} />
                      {contest.status === 'soumise' && (
                        <div className="flex gap-1">
                          <Button variant="success" size="xs"
                            onClick={() => setContestAction({ contest, type: 'accept' })}>Accepter</Button>
                          <Button variant="danger" size="xs"
                            onClick={() => setContestAction({ contest, type: 'reject' })}>Rejeter</Button>
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

      {/* Jurys & PV */}
      {tab === 'jury' && (
        <Card noPadding>
          {juriesLoading ? <Spinner text="Chargement des jurys..." /> : !(juries as { results?: JuryT[] })?.results?.length ? (
            <Empty message="Aucun jury constitué" icon={<Gavel className="w-8 h-8" />}
              description="Créez un jury pour une session d'examen afin de générer le PV de délibération." />
          ) : (
            <div className="divide-y divide-gray-50">
              {(juries as { results: JuryT[] }).results.map(jury => (
                <div key={jury.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Gavel className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{jury.exam_session_label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Président : {jury.president_name ?? '—'}
                        {jury.member_names?.length > 0 && <> · Membres : {jury.member_names.join(', ')}</>}
                      </p>
                      {jury.deliberation_date && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Délibération le {formatDate(jury.deliberation_date)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge label={jury.is_closed ? 'Clôturé' : 'Ouvert'} className={jury.is_closed ? 'badge-gray' : 'badge-green'} dot />
                    <Button variant="secondary" size="xs" icon={<Download className="w-3.5 h-3.5" />}
                      onClick={() => handleDownloadPV(jury.exam_session)}>PV</Button>
                    {!jury.is_closed && (
                      <Button variant="ghost" size="xs" icon={<Lock className="w-3.5 h-3.5" />}
                        loading={closeJury.isPending} onClick={() => closeJury.mutate(jury.id)}>Clôturer</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'planning' && (
        <Card noPadding>
          {assignmentsLoading ? <Spinner text="Chargement de la planification..." /> : !(roomAssignments as { results?: RoomAssignmentT[] })?.results?.length ? (
            <Empty message="Aucun examen planifié" icon={<MapPin className="w-8 h-8" />}
              description="Assignez une salle, un créneau et des surveillants pour chaque EC à examiner." />
          ) : (
            <div className="divide-y divide-gray-50">
              {(roomAssignments as { results: RoomAssignmentT[] }).results.map(ra => (
                <div key={ra.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{ra.ec_name} <span className="text-gray-400 dark:text-gray-500 font-normal">({ra.ec_code})</span></p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ra.room_name ?? 'Salle non définie'}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(ra.start_datetime, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                      {ra.invigilator_names?.length > 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {ra.invigilator_names.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="xs" icon={<Trash2 className="w-3.5 h-3.5" />}
                    loading={deleteAssignment.isPending} onClick={() => deleteAssignment.mutate(ra.id)} />
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
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{value}</p>
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

      {/* Create Jury Modal */}
      <Modal open={createJuryOpen} onClose={() => setCreateJuryOpen(false)} title="Nouveau jury" size="md">
        <CreateJuryForm onSuccess={() => { setCreateJuryOpen(false); queryClient.invalidateQueries({ queryKey: ['juries'] }) }} onCancel={() => setCreateJuryOpen(false)} />
      </Modal>

      {/* Create Room Assignment Modal */}
      <Modal open={createAssignmentOpen} onClose={() => setCreateAssignmentOpen(false)} title="Planifier un examen" size="md">
        <CreateAssignmentForm
          onSuccess={() => { setCreateAssignmentOpen(false); queryClient.invalidateQueries({ queryKey: ['exam-room-assignments'] }) }}
          onCancel={() => setCreateAssignmentOpen(false)}
        />
      </Modal>

      {/* Contest response modal */}
      <Modal open={!!contestAction} onClose={() => setContestAction(null)}
        title={contestAction?.type === 'accept' ? 'Accepter la réclamation' : 'Rejeter la réclamation'}
        subtitle={contestAction?.contest.student} size="sm">
        {contestAction && (
          <ContestResponseForm
            type={contestAction.type}
            reason={contestAction.contest.reason}
            loading={contestAction.type === 'accept' ? acceptContest.isPending : rejectContest.isPending}
            onSubmit={(response, newGrade) => {
              if (contestAction.type === 'accept') acceptContest.mutate({ id: contestAction.contest.id, response, newGrade })
              else rejectContest.mutate({ id: contestAction.contest.id, response })
            }}
            onCancel={() => setContestAction(null)}
          />
        )}
      </Modal>
    </div>
  )
}

function ContestResponseForm({ type, reason, loading, onSubmit, onCancel }: {
  type: 'accept' | 'reject'; reason: string; loading: boolean
  onSubmit: (response: string, newGrade?: number) => void; onCancel: () => void
}) {
  const [response, setResponse] = useState('')
  const [newGrade, setNewGrade] = useState('')

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold mb-1">Motif de l'étudiant</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">{reason}</p>
      </div>
      {type === 'accept' && (
        <div>
          <label className="label">Nouvelle note (facultatif)</label>
          <input type="number" min={0} max={20} step={0.25} className="input"
            value={newGrade} onChange={e => setNewGrade(e.target.value)} placeholder="Laisser vide pour ne pas modifier" />
        </div>
      )}
      <div>
        <label className="label">Réponse à l'étudiant *</label>
        <textarea className="input min-h-[90px] resize-none" value={response}
          onChange={e => setResponse(e.target.value)}
          placeholder={type === 'accept' ? 'Ex: Erreur de saisie corrigée après vérification de la copie.' : 'Ex: Note vérifiée et confirmée conforme au barème.'} />
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" variant={type === 'accept' ? 'success' : 'danger'} loading={loading}
          disabled={!response.trim()}
          onClick={() => onSubmit(response, newGrade ? Number(newGrade) : undefined)}>
          {type === 'accept' ? 'Confirmer l\'acceptation' : 'Confirmer le rejet'}
        </Button>
      </div>
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
        <select className="input bg-white dark:bg-slate-900" value={form.academic_year} onChange={e => set('academic_year', e.target.value)}>
          <option value="">— Sélectionner —</option>
          {years?.results?.map((y: { id: string; label: string }) => (
            <option key={y.id} value={y.id}>{y.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Type de session</label>
        <select className="input bg-white dark:bg-slate-900" value={form.session_type} onChange={e => set('session_type', e.target.value)}>
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
      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={loading}>Créer la session</Button>
      </div>
    </form>
  )
}

function CreateJuryForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ exam_session: '', president: '', members: [] as string[], deliberation_date: '' })
  const [loading, setLoading] = useState(false)

  const { data: sessions } = useQuery({
    queryKey: ['exam-sessions-for-jury'],
    queryFn: () => evaluationApi.getExamSessions({ page_size: 100 }).then(r => r.data),
  })
  const { data: users } = useQuery({
    queryKey: ['users-for-jury'],
    queryFn: () => authApi.getUsers({ page_size: 200 }).then(r => r.data),
  })

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.exam_session || !form.president) { toast.error('Session et président requis'); return }
    setLoading(true)
    try {
      await evaluationApi.createJury({
        exam_session: form.exam_session, president: form.president,
        members: form.members, deliberation_date: form.deliberation_date || undefined,
      })
      toast.success('Jury créé')
      onSuccess()
    } catch { toast.error('Erreur lors de la création du jury') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Session d'examen *</label>
        <select className="input bg-white dark:bg-slate-900" value={form.exam_session} onChange={e => setForm(f => ({ ...f, exam_session: e.target.value }))}>
          <option value="">— Sélectionner —</option>
          {sessions?.results?.map((s: ExamSession) => (
            <option key={s.id} value={s.id}>{s.semester} — {s.session_type_display}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Président *</label>
        <select className="input bg-white dark:bg-slate-900" value={form.president} onChange={e => setForm(f => ({ ...f, president: e.target.value }))}>
          <option value="">— Sélectionner —</option>
          {users?.results?.map((u: { id: string; full_name: string }) => (
            <option key={u.id} value={u.id}>{u.full_name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Membres</label>
        <div className="max-h-36 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-2 space-y-1">
          {users?.results?.map((u: { id: string; full_name: string }) => (
            <label key={u.id} className="flex items-center gap-2 text-sm p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <input type="checkbox" checked={form.members.includes(u.id)}
                onChange={e => setForm(f => ({ ...f, members: e.target.checked ? [...f.members, u.id] : f.members.filter(id => id !== u.id) }))} />
              {u.full_name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Date de délibération</label>
        <input type="datetime-local" className="input" value={form.deliberation_date} onChange={e => setForm(f => ({ ...f, deliberation_date: e.target.value }))} />
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={loading}>Créer le jury</Button>
      </div>
    </form>
  )
}

function CreateAssignmentForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ exam_session: '', ec: '', room: '', start_datetime: '', end_datetime: '', invigilators: [] as string[], notes: '' })
  const [loading, setLoading] = useState(false)

  const { data: sessions } = useQuery({
    queryKey: ['exam-sessions-for-assignment'],
    queryFn: () => evaluationApi.getExamSessions({ page_size: 100 }).then(r => r.data),
  })
  const { data: ecs } = useQuery({
    queryKey: ['ecs-for-assignment'],
    queryFn: () => import('../../api').then(({ programsApi }) => programsApi.getECs({ page_size: 200 }).then(r => r.data)),
  })
  const { data: rooms } = useQuery({
    queryKey: ['rooms-for-assignment'],
    queryFn: () => import('../../api').then(({ schedulingApi }) => schedulingApi.getRooms({ page_size: 100 }).then(r => r.data)),
  })
  const { data: teachers } = useQuery({
    queryKey: ['teachers-for-assignment'],
    queryFn: () => import('../../api').then(({ teachersApi }) => teachersApi.getTeachers({ page_size: 200 }).then(r => r.data)),
  })

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.exam_session || !form.ec || !form.start_datetime || !form.end_datetime) {
      toast.error('Session, EC et créneau requis'); return
    }
    setLoading(true)
    try {
      await evaluationApi.createRoomAssignment({
        exam_session: form.exam_session, ec: form.ec, room: form.room || undefined,
        start_datetime: form.start_datetime, end_datetime: form.end_datetime,
        invigilators: form.invigilators, notes: form.notes,
      })
      toast.success('Examen planifié')
      onSuccess()
    } catch { toast.error('Erreur — vérifiez qu\'une planification n\'existe pas déjà pour cet EC') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Session d'examen *</label>
        <select className="input bg-white dark:bg-slate-900" value={form.exam_session} onChange={e => setForm(f => ({ ...f, exam_session: e.target.value }))}>
          <option value="">— Sélectionner —</option>
          {sessions?.results?.map((s: ExamSession) => (
            <option key={s.id} value={s.id}>{s.semester} — {s.session_type_display}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">EC à examiner *</label>
        <select className="input bg-white dark:bg-slate-900" value={form.ec} onChange={e => setForm(f => ({ ...f, ec: e.target.value }))}>
          <option value="">— Sélectionner —</option>
          {ecs?.results?.map((ec: { id: string; code: string; name: string }) => (
            <option key={ec.id} value={ec.id}>{ec.code} — {ec.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Salle</label>
        <select className="input bg-white dark:bg-slate-900" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))}>
          <option value="">— Non définie —</option>
          {rooms?.results?.map((r: { id: string; name: string; code: string }) => (
            <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Début *</label>
          <input type="datetime-local" className="input" value={form.start_datetime} onChange={e => setForm(f => ({ ...f, start_datetime: e.target.value }))} />
        </div>
        <div>
          <label className="label">Fin *</label>
          <input type="datetime-local" className="input" value={form.end_datetime} onChange={e => setForm(f => ({ ...f, end_datetime: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="label">Surveillants</label>
        <div className="max-h-36 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-2 space-y-1">
          {teachers?.results?.map((t: { id: string; user: { id: string; full_name: string } }) => (
            <label key={t.id} className="flex items-center gap-2 text-sm p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <input type="checkbox" checked={form.invigilators.includes(t.user.id)}
                onChange={e => setForm(f => ({ ...f, invigilators: e.target.checked ? [...f.invigilators, t.user.id] : f.invigilators.filter(id => id !== t.user.id) }))} />
              {t.user.full_name}
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={loading}>Planifier</Button>
      </div>
    </form>
  )
}

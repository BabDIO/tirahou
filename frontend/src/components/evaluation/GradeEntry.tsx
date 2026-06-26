import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Button, Input, Badge, Spinner, Alert, StatsCard } from '../ui'
import { Save, Calculator, CheckCircle } from 'lucide-react'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

interface GradeItem {
  id: number
  student: { id: number; name: string; student_number: string; email?: string }
  ec: { id: number; name: string; code: string; credits: number }
  cc_grade: number | null
  exam_grade: number | null
  score: number | null
  status: 'en_attente' | 'validee' | 'contestee'
  appreciation: string
  cc_weight: number
}

interface GradeEntryPayload {
  student_id: number
  ec_id: number
  exam_session_id: number
  cc_grade: number
  exam_grade: number
}

const statusBadge: Record<string, string> = {
  validee: 'badge-green',
  en_attente: 'badge-yellow',
  contestee: 'badge-red',
}

const GradeEntry = () => {
  const [selectedEC, setSelectedEC] = useState<number | null>(null)
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [grades, setGrades] = useState<Record<number, { cc: string; exam: string }>>({})
  const [bulkMode, setBulkMode] = useState(false)
  const queryClient = useQueryClient()

  const { data: teacherECs, isLoading: loadingECs } = useQuery({
    queryKey: ['teacher', 'ecs'],
    queryFn: () => api.get('/evaluation/teacher/ecs/').then(r => r.data),
  })

  const { data: examSessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['exam-sessions-list'],
    queryFn: () => api.get('/exam-sessions/').then(r => r.data),
  })

  const { data: existingGrades } = useQuery({
    queryKey: ['teacher', 'grades', selectedEC, selectedSession],
    queryFn: () =>
      api.get(`/evaluation/teacher/grades/?ec=${selectedEC}&session=${selectedSession}`).then(r => r.data),
    enabled: !!(selectedEC && selectedSession),
  })

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['teacher', 'students', selectedEC],
    queryFn: () => api.get(`/evaluation/teacher/students/?ec=${selectedEC}`).then(r => r.data),
    enabled: !!selectedEC,
  })

  const enterGradeMutation = useMutation({
    mutationFn: (payload: GradeEntryPayload) => api.post('/evaluation/teacher/enter-grade/', payload),
    onSuccess: () => {
      toast.success('Note enregistrée')
      queryClient.invalidateQueries({ queryKey: ['teacher', 'grades'] })
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error ?? "Erreur lors de l'enregistrement")
    },
  })

  const handleGradeChange = (studentId: number, type: 'cc' | 'exam', value: string) => {
    setGrades(prev => ({ ...prev, [studentId]: { ...prev[studentId], [type]: value } }))
  }

  const handleSaveGrade = (studentId: number) => {
    if (!selectedEC || !selectedSession) return
    const g = grades[studentId]
    if (!g?.cc || !g?.exam) { toast.error('CC et Examen requis'); return }
    const cc = parseFloat(g.cc)
    const exam = parseFloat(g.exam)
    if (cc < 0 || cc > 20 || exam < 0 || exam > 20) { toast.error('Notes entre 0 et 20'); return }
    enterGradeMutation.mutate({ student_id: studentId, ec_id: selectedEC, exam_session_id: selectedSession, cc_grade: cc, exam_grade: exam })
  }

  const handleBulkSave = () => {
    if (!selectedEC || !selectedSession) return
    const toSave = Object.entries(grades)
      .filter(([, g]) => g.cc && g.exam)
      .map(([id, g]) => ({
        student_id: parseInt(id), ec_id: selectedEC!, exam_session_id: selectedSession!,
        cc_grade: parseFloat(g.cc), exam_grade: parseFloat(g.exam),
      }))
    if (!toSave.length) { toast.error('Aucune note à enregistrer'); return }
    Promise.all(toSave.map(p => api.post('/evaluation/teacher/enter-grade/', p)))
      .then(() => { toast.success(`${toSave.length} notes enregistrées`); queryClient.invalidateQueries({ queryKey: ['teacher', 'grades'] }); setGrades({}) })
      .catch(() => toast.error("Erreur lors de l'enregistrement en masse"))
  }

  const calcFinal = (cc: number, exam: number, w = 0.4) => (cc * w + exam * (1 - w)).toFixed(2)

  if (loadingECs || loadingSessions) return <Spinner text="Chargement..." />

  const saisies = existingGrades?.filter((g: GradeItem) => g.score !== null).length ?? 0
  const admis = existingGrades?.filter((g: GradeItem) => (g.score ?? 0) >= 10).length ?? 0
  const moyenne = saisies > 0
    ? (existingGrades.filter((g: GradeItem) => g.score !== null)
        .reduce((s: number, g: GradeItem) => s + (g.score ?? 0), 0) / saisies).toFixed(2)
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Saisie des notes</h1>
          <p className="text-gray-500 text-sm">Gérer les notes de vos étudiants</p>
        </div>
        <Button
          variant={bulkMode ? 'primary' : 'secondary'}
          icon={bulkMode ? <CheckCircle className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
          onClick={() => setBulkMode(b => !b)}
        >
          {bulkMode ? 'Mode individuel' : 'Mode en masse'}
        </Button>
      </div>

      {/* Stats */}
      {saisies > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatsCard title="Notes saisies" value={saisies} icon={<Save className="w-5 h-5" />} color="bg-primary-600" />
          <StatsCard title="Moyenne" value={moyenne ? `${moyenne}/20` : '—'} icon={<Calculator className="w-5 h-5" />} color="bg-emerald-500" />
          <StatsCard title="Admis" value={admis} icon={<CheckCircle className="w-5 h-5" />} color="bg-green-500" />
          <StatsCard title="Ajournés" value={saisies - admis} icon={<Save className="w-5 h-5" />} color="bg-red-500" />
        </div>
      )}

      {/* Sélecteurs */}
      <Card title="Sélection du cours et de la session">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Élément Constitutif (EC)</label>
            <select className="input bg-white"
              value={selectedEC?.toString() ?? ''}
              onChange={e => setSelectedEC(e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">— Sélectionner un EC —</option>
              {teacherECs?.map((ec: { id: number; code: string; name: string; credits: number }) => (
                <option key={ec.id} value={ec.id}>{ec.code} — {ec.name} ({ec.credits} cr.)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Session d'examen</label>
            <select className="input bg-white"
              value={selectedSession?.toString() ?? ''}
              onChange={e => setSelectedSession(e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">— Sélectionner une session —</option>
              {examSessions?.results?.map((s: { id: number; semester: string; session_type_display: string }) => (
                <option key={s.id} value={s.id}>{s.semester} — {s.session_type_display}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Tableau de saisie */}
      {selectedEC && selectedSession && (
        <Card title="Notes des étudiants" action={
          bulkMode ? (
            <Button size="sm" icon={<Save className="w-4 h-4" />}
              onClick={handleBulkSave} disabled={!Object.keys(grades).length}>
              Tout enregistrer ({Object.keys(grades).length})
            </Button>
          ) : undefined
        }>
          {loadingStudents ? <Spinner text="Chargement des étudiants..." /> :
            !students?.length ? (
              <Alert type="info">Aucun étudiant inscrit à cet EC.</Alert>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Étudiant</th>
                      <th className="text-center">N° Étudiant</th>
                      <th className="text-center">CC (40%)</th>
                      <th className="text-center">Examen (60%)</th>
                      <th className="text-center">Note finale</th>
                      <th className="text-center">Appréciation</th>
                      <th className="text-center">Statut</th>
                      {!bulkMode && <th className="text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student: { id: number; name: string; email?: string; student_number: string }) => {
                      const existing = existingGrades?.find((g: GradeItem) => g.student.id === student.id)
                      const cur = grades[student.id] ?? { cc: '', exam: '' }
                      const ccVal = (cur.cc || existing?.cc_grade?.toString()) ?? ''
                      const examVal = (cur.exam || existing?.exam_grade?.toString()) ?? ''
                      const final = ccVal && examVal ? Number(calcFinal(parseFloat(ccVal), parseFloat(examVal))) : existing?.score
                      const locked = existing?.status === 'validee'

                      return (
                        <tr key={student.id}>
                          <td>
                            <div className="font-medium text-sm text-gray-900">{student.name}</div>
                            {student.email && <div className="text-xs text-gray-400">{student.email}</div>}
                          </td>
                          <td className="text-center font-mono text-sm">{student.student_number}</td>
                          <td className="text-center">
                            <input type="number" min="0" max="20" step="0.25"
                              value={ccVal}
                              onChange={e => handleGradeChange(student.id, 'cc', e.target.value)}
                              className="input w-20 text-center py-1"
                              placeholder="0-20" disabled={locked} />
                          </td>
                          <td className="text-center">
                            <input type="number" min="0" max="20" step="0.25"
                              value={examVal}
                              onChange={e => handleGradeChange(student.id, 'exam', e.target.value)}
                              className="input w-20 text-center py-1"
                              placeholder="0-20" disabled={locked} />
                          </td>
                          <td className="text-center">
                            <span className={`font-bold text-sm ${final == null ? 'text-gray-400' : final >= 10 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {final != null ? `${typeof final === 'number' ? final.toFixed(2) : final}/20` : '—'}
                            </span>
                          </td>
                          <td className="text-center text-xs text-gray-500">
                            {existing?.appreciation || (final == null ? '—' :
                              final >= 16 ? 'Très bien' : final >= 14 ? 'Bien' :
                              final >= 12 ? 'Assez bien' : final >= 10 ? 'Passable' : 'Insuffisant')}
                          </td>
                          <td className="text-center">
                            {existing
                              ? <Badge label={existing.status === 'validee' ? 'Validée' : existing.status === 'contestee' ? 'Contestée' : 'En attente'}
                                  className={statusBadge[existing.status] ?? 'badge-gray'} />
                              : <Badge label="Non saisi" className="badge-gray" />}
                          </td>
                          {!bulkMode && (
                            <td className="text-center">
                              <Button size="xs" icon={<Save className="w-3 h-3" />}
                                loading={enterGradeMutation.isPending}
                                disabled={!cur.cc || !cur.exam || locked}
                                onClick={() => handleSaveGrade(student.id)} />
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </Card>
      )}

      {!selectedEC && (
        <Alert type="info">Sélectionnez un EC et une session d'examen pour saisir les notes.</Alert>
      )}
    </div>
  )
}

export default GradeEntry

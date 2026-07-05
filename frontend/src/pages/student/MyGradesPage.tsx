import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Award, TrendingUp, BookOpen, AlertCircle, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Modal, Alert } from '../../components/ui'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

interface Grade {
  id: string; ec_code: string; ec_name?: string; cc_grade: number | null
  exam_grade: number | null; final_grade: number | null; is_absent: boolean
  status: string; status_display: string; published_to_student: boolean
  appreciation: string
}

interface UEResult {
  id: string; ue_code: string; ue_name: string; average: number | null
  credits_obtained: number; decision: string; decision_display: string
}

interface SemesterResult {
  id: string; semester_label: string; average: number | null; mention: string
  gpa: number | null; rank: number | null; total_students_in_semester: number | null
  credits_obtained: number; total_credits: number; decision: string; decision_display: string
  published: boolean
}

const decisionColor = (d: string) => ({
  admis: 'badge-green', valide: 'badge-green', ajourné: 'badge-red',
  compense: 'badge-yellow', dette: 'badge-orange', absent: 'badge-gray',
}[d] ?? 'badge-gray')

const gradeColor = (g: number | null) => {
  if (g === null) return 'text-gray-400'
  if (g >= 16) return 'text-emerald-600 font-black'
  if (g >= 12) return 'text-blue-600 font-bold'
  if (g >= 10) return 'text-amber-600 font-bold'
  return 'text-red-600 font-bold'
}

export default function MyGradesPage() {
  const qc = useQueryClient()
  const [openSemesters, setOpenSemesters] = useState<Set<string>>(new Set())
  const [contestModal, setContestModal] = useState<Grade | null>(null)
  const [reason, setReason] = useState('')

  const { data: semResults, isLoading: loadSem } = useQuery({
    queryKey: ['my-semester-results'],
    queryFn: () => api.get('/semester-results/', { params: { published: true } }).then(r => r.data),
  })

  const { data: gradesData, isLoading: loadGrades } = useQuery({
    queryKey: ['my-grades'],
    queryFn: () => api.get('/evaluation/student/grades/').then(r => r.data),
  })

  const { data: ueResults } = useQuery({
    queryKey: ['my-ue-results'],
    queryFn: () => api.get('/ue-results/').then(r => r.data),
  })

  const contestMut = useMutation({
    mutationFn: ({ grade_id, reason }: { grade_id: string; reason: string }) =>
      api.post('/evaluation/student/contest/', { grade_id, reason }),
    onSuccess: () => { toast.success('Réclamation soumise — en attente d\'examen'); setContestModal(null); setReason('') },
    onError: () => toast.error('Erreur lors de la soumission'),
  })

  const semesters: SemesterResult[] = semResults?.results ?? []
  const grades: Grade[] = gradesData?.results ?? gradesData ?? []
  const ues: UEResult[] = ueResults?.results ?? []

  const toggleSemester = (id: string) => {
    setOpenSemesters(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const isLoading = loadSem || loadGrades

  if (isLoading) return <Spinner text="Chargement de vos notes..." />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Mes Notes</h1>
        <p className="text-gray-400 text-sm mt-0.5">Résultats académiques et relevé de notes</p>
      </div>

      {!semesters.length && !grades.length ? (
        <Empty icon={<Award className="w-8 h-8" />} message="Aucune note disponible"
          description="Vos notes seront affichées après les délibérations." />
      ) : (
        <>
          {/* Résultats semestriels */}
          {semesters.map(sem => (
            <Card key={sem.id} noPadding>
              <button onClick={() => toggleSemester(sem.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition rounded-2xl text-left">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                    sem.decision === 'admis' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {sem.average ? `${parseFloat(sem.average.toString()).toFixed(1)}` : '—'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{sem.semester_label}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge label={sem.decision_display} className={decisionColor(sem.decision)} />
                      {sem.mention && <Badge label={sem.mention} className="badge-blue" />}
                      {sem.rank && <span className="text-xs text-gray-400">#{sem.rank}/{sem.total_students_in_semester}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Crédits</p>
                    <p className="font-bold text-sm">{sem.credits_obtained}/{sem.total_credits}</p>
                  </div>
                  {sem.gpa !== null && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">GPA</p>
                      <p className="font-bold text-sm">{parseFloat(sem.gpa.toString()).toFixed(2)}</p>
                    </div>
                  )}
                  {openSemesters.has(sem.id) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {openSemesters.has(sem.id) && (
                <div className="px-4 pb-4 space-y-2">
                  {/* UE Results pour ce semestre */}
                  {ues.filter(() => true).map(ue => (
                    <div key={ue.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-semibold text-sm text-gray-900">{ue.ue_code}</span>
                          <span className="text-xs text-gray-400 ml-2">{ue.ue_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${gradeColor(ue.average ? parseFloat(ue.average.toString()) : null)}`}>
                            {ue.average ? `${parseFloat(ue.average.toString()).toFixed(2)}/20` : '—'}
                          </span>
                          <Badge label={ue.decision_display} className={decisionColor(ue.decision)} />
                        </div>
                      </div>
                      {/* Notes EC */}
                      {grades.filter(g => g.ec_code?.startsWith(ue.ue_code.split('-')[0])).map(g => (
                        <div key={g.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-100 rounded-lg">
                          <span className="text-xs text-gray-600">{g.ec_code}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-400">CC : {g.cc_grade ?? '—'}</span>
                            <span className="text-gray-400">Exam : {g.exam_grade ?? '—'}</span>
                            <span className={`font-bold ${gradeColor(g.final_grade ? parseFloat(g.final_grade.toString()) : null)}`}>
                              {g.is_absent ? 'ABS' : g.final_grade ? `${parseFloat(g.final_grade.toString()).toFixed(2)}/20` : '—'}
                            </span>
                            {g.status === 'publiee' && g.final_grade !== null && (
                              <button onClick={() => { setContestModal(g); setReason('') }}
                                className="p-1 hover:bg-amber-100 rounded text-gray-400 hover:text-amber-600 transition" title="Contester cette note">
                                <AlertCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Si pas de UE résultats, afficher les notes directement */}
                  {!ues.length && grades.length > 0 && (
                    <div className="space-y-1">
                      {grades.map(g => (
                        <div key={g.id} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-100">
                          <span className="text-sm font-medium text-gray-800">{g.ec_code}</span>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-400 text-xs">CC:{g.cc_grade ?? '—'} / Exam:{g.exam_grade ?? '—'}</span>
                            <span className={`font-bold ${gradeColor(g.final_grade ? parseFloat(g.final_grade.toString()) : null)}`}>
                              {g.is_absent ? 'ABS' : g.final_grade ? `${parseFloat(g.final_grade.toString()).toFixed(2)}/20` : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}

          {/* Notes sans résultats semestriels */}
          {!semesters.length && grades.length > 0 && (
            <Card title="Mes notes">
              <div className="space-y-2">
                {grades.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{g.ec_code}</p>
                      {g.appreciation && <p className="text-xs text-gray-400 mt-0.5 italic">{g.appreciation}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs text-gray-500">
                        <p>CC : {g.cc_grade ?? '—'} / Exam : {g.exam_grade ?? '—'}</p>
                      </div>
                      <span className={`text-base font-black ${gradeColor(g.final_grade ? parseFloat(g.final_grade.toString()) : null)}`}>
                        {g.is_absent ? 'ABS' : g.final_grade ? `${parseFloat(g.final_grade.toString()).toFixed(2)}` : '—'}
                        <span className="text-xs text-gray-400 font-normal">/20</span>
                      </span>
                      {g.status === 'publiee' && g.final_grade !== null && (
                        <button onClick={() => { setContestModal(g); setReason('') }}
                          className="p-1 hover:bg-amber-100 rounded-lg text-gray-400 hover:text-amber-600 transition">
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal réclamation */}
      <Modal open={!!contestModal} onClose={() => setContestModal(null)} title="Contester une note" size="sm">
        {contestModal && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-sm font-semibold text-gray-900">{contestModal.ec_code}</p>
              <p className="text-sm text-gray-600 mt-1">
                Note finale : <span className="font-bold">{contestModal.final_grade}/20</span>
              </p>
            </div>
            <Alert type="warning">
              Une réclamation doit être justifiée et documentée. Elle sera examinée par le responsable pédagogique.
            </Alert>
            <div>
              <label className="label">Motif de la réclamation *</label>
              <textarea className="input h-28 resize-none" value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Expliquez le motif de votre réclamation..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setContestModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">Annuler</button>
              <button onClick={() => contestMut.mutate({ grade_id: contestModal.id, reason })}
                disabled={!reason.trim() || contestMut.isPending}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition disabled:opacity-50">
                <MessageSquare className="w-4 h-4 inline mr-2" />{contestMut.isPending ? 'Envoi...' : 'Soumettre'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

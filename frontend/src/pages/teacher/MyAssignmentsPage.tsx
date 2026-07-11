import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Check, Eye, Download, Clock, User } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Modal } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

const statusColor = (s: string) => ({ soumis: 'badge-blue', en_retard: 'badge-red', corrige: 'badge-green', rendu: 'badge-gray' }[s] ?? 'badge-gray')

export default function MyAssignmentsPage() {
  const qc = useQueryClient()
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null)
  const [gradeModal, setGradeModal] = useState<{ id: string; student: string } | null>(null)
  const [gradeValue, setGradeValue] = useState('')
  const [feedback, setFeedback] = useState('')

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: () => api.get('/assignments/').then(r => r.data),
  })

  const { data: submissions } = useQuery({
    queryKey: ['submissions', selectedAssignment],
    queryFn: () => api.get(`/assignments/${selectedAssignment}/submissions/`).then(r => r.data),
    enabled: !!selectedAssignment,
  })

  const gradeMut = useMutation({
    mutationFn: ({ id, grade, feedback }: { id: string; grade: number; feedback: string }) =>
      api.patch(`/assignment-submissions/${id}/`, { grade, feedback, status: 'corrige' }),
    onSuccess: () => { toast.success('Note attribuée'); setGradeModal(null); qc.invalidateQueries({ queryKey: ['submissions', selectedAssignment] }) },
    onError: () => toast.error('Erreur'),
  })

  const assignmentList = assignments?.results ?? []
  const submissionList = submissions ?? []
  const gradedCount = submissionList.filter((s: { grade: number | null }) => s.grade !== null).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Mes Devoirs</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Gérez les soumissions et notez les travaux de vos étudiants</p>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-2">
            {!assignmentList.length ? (
              <Empty icon={<Send className="w-6 h-6" />} message="Aucun devoir" />
            ) : assignmentList.map((a: { id: string; title: string; type_display: string; due_date: string; status: string }) => (
              <Card key={a.id} hover onClick={() => setSelectedAssignment(a.id)}
                className={`cursor-pointer ${selectedAssignment === a.id ? 'ring-2 ring-primary-500' : ''}`}>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">{a.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge label={a.type_display} className="badge-blue" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{formatDate(a.due_date)}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {selectedAssignment ? (
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  {submissionList.length} soumission(s) — {gradedCount} noté(s)
                </p>
              </div>
              {!submissionList.length ? (
                <Empty icon={<Send className="w-6 h-6" />} message="Aucune soumission" description="Les étudiants n'ont pas encore rendu ce devoir." />
              ) : submissionList.map((sub: { id: string; student_name: string; submitted_at: string; is_late: boolean; status: string; grade: number | null; feedback: string; file: string }) => (
                <Card key={sub.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">{sub.student_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(sub.submitted_at)}</span>
                          {sub.is_late && <Badge label="En retard" className="badge-red" />}
                          <Badge label={sub.status} className={statusColor(sub.status)} />
                        </div>
                        {sub.grade !== null && (
                          <p className="text-sm font-bold text-emerald-700 mt-1">{sub.grade}/20 {sub.feedback && <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">— {sub.feedback.slice(0, 40)}...</span>}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <a href={sub.file} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition" title="Voir le fichier">
                        <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </a>
                      <button onClick={() => { setGradeModal({ id: sub.id, student: sub.student_name }); setGradeValue(sub.grade?.toString() ?? ''); setFeedback(sub.feedback ?? '') }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-xs font-semibold hover:bg-primary-200 transition">
                        <Check className="w-3.5 h-3.5" /> {sub.grade !== null ? 'Modifier' : 'Noter'}
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="lg:col-span-2 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
              ← Sélectionnez un devoir
            </div>
          )}
        </div>
      )}

      <Modal open={!!gradeModal} onClose={() => setGradeModal(null)} title={`Noter — ${gradeModal?.student}`} size="sm">
        {gradeModal && (
          <div className="space-y-4">
            <div>
              <label className="label">Note /20 *</label>
              <input type="number" min={0} max={20} step={0.25} className="input" value={gradeValue}
                onChange={e => setGradeValue(e.target.value)} placeholder="Ex: 14.5" />
            </div>
            <div>
              <label className="label">Feedback</label>
              <textarea className="input h-24 resize-none" value={feedback}
                onChange={e => setFeedback(e.target.value)} placeholder="Commentaire pour l'étudiant..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setGradeModal(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:bg-gray-800 transition">Annuler</button>
              <button onClick={() => gradeMut.mutate({ id: gradeModal.id, grade: parseFloat(gradeValue), feedback })}
                disabled={!gradeValue || gradeMut.isPending}
                className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
                {gradeMut.isPending ? 'Sauvegarde...' : 'Enregistrer la note'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, FileText, Video, Link2, Download, Clock, Send, HelpCircle, ChevronDown, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Progress, Alert, Modal, Button } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

interface QuizChoice { id: string; text: string }
interface QuizQuestion { id: string; text: string; type: string; points: number; choices: QuizChoice[]; explanation: string }
interface QuizT { id: string; title: string; duration_minutes: number; max_grade: number; max_attempts: number; instructions: string; is_published: boolean; questions: QuizQuestion[] }
interface AttemptAnswer { id: string; question: string; is_correct: boolean | null; points_earned: number | null }
interface Attempt { id: string; status: string; score: number | null; question_order: string[]; time_remaining_seconds: number; answers?: AttemptAnswer[] }

type ResourceIcon = { [key: string]: React.ReactNode }

const TYPE_ICON: ResourceIcon = {
  pdf: <FileText className="w-4 h-4 text-red-500" />,
  video: <Video className="w-4 h-4 text-blue-500" />,
  link: <Link2 className="w-4 h-4 text-purple-500" />,
  audio: <span className="text-xs">🎧</span>,
  ppt: <span className="text-xs">📊</span>,
  doc: <span className="text-xs">📝</span>,
  notebook: <span className="text-xs">📓</span>,
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [activeTab, setTab] = useState<'content' | 'assignments' | 'quizzes'>('content')
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { data: space, isLoading } = useQuery({
    queryKey: ['course-space', id],
    queryFn: () => api.get(`/course-spaces/${id}/`).then(r => r.data),
    enabled: !!id,
  })

  const { data: progress } = useQuery({
    queryKey: ['my-progress', id],
    queryFn: () => api.get(`/course-spaces/${id}/my_progress/`).then(r => r.data),
    enabled: !!id,
  })

  const { data: assignments } = useQuery({
    queryKey: ['assignments', id],
    queryFn: () => api.get('/assignments/', { params: { course_space: id } }).then(r => r.data),
    enabled: !!id && activeTab === 'assignments',
  })

  const { data: quizzes } = useQuery({
    queryKey: ['quizzes', id],
    queryFn: () => api.get('/quizzes/', { params: { course_space: id } }).then(r => r.data),
    enabled: !!id && activeTab === 'quizzes',
  })

  const submitMut = useMutation({
    mutationFn: ({ assignmentId, file }: { assignmentId: string; file: File }) => {
      const fd = new FormData(); fd.append('file', file)
      return api.post(`/assignments/${assignmentId}/submit/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => { toast.success('Devoir soumis avec succès'); setSubmittingId(null); setSelectedFile(null); qc.invalidateQueries({ queryKey: ['assignments'] }) },
    onError: (e: Error & { response?: { data?: { detail?: string } } }) => toast.error(e?.response?.data?.detail ?? 'Erreur lors de la soumission'),
  })

  const [activeQuiz, setActiveQuiz] = useState<QuizT | null>(null)
  const [activeAttempt, setActiveAttempt] = useState<Attempt | null>(null)

  const startQuizMut = useMutation({
    mutationFn: (quizId: string) => api.post(`/quizzes/${quizId}/start_attempt/`).then(r => r.data as Attempt),
    onSuccess: (attempt, quizId) => {
      setActiveAttempt(attempt)
      setActiveQuiz(quizzes?.results?.find((q: QuizT) => q.id === quizId) ?? null)
    },
    onError: (e: Error & { response?: { data?: { detail?: string } } }) => toast.error(e?.response?.data?.detail ?? 'Erreur'),
  })

  const toggleModule = (id: string) => {
    setOpenModules(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  if (isLoading) return <Spinner text="Chargement du cours..." />
  if (!space) return <Alert type="error">Cours introuvable.</Alert>

  const completionRate = progress?.completion_rate ?? 0
  const modules = space.modules ?? []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-primary-200 text-sm font-medium mb-1">{space.ue_code} — {space.ue_name}</p>
            <h1 className="text-2xl font-bold">{space.title}</h1>
            {space.description && <p className="text-primary-100 text-sm mt-2 line-clamp-2">{space.description}</p>}
          </div>
          <Badge label={space.mode_display ?? space.mode} className="bg-white/20 text-white border-white/30" />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-primary-200">Progression</span>
            <span className="font-bold">{Math.round(completionRate)}%</span>
          </div>
          <div className="h-2 bg-primary-500 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${completionRate}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[
          { key: 'content', label: 'Contenu', icon: BookOpen },
          { key: 'assignments', label: 'Devoirs', icon: Send },
          { key: 'quizzes', label: 'Quiz', icon: HelpCircle },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === 'content' && (
        !modules.length ? (
          <Empty icon={<BookOpen className="w-8 h-8" />} message="Aucun module disponible" description="L'enseignant n'a pas encore publié de contenu." />
        ) : (
          <div className="space-y-3">
            {modules.map((mod: { id: string; title: string; description: string; order: number; is_published: boolean; resources?: { id: string; title: string; type: string; file: string | null; external_url: string; is_downloadable: boolean }[] }) => (
              <Card key={mod.id} noPadding>
                <button onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition rounded-2xl text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                      {mod.order}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{mod.title}</p>
                      {mod.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{mod.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">{mod.resources?.length ?? 0} ressource(s)</span>
                    {openModules.has(mod.id) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {openModules.has(mod.id) && (
                  <div className="px-4 pb-4 space-y-2">
                    {!mod.resources?.length ? (
                      <p className="text-sm text-gray-400 text-center py-3">Aucune ressource dans ce module</p>
                    ) : mod.resources.map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                        <span className="flex-shrink-0">{TYPE_ICON[r.type] ?? <FileText className="w-4 h-4 text-gray-400" />}</span>
                        <span className="flex-1 text-sm font-medium text-gray-800">{r.title}</span>
                        {r.file && r.is_downloadable && (
                          <a href={r.file} target="_blank" rel="noopener noreferrer" download
                            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                            <Download className="w-3.5 h-3.5" /> Télécharger
                          </a>
                        )}
                        {r.external_url && (
                          <a href={r.external_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                            <Link2 className="w-3.5 h-3.5" /> Ouvrir
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )
      )}

      {/* Devoirs */}
      {activeTab === 'assignments' && (
        !assignments?.results?.length ? (
          <Empty icon={<Send className="w-8 h-8" />} message="Aucun devoir" description="Aucun devoir n'a été publié pour ce cours." />
        ) : (
          <div className="space-y-3">
            {assignments.results.map((a: { id: string; title: string; type_display: string; due_date: string; max_grade: number; instructions: string; status: string }) => {
              const isPast = new Date(a.due_date) < new Date()
              return (
                <Card key={a.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">{a.title}</p>
                        <Badge label={a.type_display} className="badge-blue" />
                        {isPast && <Badge label="Fermé" className="badge-red" />}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{a.instructions}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {formatDate(a.due_date)}
                        </span>
                        <span>Note max : {a.max_grade}/20</span>
                      </div>
                    </div>
                  </div>

                  {!isPast && a.status === 'publie' && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {submittingId === a.id ? (
                        <div className="flex items-center gap-3">
                          <input type="file" className="flex-1 text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary-100 file:text-primary-700 file:font-medium"
                            onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
                          <button onClick={() => { if (selectedFile) submitMut.mutate({ assignmentId: a.id, file: selectedFile }) }}
                            disabled={!selectedFile || submitMut.isPending}
                            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
                            {submitMut.isPending ? 'Envoi...' : 'Soumettre'}
                          </button>
                          <button onClick={() => { setSubmittingId(null); setSelectedFile(null) }}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition">
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setSubmittingId(a.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition">
                          <Send className="w-4 h-4" /> Soumettre mon devoir
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* Quiz */}
      {activeTab === 'quizzes' && (
        !quizzes?.results?.length ? (
          <Empty icon={<HelpCircle className="w-8 h-8" />} message="Aucun quiz" description="Aucun quiz n'a été publié pour ce cours." />
        ) : (
          <div className="space-y-3">
            {quizzes.results.map((q: { id: string; title: string; duration_minutes: number; max_grade: number; max_attempts: number; instructions: string; is_published: boolean }) => (
              <Card key={q.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{q.title}</p>
                    {q.instructions && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{q.instructions}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>⏱ {q.duration_minutes} min</span>
                      <span>🎯 {q.max_grade}/20</span>
                      <span>🔄 {q.max_attempts} tentative(s)</span>
                    </div>
                  </div>
                  {q.is_published && (
                    <button onClick={() => startQuizMut.mutate(q.id)} disabled={startQuizMut.isPending}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50 flex-shrink-0">
                      <HelpCircle className="w-4 h-4" /> Commencer
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Passation du quiz */}
      <Modal open={!!activeAttempt} onClose={() => { setActiveAttempt(null); setActiveQuiz(null) }}
        title={activeQuiz?.title ?? 'Quiz'} size="lg">
        {activeAttempt && activeQuiz && (
          <QuizTaking
            quiz={activeQuiz}
            attempt={activeAttempt}
            onDone={() => { setActiveAttempt(null); setActiveQuiz(null); qc.invalidateQueries({ queryKey: ['quizzes'] }) }}
          />
        )}
      </Modal>
    </div>
  )
}

function QuizTaking({ quiz, attempt, onDone }: { quiz: QuizT; attempt: Attempt; onDone: () => void }) {
  const [answers, setAnswers] = useState<Record<string, { choice_ids: string[]; text_answer: string }>>({})
  const [secondsLeft, setSecondsLeft] = useState(attempt.time_remaining_seconds)
  const [result, setResult] = useState<Attempt | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const orderedQuestions = attempt.question_order.length
    ? attempt.question_order.map(qid => quiz.questions.find(q => q.id === qid)).filter(Boolean) as QuizQuestion[]
    : quiz.questions

  const submitMut = useMutation({
    mutationFn: () => api.post(`/quiz-attempts/${attempt.id}/submit/`, {
      answers: orderedQuestions.map(q => ({
        question: q.id,
        choice_ids: answers[q.id]?.choice_ids ?? [],
        text_answer: answers[q.id]?.text_answer ?? '',
      })),
    }).then(r => r.data as Attempt),
    onSuccess: (data) => { setResult(data); toast.success('Quiz soumis') },
    onError: (e: Error & { response?: { data?: { detail?: string } } }) => toast.error(e?.response?.data?.detail ?? 'Erreur lors de la soumission'),
  })

  useEffect(() => {
    if (result) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(intervalRef.current!); submitMut.mutate(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  const toggleChoice = (questionId: string, choiceId: string, multi: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId]?.choice_ids ?? []
      const next = multi
        ? (current.includes(choiceId) ? current.filter(c => c !== choiceId) : [...current, choiceId])
        : [choiceId]
      return { ...prev, [questionId]: { ...prev[questionId], choice_ids: next, text_answer: prev[questionId]?.text_answer ?? '' } }
    })
  }

  const setText = (questionId: string, text: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: { choice_ids: prev[questionId]?.choice_ids ?? [], text_answer: text } }))
  }

  if (result) {
    const answeredById = new Map((result.answers ?? []).map(a => [a.question, a]))
    return (
      <div className="space-y-4">
        <div className="text-center bg-gray-50 rounded-2xl p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Score</p>
          <p className="text-4xl font-black text-gray-900 mt-1">{result.score ?? 0}<span className="text-lg text-gray-400">/{quiz.max_grade}</span></p>
        </div>
        <div className="space-y-2">
          {orderedQuestions.map((q, i) => {
            const a = answeredById.get(q.id)
            const pending = a?.is_correct === null || a?.is_correct === undefined
            return (
              <div key={q.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                {pending ? <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  : a?.is_correct ? <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">Q{i + 1}. {q.text}</p>
                  {pending && <p className="text-xs text-amber-600 mt-0.5">En attente de correction manuelle (réponse libre)</p>}
                  {q.explanation && !pending && <p className="text-xs text-gray-400 mt-0.5">{q.explanation}</p>}
                </div>
                <span className="text-xs font-semibold text-gray-500 flex-shrink-0">{a?.points_earned ?? '—'}/{q.points}</span>
              </div>
            )
          })}
        </div>
        <Button className="w-full" onClick={onDone}>Fermer</Button>
      </div>
    )
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="space-y-5">
      <div className={`flex items-center justify-center gap-2 py-2 rounded-xl font-mono font-bold text-lg ${secondsLeft < 60 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-700'}`}>
        <Clock className="w-4 h-4" /> {mm}:{ss}
      </div>

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
        {orderedQuestions.map((q, i) => (
          <div key={q.id} className="p-4 border border-gray-100 rounded-xl">
            <p className="text-sm font-semibold text-gray-900 mb-3">Q{i + 1}. {q.text} <span className="text-xs text-gray-400 font-normal">({q.points} pt{q.points > 1 ? 's' : ''})</span></p>
            {(q.type === 'qcm' || q.type === 'vrai_faux') && (
              <div className="space-y-2">
                {q.choices.map(c => (
                  <label key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer text-sm">
                    <input type="radio" name={q.id} checked={(answers[q.id]?.choice_ids ?? []).includes(c.id)}
                      onChange={() => toggleChoice(q.id, c.id, false)} />
                    {c.text}
                  </label>
                ))}
              </div>
            )}
            {q.type === 'qcm_multiple' && (
              <div className="space-y-2">
                {q.choices.map(c => (
                  <label key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer text-sm">
                    <input type="checkbox" checked={(answers[q.id]?.choice_ids ?? []).includes(c.id)}
                      onChange={() => toggleChoice(q.id, c.id, true)} />
                    {c.text}
                  </label>
                ))}
              </div>
            )}
            {(q.type === 'reponse_courte' || q.type === 'reponse_longue') && (
              q.type === 'reponse_courte'
                ? <input className="input" value={answers[q.id]?.text_answer ?? ''} onChange={e => setText(q.id, e.target.value)} />
                : <textarea className="input h-24 resize-none" value={answers[q.id]?.text_answer ?? ''} onChange={e => setText(q.id, e.target.value)} />
            )}
          </div>
        ))}
      </div>

      <Button className="w-full" icon={<Send className="w-4 h-4" />} loading={submitMut.isPending} onClick={() => submitMut.mutate()}>
        Soumettre le quiz
      </Button>
    </div>
  )
}

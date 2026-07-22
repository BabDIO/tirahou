import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Upload, Plus, Users, FileText, HelpCircle, CheckCircle2 } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Modal, Progress, Button, Input } from '../../components/ui'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

export default function TeacherCoursesPage() {
  const qc = useQueryClient()
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [resourceForm, setResourceForm] = useState({ title: '', type: 'pdf', module: '', file: null as File | null, external_url: '', is_downloadable: true })

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => api.get('/course-spaces/').then(r => r.data),
  })

  const { data: modules } = useQuery({
    queryKey: ['modules', selectedSpace],
    queryFn: () => api.get('/course-modules/', { params: { course_space: selectedSpace } }).then(r => r.data),
    enabled: !!selectedSpace,
  })

  const { data: progress } = useQuery({
    queryKey: ['course-progress', selectedSpace],
    queryFn: () => api.get('/student-progress/', { params: { course_space: selectedSpace } }).then(r => r.data),
    enabled: !!selectedSpace,
  })

  const { data: quizzes } = useQuery({
    queryKey: ['teacher-quizzes', selectedSpace],
    queryFn: () => api.get('/quizzes/', { params: { course_space: selectedSpace } }).then(r => r.data),
    enabled: !!selectedSpace,
  })

  const [gradingQuizId, setGradingQuizId] = useState<string | null>(null)

  const publishMut = useMutation({
    mutationFn: (id: string) => api.post(`/course-spaces/${id}/publish/`),
    onSuccess: () => { toast.success('Cours publié'); qc.invalidateQueries({ queryKey: ['teacher-courses'] }) },
  })

  const addModuleMut = useMutation({
    mutationFn: (data: object) => api.post('/course-modules/', data),
    onSuccess: () => { toast.success('Module créé'); qc.invalidateQueries({ queryKey: ['modules', selectedSpace] }) },
  })

  const uploadResourceMut = useMutation({
    mutationFn: (fd: FormData) => api.post('/course-resources/', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { toast.success('Ressource ajoutée'); setShowUpload(false); qc.invalidateQueries({ queryKey: ['modules', selectedSpace] }) },
    onError: () => toast.error('Erreur lors du téléversement'),
  })

  const setPrerequisiteMut = useMutation({
    mutationFn: ({ id, prerequisite_module }: { id: string; prerequisite_module: string | null }) =>
      api.patch(`/course-modules/${id}/`, { prerequisite_module }),
    onSuccess: () => { toast.success('Prérequis mis à jour'); qc.invalidateQueries({ queryKey: ['modules', selectedSpace] }) },
  })

  const createVersionMut = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post(`/course-resources/${id}/create_version/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => { toast.success('Nouvelle version publiée'); qc.invalidateQueries({ queryKey: ['modules', selectedSpace] }) },
    onError: () => toast.error('Erreur lors de la nouvelle version'),
  })

  const courses = data?.results ?? []
  const mods = modules?.results ?? []
  const progressList = progress?.results ?? []
  const quizList = quizzes?.results ?? []
  const avgCompletion = progressList.length
    ? Math.round(progressList.reduce((s: number, p: { completion_rate: number }) => s + p.completion_rate, 0) / progressList.length)
    : 0

  const handleUpload = () => {
    if (!resourceForm.title || !resourceForm.module) return
    const fd = new FormData()
    fd.append('title', resourceForm.title)
    fd.append('type', resourceForm.type)
    fd.append('module', resourceForm.module)
    fd.append('is_downloadable', String(resourceForm.is_downloadable))
    fd.append('is_published', 'true')
    if (resourceForm.file) fd.append('file', resourceForm.file)
    if (resourceForm.external_url) fd.append('external_url', resourceForm.external_url)
    uploadResourceMut.mutate(fd)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Mes Espaces de Cours</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Gérez vos cours, ressources et suivez la progression des étudiants</p>
      </div>

      {isLoading ? <Spinner /> : !courses.length ? (
        <Empty icon={<BookOpen className="w-8 h-8" />} message="Aucun espace de cours"
          description="Les espaces sont créés par l'administration et vous sont assignés." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Liste des cours */}
          <div className="space-y-3">
            {courses.map((c: { id: string; title: string; ue_code: string; is_published: boolean; mode_display: string }) => (
              <Card key={c.id} hover onClick={() => setSelectedSpace(c.id)}
                className={`cursor-pointer transition ${selectedSpace === c.id ? 'ring-2 ring-primary-500' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">{c.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{c.ue_code}</p>
                    </div>
                  </div>
                  {!c.is_published && (
                    <button onClick={e => { e.stopPropagation(); publishMut.mutate(c.id) }}
                      className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 transition">
                      Publier
                    </button>
                  )}
                </div>
                {c.is_published && <Badge label="Publié" className="badge-green mt-2" />}
              </Card>
            ))}
          </div>

          {/* Détail du cours sélectionné */}
          {selectedSpace ? (
            <div className="lg:col-span-2 space-y-4">
              {/* Stats progression */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-gray-100 dark:border-gray-700 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-primary-600">{progressList.length}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Étudiants actifs</p>
                </div>
                <div className="bg-white border border-gray-100 dark:border-gray-700 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-emerald-600">{avgCompletion}%</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Complétion moy.</p>
                </div>
                <div className="bg-white border border-gray-100 dark:border-gray-700 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-amber-600">
                    {progressList.filter((p: { completion_rate: number }) => p.completion_rate < 30).length}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Peu avancés</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => addModuleMut.mutate({ course_space: selectedSpace, title: `Module ${mods.length + 1}`, order: mods.length + 1, is_published: true })}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition">
                  <Plus className="w-4 h-4" /> Ajouter un module
                </button>
                <button onClick={() => setShowUpload(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition">
                  <Upload className="w-4 h-4" /> Déposer une ressource
                </button>
              </div>

              {/* Modules */}
              <div className="space-y-2">
                {mods.map((mod: { id: string; title: string; order: number; prerequisite_module: string | null; resources?: { id: string; title: string; type: string; version: number }[] }) => (
                  <Card key={mod.id} noPadding>
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-50 flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-primary-100 text-primary-700 text-xs font-black flex items-center justify-center">{mod.order}</span>
                          {mod.title}
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">{mod.resources?.length ?? 0} ressource(s)</span>
                        </p>
                        <select className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white"
                          value={mod.prerequisite_module ?? ''}
                          onChange={e => setPrerequisiteMut.mutate({ id: mod.id, prerequisite_module: e.target.value || null })}>
                          <option value="">Aucun prérequis</option>
                          {mods.filter((m: { id: string }) => m.id !== mod.id).map((m: { id: string; title: string }) => (
                            <option key={m.id} value={m.id}>Prérequis : {m.title}</option>
                          ))}
                        </select>
                      </div>
                      {mod.resources?.map(r => (
                        <div key={r.id} className="ml-8 mt-1.5 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          <span>{r.title}</span>
                          <Badge label={r.type} className="badge-gray" />
                          {r.version > 1 && <Badge label={`v${r.version}`} className="badge-blue" />}
                          <label className="text-primary-600 hover:text-primary-700 cursor-pointer font-medium">
                            Nouvelle version
                            <input type="file" className="hidden" onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) createVersionMut.mutate({ id: r.id, file })
                            }} />
                          </label>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Quiz */}
              {quizList.length > 0 && (
                <Card title="Quiz" subtitle="Correction des réponses libres">
                  <div className="space-y-2">
                    {quizList.map((q: { id: string; title: string; is_published: boolean }) => (
                      <button
                        key={q.id}
                        onClick={() => setGradingQuizId(q.id)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition text-left"
                      >
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{q.title}</span>
                        </div>
                        <Badge label={q.is_published ? 'Publié' : 'Brouillon'} className={q.is_published ? 'badge-green' : 'badge-gray'} />
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Top progression étudiants */}
              {progressList.length > 0 && (
                <Card title="Progression des étudiants" subtitle="Top 10">
                  <div className="space-y-2">
                    {progressList.slice(0, 10).map((p: { student_name?: string; completion_rate: number }, index: number) => (
                      <div key={p.student_name ?? index} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Users className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{p.student_name ?? 'Étudiant'}</span>
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{Math.round(p.completion_rate)}%</span>
                          </div>
                          <Progress value={p.completion_rate} size="sm"
                            color={p.completion_rate >= 75 ? 'bg-emerald-500' : p.completion_rate >= 40 ? 'bg-amber-500' : 'bg-red-500'} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div className="lg:col-span-2 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
              ← Sélectionnez un cours pour le gérer
            </div>
          )}
        </div>
      )}

      {/* Modal upload ressource */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Déposer une ressource" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Titre *</label>
            <input className="input" value={resourceForm.title}
              onChange={e => setResourceForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={resourceForm.type} onChange={e => setResourceForm(f => ({ ...f, type: e.target.value }))}>
                {['pdf', 'video', 'audio', 'ppt', 'doc', 'link', 'notebook', 'image'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Module *</label>
              <select className="input" value={resourceForm.module} onChange={e => setResourceForm(f => ({ ...f, module: e.target.value }))}>
                <option value="">— Choisir —</option>
                {mods.map((m: { id: string; title: string }) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
          </div>
          {resourceForm.type === 'link' ? (
            <div>
              <label className="label">URL externe</label>
              <input className="input" type="url" value={resourceForm.external_url}
                onChange={e => setResourceForm(f => ({ ...f, external_url: e.target.value }))} placeholder="https://..." />
            </div>
          ) : (
            <div>
              <label className="label">Fichier</label>
              <input type="file" className="input file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary-100 file:text-primary-700 file:text-sm"
                onChange={e => setResourceForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))} />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={resourceForm.is_downloadable}
              onChange={e => setResourceForm(f => ({ ...f, is_downloadable: e.target.checked }))} />
            Permettre le téléchargement
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowUpload(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Annuler</button>
            <button onClick={handleUpload}
              disabled={!resourceForm.title || !resourceForm.module || uploadResourceMut.isPending}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
              {uploadResourceMut.isPending ? 'Téléversement...' : 'Déposer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal correction quiz */}
      <Modal open={!!gradingQuizId} onClose={() => setGradingQuizId(null)} title="Correction des réponses libres" size="lg">
        {gradingQuizId && <QuizGrading quizId={gradingQuizId} />}
      </Modal>
    </div>
  )
}

interface FreeTextAnswer {
  id: string
  question_text: string
  question_type: string
  question_points: string
  text_answer: string
  points_earned: string | null
}

function QuizGrading({ quizId }: { quizId: string }) {
  const qc = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['quiz-attempts-grading', quizId],
    queryFn: () => api.get('/quiz-attempts/', { params: { quiz: quizId, status: 'soumis' } }).then(r => r.data.results ?? r.data),
  })

  const { data: details, isLoading: loadingDetails } = useQuery({
    queryKey: ['quiz-attempts-detail', quizId, attempts?.map((a: { id: string }) => a.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        (attempts ?? []).map((a: { id: string }) => api.get(`/quiz-attempts/${a.id}/`).then(r => r.data))
      )
      return results
    },
    enabled: !!attempts && attempts.length > 0,
  })

  const gradeMut = useMutation({
    mutationFn: ({ attemptId, answerId, points }: { attemptId: string; answerId: string; points: number }) =>
      api.post(`/quiz-attempts/${attemptId}/grade-answer/`, { answer_id: answerId, points_earned: points }),
    onSuccess: () => {
      toast.success('Réponse corrigée')
      qc.invalidateQueries({ queryKey: ['quiz-attempts-detail', quizId] })
    },
    onError: () => toast.error('Erreur lors de la correction'),
  })

  if (isLoading || loadingDetails) return <Spinner text="Chargement des copies..." />
  if (!attempts || attempts.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Aucune copie soumise pour ce quiz.</p>
  }

  return (
    <div className="space-y-5 max-h-[70vh] overflow-y-auto">
      {(details ?? []).map((attempt: { id: string; student: string; student_name?: string; answers: FreeTextAnswer[] }) => {
        const freeTextAnswers = attempt.answers.filter(
          (a) => (a.question_type === 'reponse_courte' || a.question_type === 'reponse_longue')
        )
        if (freeTextAnswers.length === 0) return null
        return (
          <div key={attempt.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">{attempt.student_name ?? 'Étudiant'}</p>
            <div className="space-y-3">
              {freeTextAnswers.map((ans) => {
                const isGraded = ans.points_earned !== null
                const draftKey = `${attempt.id}-${ans.id}`
                return (
                  <div key={ans.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{ans.question_text}</p>
                    <p className="text-sm text-gray-900 dark:text-gray-50 mb-3 whitespace-pre-line">{ans.text_answer || '— (sans réponse) —'}</p>
                    <div className="flex items-center gap-2">
                      {isGraded ? (
                        <Badge label={`${ans.points_earned}/${ans.question_points} pts — corrigé`} className="badge-green" />
                      ) : (
                        <>
                          <Input
                            type="number" min="0" max={ans.question_points} step="0.5"
                            placeholder={`/ ${ans.question_points} pts`}
                            className="w-28"
                            value={drafts[draftKey] ?? ''}
                            onChange={(e) => setDrafts((d) => ({ ...d, [draftKey]: e.target.value }))}
                          />
                          <Button
                            size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            disabled={!drafts[draftKey] || gradeMut.isPending}
                            onClick={() => gradeMut.mutate({ attemptId: attempt.id, answerId: ans.id, points: Number(drafts[draftKey]) })}
                          >
                            Valider
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

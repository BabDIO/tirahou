import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Store, BookOpen, Send, Archive, Trash2, GripVertical, X, ArrowLeft,
} from 'lucide-react'
import { marketplaceApi } from '../../api'
import { Card, Button, Input, Textarea, Select, Badge, Spinner, Modal } from '../../components/ui'
import toast from 'react-hot-toast'

const LEVEL_OPTIONS = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
]

const CONTENT_TYPE_OPTIONS = [
  { value: 'video', label: 'Vidéo' },
  { value: 'document', label: 'Document' },
  { value: 'text', label: 'Texte' },
  { value: 'quiz', label: 'Quiz' },
]

const EMPTY_COURSE_FORM = {
  title: '', description: '', category: '', level: 'debutant',
  price: 0, is_free: true, duration_hours: 5,
}

const EMPTY_LESSON_FORM = {
  title: '', content_type: 'text', content_url: '', content_text: '',
  duration_minutes: 10, is_preview: false,
}

interface Course {
  id: string
  title: string
  description: string
  category: string
  level: string
  price: string
  is_free: boolean
  duration_hours: number
  status: string
  status_display: string
  lessons_count: number
  students_count: number
}

interface Lesson {
  id: string
  title: string
  content_type: string
  content_type_display: string
  duration_minutes: number
  order: number
  is_preview: boolean
}

const STATUS_BADGE: Record<string, string> = { draft: 'badge-gray', published: 'badge-green', archived: 'badge-red' }

export default function MyMarketplaceCoursesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE_FORM)
  const [managingCourseId, setManagingCourseId] = useState<string | null>(null)
  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON_FORM)

  const { data: courses, isLoading } = useQuery({
    queryKey: ['my-marketplace-courses'],
    queryFn: () => marketplaceApi.getMyCourses().then(r => r.data as Course[]),
  })

  const { data: lessons, isLoading: loadingLessons } = useQuery({
    queryKey: ['marketplace-lessons', managingCourseId],
    queryFn: () => marketplaceApi.getLessons({ course: managingCourseId }).then(r => (r.data.results ?? r.data) as Lesson[]),
    enabled: !!managingCourseId,
  })

  const createCourseMutation = useMutation({
    mutationFn: () => marketplaceApi.createCourse(courseForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-marketplace-courses'] })
      toast.success('Cours créé en brouillon — ajoutez des leçons puis publiez-le')
      setCreateOpen(false)
      setCourseForm(EMPTY_COURSE_FORM)
    },
    onError: () => toast.error('Erreur lors de la création du cours'),
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => marketplaceApi.publishCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-marketplace-courses'] })
      toast.success('Cours publié !')
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(message ?? 'Erreur lors de la publication')
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => marketplaceApi.archiveCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-marketplace-courses'] })
      toast.success('Cours archivé')
    },
  })

  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => marketplaceApi.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-marketplace-courses'] })
      toast.success('Cours supprimé')
    },
  })

  const createLessonMutation = useMutation({
    mutationFn: () => marketplaceApi.createLesson({ ...lessonForm, course: managingCourseId, order: (lessons?.length ?? 0) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-lessons', managingCourseId] })
      queryClient.invalidateQueries({ queryKey: ['my-marketplace-courses'] })
      toast.success('Leçon ajoutée')
      setLessonForm(EMPTY_LESSON_FORM)
    },
    onError: () => toast.error('Erreur lors de l\'ajout de la leçon'),
  })

  const deleteLessonMutation = useMutation({
    mutationFn: (id: string) => marketplaceApi.deleteLesson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-lessons', managingCourseId] })
      queryClient.invalidateQueries({ queryKey: ['my-marketplace-courses'] })
      toast.success('Leçon supprimée')
    },
  })

  const managingCourse = courses?.find((c) => c.id === managingCourseId)

  if (managingCourseId && managingCourse) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => setManagingCourseId(null)}>
          Retour à mes cours
        </Button>
        <div>
          <h1 className="page-title">{managingCourse.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gestion des leçons</p>
        </div>

        <Card title="Leçons" subtitle={`${lessons?.length ?? 0} leçon(s)`}>
          {loadingLessons ? <Spinner /> : (
            <div className="space-y-2 mb-5">
              {(!lessons || lessons.length === 0) && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Aucune leçon. Ajoutez-en une ci-dessous pour pouvoir publier le cours.</p>
              )}
              {lessons?.map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{l.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{l.content_type_display} • {l.duration_minutes} min</p>
                  </div>
                  {l.is_preview && <Badge label="Aperçu" className="badge-blue" />}
                  <button onClick={() => deleteLessonMutation.mutate(l.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ajouter une leçon</p>
            <Input label="Titre" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Type de contenu" value={lessonForm.content_type} onChange={(e) => setLessonForm({ ...lessonForm, content_type: e.target.value })} options={CONTENT_TYPE_OPTIONS} />
              <Input label="Durée (minutes)" type="number" min="1" value={lessonForm.duration_minutes} onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: Number(e.target.value) })} />
            </div>
            {(lessonForm.content_type === 'video' || lessonForm.content_type === 'document') && (
              <Input label="URL du contenu" value={lessonForm.content_url} onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })} placeholder="https://..." />
            )}
            {(lessonForm.content_type === 'text' || lessonForm.content_type === 'quiz') && (
              <Textarea label="Contenu" value={lessonForm.content_text} onChange={(e) => setLessonForm({ ...lessonForm, content_text: e.target.value })} rows={3} />
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={lessonForm.is_preview} onChange={(e) => setLessonForm({ ...lessonForm, is_preview: e.target.checked })} />
              Aperçu gratuit (visible sans achat)
            </label>
            <Button
              icon={<Plus className="w-4 h-4" />}
              disabled={!lessonForm.title || createLessonMutation.isPending}
              onClick={() => createLessonMutation.mutate()}
            >
              {createLessonMutation.isPending ? 'Ajout...' : 'Ajouter la leçon'}
            </Button>
          </div>
        </Card>

        {managingCourse.status === 'draft' && (
          <Button
            className="w-full" icon={<Send className="w-4 h-4" />}
            disabled={!lessons?.length || publishMutation.isPending}
            onClick={() => publishMutation.mutate(managingCourse.id)}
          >
            Publier le cours
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Mes cours marketplace</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Créez et vendez vos propres cours en dehors du cursus officiel</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Store className="w-4 h-4" />} onClick={() => navigate('/marketplace')}>Voir le catalogue</Button>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>Créer un cours</Button>
        </div>
      </div>

      {isLoading ? (
        <Spinner text="Chargement de vos cours..." />
      ) : !courses || courses.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-12 text-gray-400 dark:text-gray-500">
            <BookOpen className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Vous n'avez créé aucun cours pour le moment.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Card key={c.id} noPadding className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{c.title}</p>
                <Badge label={c.status_display} className={STATUS_BADGE[c.status] ?? 'badge-gray'} dot />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span>{c.lessons_count} leçon(s)</span>
                <span>{c.students_count} élève(s)</span>
                <span>{c.is_free ? 'Gratuit' : `${c.price} pts`}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setManagingCourseId(c.id)}>Gérer</Button>
                {c.status === 'published' ? (
                  <button onClick={() => archiveMutation.mutate(c.id)} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 rounded-lg" title="Archiver">
                    <Archive className="w-4 h-4" />
                  </button>
                ) : c.status === 'draft' && (
                  <button onClick={() => deleteCourseMutation.mutate(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create course modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un cours">
        <div className="space-y-4">
          <Input label="Titre" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} />
          <Textarea label="Description" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} rows={3} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Catégorie" value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })} placeholder="Ex: Data Science" />
            <Select label="Niveau" value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })} options={LEVEL_OPTIONS} />
          </div>
          <Input label="Durée estimée (heures)" type="number" min="1" value={courseForm.duration_hours} onChange={(e) => setCourseForm({ ...courseForm, duration_hours: Number(e.target.value) })} />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={courseForm.is_free} onChange={(e) => setCourseForm({ ...courseForm, is_free: e.target.checked })} />
            Gratuit
          </label>
          {!courseForm.is_free && (
            <Input label="Prix (points)" type="number" min="0" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: Number(e.target.value) })} />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" icon={<X className="w-4 h-4" />} onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button
              disabled={!courseForm.title || !courseForm.description || createCourseMutation.isPending}
              onClick={() => createCourseMutation.mutate()}
            >
              {createCourseMutation.isPending ? 'Création...' : 'Créer (brouillon)'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Star, Clock, Users, Lock, CheckCircle, PlayCircle,
  FileText, HelpCircle, ShoppingCart,
} from 'lucide-react'
import { marketplaceApi } from '../../api'
import { Card, Badge, Button, Spinner, Alert, Textarea } from '../../components/ui'
import { cn } from '../../lib/utils'
import { useRole } from '../../hooks/useRole'
import toast from 'react-hot-toast'

interface Lesson {
  id: string
  title: string
  content_type: string
  content_type_display: string
  content_url: string
  content_text: string
  duration_minutes: number
  is_preview: boolean
  is_completed: boolean
  is_locked: boolean
}

interface Review {
  id: string
  student_name: string
  rating: number
  comment: string
  created_at: string
}

interface CourseDetail {
  id: string
  title: string
  description: string
  level_display: string
  teacher_name: string
  price: string
  is_free: boolean
  duration_hours: number
  rating: string
  rating_count: number
  students_count: number
  is_purchased: boolean
  is_owner: boolean
  status: string
  lessons: Lesson[]
  reviews: Review[]
}

const CONTENT_ICONS: Record<string, typeof PlayCircle> = {
  video: PlayCircle, document: FileText, text: FileText, quiz: HelpCircle,
}

export default function MarketplaceCourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isEtudiant } = useRole()
  const [openLessonId, setOpenLessonId] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')

  const { data: course, isLoading } = useQuery({
    queryKey: ['marketplace-course', id],
    queryFn: () => marketplaceApi.getCourse(id!).then(r => r.data as CourseDetail),
    enabled: !!id,
  })

  const purchaseMutation = useMutation({
    mutationFn: () => marketplaceApi.purchaseCourse(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-course', id] })
      queryClient.invalidateQueries({ queryKey: ['my-wallet'] })
      toast.success('Cours acheté avec succès !')
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(message ?? 'Erreur lors de l\'achat')
    },
  })

  const completeMutation = useMutation({
    mutationFn: (lessonId: string) => marketplaceApi.completeLesson(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-course', id] })
      toast.success('Leçon terminée !')
    },
  })

  const reviewMutation = useMutation({
    mutationFn: () => marketplaceApi.createReview({ course: id!, rating: reviewRating, comment: reviewComment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-course', id] })
      toast.success('Avis publié — merci !')
      setReviewComment('')
    },
    onError: () => toast.error('Erreur lors de la publication de l\'avis'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner text="Chargement du cours..." />
      </div>
    )
  }

  if (!course) return <Alert type="error">Cours introuvable.</Alert>

  const hasAccess = course.is_purchased || course.is_owner
  const alreadyReviewed = course.reviews.some((r) => r.student_name)

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/marketplace')}>
        Retour au catalogue
      </Button>

      <div className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 rounded-2xl p-6 text-white">
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge label={course.level_display} className="bg-white/20 text-white" />
              {course.status !== 'published' && <Badge label="Non publié" className="bg-red-500/80 text-white" />}
            </div>
            <h1 className="text-2xl font-bold text-white">{course.title}</h1>
            <p className="text-amber-100 text-sm mt-1">Par {course.teacher_name}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-amber-100">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{course.duration_hours}h</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" />{course.students_count} inscrit(s)</span>
              {course.rating_count > 0 && (
                <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-white" />{Number(course.rating).toFixed(1)} ({course.rating_count})</span>
              )}
            </div>
          </div>
          {isEtudiant && !hasAccess && (
            <Button
              size="lg" icon={<ShoppingCart className="w-4 h-4" />}
              className="bg-white text-amber-700 hover:bg-amber-50"
              disabled={purchaseMutation.isPending}
              onClick={() => purchaseMutation.mutate()}
            >
              {purchaseMutation.isPending ? 'Achat...' : course.is_free ? 'Obtenir gratuitement' : `Acheter — ${course.price} pts`}
            </Button>
          )}
          {hasAccess && (
            <Badge label={course.is_owner ? 'Vous êtes l\'auteur' : 'Cours acquis'} className="bg-emerald-500/80 text-white" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Description" className="lg:col-span-2">
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{course.description}</p>
        </Card>

        <Card title="Contenu du cours" subtitle={`${course.lessons.length} leçon(s)`}>
          <div className="space-y-2">
            {course.lessons.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Aucune leçon pour le moment.</p>
            )}
            {course.lessons.map((lesson) => {
              const Icon = CONTENT_ICONS[lesson.content_type] ?? FileText
              const isOpen = openLessonId === lesson.id
              return (
                <div key={lesson.id} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => !lesson.is_locked && setOpenLessonId(isOpen ? null : lesson.id)}
                    className={cn('w-full flex items-center gap-3 p-3 text-left transition-colors', !lesson.is_locked && 'hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:bg-gray-800')}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      lesson.is_completed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400'
                    )}>
                      {lesson.is_locked ? <Lock className="w-4 h-4" /> : lesson.is_completed ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{lesson.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{lesson.content_type_display} • {lesson.duration_minutes} min</p>
                    </div>
                    {lesson.is_preview && <Badge label="Aperçu" className="badge-blue" />}
                  </button>
                  {isOpen && !lesson.is_locked && (
                    <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      {lesson.content_type === 'video' && lesson.content_url && (
                        <a href={lesson.content_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all">{lesson.content_url}</a>
                      )}
                      {lesson.content_type === 'document' && lesson.content_url && (
                        <a href={lesson.content_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all">{lesson.content_url}</a>
                      )}
                      {lesson.content_text && <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{lesson.content_text}</p>}
                      {isEtudiant && !lesson.is_completed && (
                        <Button size="sm" className="mt-3" icon={<CheckCircle className="w-3.5 h-3.5" />}
                          onClick={() => completeMutation.mutate(lesson.id)}>
                          Marquer comme terminé
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Reviews */}
      <Card title="Avis" subtitle={`${course.reviews.length} avis`}>
        <div className="space-y-4">
          {isEtudiant && hasAccess && !alreadyReviewed && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setReviewRating(n)}>
                    <Star className={cn('w-5 h-5', n <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
                  </button>
                ))}
              </div>
              <Textarea placeholder="Votre avis sur ce cours..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={2} />
              <Button size="sm" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate()}>
                {reviewMutation.isPending ? 'Publication...' : 'Publier l\'avis'}
              </Button>
            </div>
          )}
          {course.reviews.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Aucun avis pour le moment.</p>
          ) : (
            course.reviews.map((r) => (
              <div key={r.id} className="p-3 border border-gray-100 dark:border-gray-700 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{r.student_name}</p>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn('w-3.5 h-3.5', i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-gray-600 dark:text-gray-300">{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}

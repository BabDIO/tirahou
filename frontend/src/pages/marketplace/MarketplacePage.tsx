import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Store, Search, Star, Clock, Users, Sparkles } from 'lucide-react'
import { marketplaceApi } from '../../api'
import { Card, Input, Badge, Spinner, Select } from '../../components/ui'
import { useRole } from '../../hooks/useRole'

interface MarketplaceCourse {
  id: string
  title: string
  description: string
  category: string
  level: string
  level_display: string
  cover_image: string | null
  price: string
  is_free: boolean
  duration_hours: number
  teacher_name: string
  rating: string
  rating_count: number
  lessons_count: number
  students_count: number
}

const LEVEL_OPTIONS = [
  { value: '', label: 'Tous les niveaux' },
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
]

export default function MarketplacePage() {
  const navigate = useNavigate()
  const { isEnseignant } = useRole()
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')

  const { data: courses, isLoading } = useQuery({
    queryKey: ['marketplace-courses', search, level],
    queryFn: () => marketplaceApi.getCourses({ search: search || undefined, level: level || undefined })
      .then(r => (r.data.results ?? r.data) as MarketplaceCourse[]),
  })

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Store className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span className="text-amber-200 text-sm font-medium">Marketplace de cours</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Développez vos compétences</h1>
            </div>
          </div>
          {isEnseignant && (
            <button
              onClick={() => navigate('/marketplace/my-courses')}
              className="bg-white/10 border border-white/20 hover:bg-white/20 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
            >
              Mes cours enseignant
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="Rechercher un cours..." leftIcon={<Search className="w-4 h-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-56">
          <Select value={level} onChange={(e) => setLevel(e.target.value)} options={LEVEL_OPTIONS} />
        </div>
      </div>

      {isLoading ? (
        <Spinner text="Chargement du catalogue..." />
      ) : !courses || courses.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">Aucun cours disponible pour le moment.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => navigate(`/marketplace/${course.id}`)}
              className="text-left bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="h-32 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                {course.cover_image ? (
                  <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-10 h-10 text-white/60" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <Badge label={course.level_display} className="badge-blue" />
                  <Badge label={course.is_free ? 'Gratuit' : `${course.price} pts`} className={course.is_free ? 'badge-green' : 'badge-amber'} />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 line-clamp-2">{course.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Par {course.teacher_name}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{course.duration_hours}h</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{course.students_count}</span>
                  {course.rating_count > 0 && (
                    <span className="flex items-center gap-1 text-amber-500"><Star className="w-3.5 h-3.5 fill-amber-400" />{Number(course.rating).toFixed(1)}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Search, Filter, Clock, Users, TrendingUp } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Progress } from '../../components/ui'
import api from '../../lib/axios'

interface CourseSpace {
  id: string; title: string; ue_code: string; ue_name: string
  mode: string; mode_display: string; is_published: boolean
  teachers: string[]
}

interface StudentProgress {
  course_space: string; completion_rate: number; total_time_minutes: number; last_access: string | null
}

const modeColor: Record<string, string> = {
  presentiel: 'badge-green', distanciel_sync: 'badge-blue',
  distanciel_async: 'badge-purple', hybride: 'badge-yellow', comodal: 'badge-orange',
}

export default function MyCoursesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => api.get('/course-spaces/').then(r => r.data),
  })

  const { data: progressData } = useQuery({
    queryKey: ['my-progress-all'],
    queryFn: () => api.get('/student-progress/').then(r => r.data),
  })

  const courses: CourseSpace[] = data?.results ?? []
  const progressMap: Record<string, StudentProgress> = {}
  ;(progressData?.results ?? []).forEach((p: StudentProgress) => { progressMap[p.course_space] = p })

  const filtered = courses.filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.ue_code.toLowerCase().includes(search.toLowerCase())
    const matchMode = !modeFilter || c.mode === modeFilter
    return matchSearch && matchMode
  })

  const avgCompletion = courses.length
    ? Math.round(courses.reduce((s, c) => s + (progressMap[c.id]?.completion_rate ?? 0), 0) / courses.length)
    : 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Mes Cours</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Accédez à vos espaces de cours et ressources pédagogiques</p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-4 text-white">
          <p className="text-primary-200 text-xs font-medium">Cours inscrits</p>
          <p className="text-2xl font-black mt-1">{courses.length}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
          <p className="text-emerald-200 text-xs font-medium">Progression moy.</p>
          <p className="text-2xl font-black mt-1">{avgCompletion}%</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white">
          <p className="text-amber-200 text-xs font-medium">À compléter</p>
          <p className="text-2xl font-black mt-1">{courses.filter(c => (progressMap[c.id]?.completion_rate ?? 0) < 100).length}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9 w-full" placeholder="Rechercher un cours, un code UE..." />
        </div>
        <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="input w-full sm:w-44">
          <option value="">Tous les modes</option>
          <option value="presentiel">Présentiel</option>
          <option value="distanciel_sync">Distanciel Sync</option>
          <option value="distanciel_async">Distanciel Async</option>
          <option value="hybride">Hybride</option>
          <option value="comodal">Comodal</option>
        </select>
      </div>

      {isLoading ? <Spinner text="Chargement de vos cours..." /> : !filtered.length ? (
        <Empty icon={<BookOpen className="w-8 h-8" />}
          message={search || modeFilter ? 'Aucun cours correspondant' : 'Aucun cours disponible'}
          description={!courses.length ? 'Vos cours apparaîtront après votre inscription pédagogique' : 'Modifiez vos filtres'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(c => {
            const prog = progressMap[c.id]
            const completion = prog?.completion_rate ?? 0
            const timeH = Math.floor((prog?.total_time_minutes ?? 0) / 60)
            const timeM = (prog?.total_time_minutes ?? 0) % 60
            return (
              <Card key={c.id} hover onClick={() => navigate(`/student/courses/${c.id}`)} className="cursor-pointer">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-primary-600" />
                  </div>
                  <Badge label={c.mode_display ?? c.mode} className={modeColor[c.mode] ?? 'badge-gray'} />
                </div>

                <h3 className="font-bold text-gray-900 dark:text-gray-50 mb-1">{c.title}</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{c.ue_code} — {c.ue_name}</p>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {timeH > 0 ? `${timeH}h${timeM > 0 ? timeM + 'min' : ''}` : timeM > 0 ? `${timeM} min` : '—'}
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round(completion)}% complété</span>
                </div>

                <Progress value={completion}
                  color={completion >= 75 ? 'bg-emerald-500' : completion >= 40 ? 'bg-amber-500' : 'bg-primary-500'}
                  size="sm" />

                {prog?.last_access && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Dernière activité : {new Date(prog.last_access).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

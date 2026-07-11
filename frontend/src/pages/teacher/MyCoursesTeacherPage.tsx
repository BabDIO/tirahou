import { useQuery } from '@tanstack/react-query'
import { BookOpen, Users, Calendar, Video } from 'lucide-react'
import { Card, StatsCard, Badge, Button } from '../../components/ui'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/axios'

export default function MyCoursesTeacherPage() {
  const navigate = useNavigate()
  
  const { data: courses } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => api.get('/teacher/courses/').then(r => r.data)
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mes cours</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses?.map((course: any) => (
          <Card key={course.id} hover>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-gray-50 truncate">{course.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{course.code}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Étudiants</p>
                <p className="text-lg font-bold">{course.students_count}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Séances</p>
                <p className="text-lg font-bold">{course.sessions_count}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => navigate(`/teacher/courses/${course.id}/grades`)}>
                Notes
              </Button>
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => navigate(`/teacher/courses/${course.id}`)}>
                Détails
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

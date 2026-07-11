import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, MapPin, Video } from 'lucide-react'
import { Card, Badge, Button } from '../../components/ui'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/axios'

export default function MySchedulePage() {
  const navigate = useNavigate()

  const { data: schedule } = useQuery({
    queryKey: ['student-schedule'],
    queryFn: () => api.get('/student/schedule/').then(r => r.data)
  })

  const groupByDay = (sessions: any[]) => {
    const days: Record<string, any[]> = {}
    sessions?.forEach(s => {
      const day = s.day || 'Lundi'
      if (!days[day]) days[day] = []
      days[day].push(s)
    })
    return days
  }

  const byDay = groupByDay(schedule || [])
  const daysOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mon emploi du temps</h1>

      <div className="space-y-4">
        {daysOrder.map(day => byDay[day] && (
          <Card key={day} title={day}>
            <div className="space-y-3">
              {byDay[day].sort((a, b) => a.start_time.localeCompare(b.start_time)).map((session: any) => (
                <div key={session.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 transition">
                  <div className="w-16 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Début</p>
                    <p className="font-bold text-sm">{session.start_time}</p>
                  </div>
                  <div className="h-12 w-px bg-gray-300" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-50">{session.course_name}</h4>
                      <Badge label={session.type} className="badge-blue" />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {session.duration}
                      </span>
                      {session.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {session.room}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        {session.teacher_name}
                      </span>
                    </div>
                  </div>
                  {session.is_virtual && (
                    <Button size="sm" icon={<Video className="w-4 h-4" />} onClick={() => navigate(`/virtual-classes/${session.virtual_class_id}`)}>
                      Rejoindre
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

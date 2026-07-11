import { useQuery } from '@tanstack/react-query'
import { Clock, MapPin, Video } from 'lucide-react'
import { Card, Badge, Button, Empty, Spinner } from '../../components/ui'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/axios'

interface ScheduledSession {
  id: string
  ec_name: string
  ec_code: string
  teacher_name: string
  room_name: string | null
  mode: string
  mode_display: string
  start_datetime: string
  end_datetime: string
}

const DAYS_ORDER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export default function MySchedulePage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['student-schedule'],
    queryFn: () => api.get('/sessions/', { params: { ordering: 'start_datetime' } }).then(r => r.data),
  })

  const sessions: ScheduledSession[] = data?.results ?? data ?? []

  const byDay: Record<string, ScheduledSession[]> = {}
  sessions.forEach((s) => {
    const day = new Date(s.start_datetime).toLocaleDateString('fr-FR', { weekday: 'long' })
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(s)
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner text="Chargement de votre emploi du temps..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mon emploi du temps</h1>

      {sessions.length === 0 ? (
        <Empty message="Aucune séance planifiée" description="Votre emploi du temps sera affiché ici dès qu'il sera publié." />
      ) : (
        <div className="space-y-4">
          {DAYS_ORDER.filter((day) => byDay[day]).map((day) => (
            <Card key={day} title={day.charAt(0).toUpperCase() + day.slice(1)}>
              <div className="space-y-3">
                {byDay[day].map((session) => {
                  const isVirtual = session.mode !== 'presentiel'
                  return (
                    <div key={session.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                      <div className="w-16 text-center flex-shrink-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Début</p>
                        <p className="font-bold text-sm">
                          {new Date(session.start_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="h-12 w-px bg-gray-300 dark:bg-gray-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-50 truncate">{session.ec_name}</h4>
                          <Badge label={session.mode_display} className="badge-blue" />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(session.start_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {' – '}
                            {new Date(session.end_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {session.room_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {session.room_name}
                            </span>
                          )}
                          {session.teacher_name && <span>{session.teacher_name}</span>}
                        </div>
                      </div>
                      {isVirtual && (
                        <Button size="sm" icon={<Video className="w-4 h-4" />} onClick={() => navigate('/my-virtual-classes')}>
                          Rejoindre
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

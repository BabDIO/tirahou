import { useQuery, useMutation } from '@tanstack/react-query'
import { MonitorPlay, ExternalLink, Video, Clock, Users, Wifi, Calendar } from 'lucide-react'
import { Card, Spinner, Badge, Empty } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

const statusColor = (s: string) => ({
  planifiee: 'badge-blue', en_cours: 'badge-green', terminee: 'badge-gray', annulee: 'badge-red',
}[s] ?? 'badge-gray')

const PROVIDER_ICONS: Record<string, string> = {
  bbb: '🔵', jitsi: '🟢', zoom: '🔷', meet: '🟡', teams: '🟣',
}

export default function MyVirtualClassesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-virtual-sessions'],
    queryFn: () => api.get('/virtual-sessions/').then(r => r.data),
  })

  const joinMut = useMutation({
    mutationFn: (id: string) => api.post(`/virtual-sessions/${id}/join/`).then(r => r.data),
    onSuccess: (data) => {
      if (data?.join_url) window.open(data.join_url, '_blank')
      else toast.error('Lien de connexion indisponible')
    },
    onError: () => toast.error('Impossible de rejoindre'),
  })

  const sessions = data?.results ?? data ?? []
  const upcoming = sessions.filter((s: { status: string; scheduled_start: string }) =>
    s.status === 'planifiee' && new Date(s.scheduled_start) >= new Date()
  )
  const live = sessions.filter((s: { status: string }) => s.status === 'en_cours')
  const past = sessions.filter((s: { status: string }) => s.status === 'terminee' || s.status === 'annulee')

  if (isLoading) return <Spinner text="Chargement de vos classes virtuelles..." />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Mes Classes Virtuelles</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Sessions en direct et replays disponibles</p>
      </div>

      {/* En cours maintenant */}
      {live.length > 0 && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
          <p className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            🔴 Session en cours maintenant
          </p>
          {live.map((s: { id: string; title: string; provider: string; course_space_title?: string; join_url?: string }) => (
            <div key={s.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-50">{s.title}</p>
                {s.course_space_title && <p className="text-xs text-gray-500 dark:text-gray-400">{s.course_space_title}</p>}
              </div>
              <button onClick={() => joinMut.mutate(s.id)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition animate-pulse">
                <ExternalLink className="w-4 h-4" /> Rejoindre maintenant
              </button>
            </div>
          ))}
        </div>
      )}

      {!sessions.length ? (
        <Empty icon={<MonitorPlay className="w-8 h-8" />} message="Aucune classe virtuelle"
          description="Vos classes virtuelles apparaîtront ici une fois planifiées par vos enseignants." />
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">À venir</h2>
              <div className="space-y-3">
                {upcoming.map((s: {
                  id: string; title: string; provider: string; mode: string
                  scheduled_start: string; scheduled_end: string; room_capacity: number
                  physical_room: string; course_space_title?: string; status: string
                }) => (
                  <Card key={s.id} hover>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-lg">
                          {PROVIDER_ICONS[s.provider] ?? '📡'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-gray-50">{s.title}</p>
                          {s.course_space_title && <p className="text-xs text-gray-400 dark:text-gray-500">{s.course_space_title}</p>}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(s.scheduled_start)}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(s.scheduled_start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              {' – '}
                              {new Date(s.scheduled_end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{s.room_capacity} places</span>
                            {s.physical_room && <span>📍 {s.physical_room}</span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => joinMut.mutate(s.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition flex-shrink-0">
                        <ExternalLink className="w-4 h-4" /> Rejoindre
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Sessions passées</h2>
              <div className="space-y-2">
                {past.map((s: {
                  id: string; title: string; provider: string; status: string
                  scheduled_start: string; replay_available: boolean; recording_url: string
                  course_space_title?: string
                }) => (
                  <Card key={s.id} className={s.status === 'annulee' ? 'opacity-60' : ''}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{PROVIDER_ICONS[s.provider] ?? '📡'}</span>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{s.title}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(s.scheduled_start)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge label={s.status} className={statusColor(s.status)} />
                        {s.replay_available && s.recording_url && (
                          <a href={s.recording_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 transition">
                            <Video className="w-3.5 h-3.5" /> Replay
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

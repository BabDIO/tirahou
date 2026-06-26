import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, MapPin, Monitor, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { Card, Spinner, Badge, Empty } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import api from '../../lib/axios'
import { useAuthStore } from '../../store/authStore'

interface Session {
  id: string; ec_code: string; ec_name?: string; teacher_name?: string
  room_name?: string; mode: string; start_datetime: string; end_datetime: string
  status: string; group_name?: string; virtual_link?: string
}

const modeColor: Record<string, string> = {
  presentiel: 'bg-emerald-100 text-emerald-700',
  distanciel_sync: 'bg-blue-100 text-blue-700',
  distanciel_async: 'bg-purple-100 text-purple-700',
  hybride: 'bg-amber-100 text-amber-700',
}

const statusColor: Record<string, string> = {
  planifie: 'bg-gray-100 text-gray-600',
  confirme: 'bg-emerald-100 text-emerald-700',
  annule: 'bg-red-100 text-red-600 line-through',
  realise: 'bg-gray-100 text-gray-500',
}

function getWeekDates(offset: number): Date[] {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now); d.setDate(diff + i); return d
  })
}

export default function MySchedulePage() {
  const { user } = useAuthStore()
  const [weekOffset, setWeekOffset] = useState(0)
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week')

  const weekDates = getWeekDates(weekOffset)
  const startDate = weekDates[0].toISOString().split('T')[0]
  const endDate = weekDates[4].toISOString().split('T')[0]

  const { data, isLoading } = useQuery({
    queryKey: ['my-schedule', startDate, endDate],
    queryFn: () => api.get('/sessions/', {
      params: { start_datetime__gte: startDate, end_datetime__lte: endDate + 'T23:59:59', ordering: 'start_datetime' }
    }).then(r => r.data),
  })

  const sessions: Session[] = data?.results ?? []

  const sessionsByDay = weekDates.map(date => ({
    date,
    sessions: sessions.filter(s => new Date(s.start_datetime).toDateString() === date.toDateString()),
  }))

  const today = new Date().toDateString()
  const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Mon Emploi du Temps</h1>
          <p className="text-gray-400 text-sm mt-0.5">Planning hebdomadaire de vos cours</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {[{ key: 'week', label: 'Semaine' }, { key: 'list', label: 'Liste' }].map(v => (
            <button key={v.key} onClick={() => setViewMode(v.key as typeof viewMode)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${viewMode === v.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation semaine */}
      <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="text-center">
          <p className="font-bold text-gray-900 text-sm">
            {weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} —{' '}
            {weekDates[4].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {weekOffset === 0 && <p className="text-xs text-primary-600 font-medium mt-0.5">Semaine actuelle</p>}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition">
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {isLoading ? <Spinner text="Chargement de votre planning..." /> : !sessions.length ? (
        <Empty icon={<Calendar className="w-8 h-8" />} message="Aucune séance cette semaine"
          description="Naviguez vers une autre semaine ou attendez la publication de l'emploi du temps." />
      ) : viewMode === 'week' ? (
        /* Vue semaine */
        <div className="grid grid-cols-5 gap-2">
          {sessionsByDay.map(({ date, sessions: daySessions }) => {
            const isToday = date.toDateString() === today
            return (
              <div key={date.toISOString()}>
                <div className={`text-center py-2 rounded-xl mb-2 ${isToday ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-600'}`}>
                  <p className={`text-xs font-semibold ${isToday ? 'text-primary-100' : 'text-gray-400'}`}>
                    {DAYS_FR[date.getDay() - 1]}
                  </p>
                  <p className={`text-lg font-black ${isToday ? 'text-white' : 'text-gray-800'}`}>{date.getDate()}</p>
                </div>
                <div className="space-y-1.5">
                  {daySessions.map(s => (
                    <div key={s.id}
                      className={`p-2 rounded-xl border text-xs ${statusColor[s.status] ?? 'bg-white border-gray-100'} ${s.status === 'annule' ? 'opacity-50' : ''}`}>
                      <p className="font-bold truncate">{s.ec_code}</p>
                      <p className="text-gray-500 mt-0.5">
                        {new Date(s.start_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {' – '}
                        {new Date(s.end_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {s.room_name && <p className="text-gray-400 truncate">📍 {s.room_name}</p>}
                      <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-md text-xs font-medium ${modeColor[s.mode] ?? 'bg-gray-100 text-gray-600'}`}>
                        {s.mode}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Vue liste */
        <div className="space-y-3">
          {sessionsByDay.filter(d => d.sessions.length > 0).map(({ date, sessions: daySessions }) => (
            <div key={date.toISOString()}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`px-3 py-1 rounded-lg text-xs font-bold ${date.toDateString() === today ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-2">
                {daySessions.map(s => (
                  <Card key={s.id} hover className={s.status === 'annule' ? 'opacity-60' : ''}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 text-center w-14">
                        <p className="text-xs text-gray-400">{new Date(s.start_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        <div className="my-1 w-px h-6 bg-gray-200 mx-auto" />
                        <p className="text-xs text-gray-400">{new Date(s.end_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-900">{s.ec_code}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${modeColor[s.mode] ?? 'bg-gray-100 text-gray-600'}`}>{s.mode}</span>
                          {s.status === 'annule' && <Badge label="Annulé" className="badge-red" />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          {s.teacher_name && <span>👤 {s.teacher_name}</span>}
                          {s.room_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {s.room_name}
                            </span>
                          )}
                          {s.group_name && <span>👥 {s.group_name}</span>}
                        </div>
                        {(s.mode === 'distanciel_sync' || s.mode === 'hybride') && s.virtual_link && (
                          <a href={s.virtual_link} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium">
                            <Monitor className="w-3.5 h-3.5" /> Rejoindre en ligne
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

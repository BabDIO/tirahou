import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Video, Plus, ExternalLink, Users, Clock, MonitorPlay, Calendar, Wifi } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Modal, Alert } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import api from '../../lib/axios'
import { useRole } from '../../hooks/useRole'
import toast from 'react-hot-toast'

interface VirtualSession {
  id: string
  title: string
  description: string
  mode: string
  provider: string
  scheduled_start: string
  scheduled_end: string
  actual_start: string | null
  join_url: string
  recording_url: string
  replay_available: boolean
  status: string
  room_capacity: number
  physical_room: string
  course_space_title?: string
}

const PROVIDER_LABELS: Record<string, string> = {
  bbb: 'BigBlueButton', jitsi: 'Jitsi Meet', zoom: 'Zoom',
  meet: 'Google Meet', teams: 'Microsoft Teams', autre: 'Autre',
}

const statusColor = (s: string) => ({
  planifiee: 'bg-blue-100 text-blue-700',
  en_cours: 'bg-emerald-100 text-emerald-700 animate-pulse',
  terminee: 'bg-gray-100 text-gray-600 dark:text-gray-400',
  annulee: 'bg-red-100 text-red-600',
}[s] ?? 'bg-gray-100 text-gray-600 dark:text-gray-400')

export default function VirtualClassesPage() {
  const qc = useQueryClient()
  const { isEnseignant, isAdmin } = useRole()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', provider: 'bbb', mode: 'hybride',
    scheduled_start: '', scheduled_end: '', room_capacity: 50,
    physical_room: '', course_space: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['virtual-sessions'],
    queryFn: () => api.get('/virtual-sessions/').then(r => r.data),
  })

  const { data: courseSpaces } = useQuery({
    queryKey: ['course-spaces-list'],
    queryFn: () => api.get('/course-spaces/?is_published=true').then(r => r.data),
    enabled: isEnseignant || isAdmin,
  })

  const createMut = useMutation({
    mutationFn: (d: object) => api.post('/virtual-sessions/', d),
    onSuccess: () => {
      toast.success('Session créée')
      qc.invalidateQueries({ queryKey: ['virtual-sessions'] })
      setShowCreate(false)
      setForm({ title: '', description: '', provider: 'bbb', mode: 'hybride', scheduled_start: '', scheduled_end: '', room_capacity: 50, physical_room: '', course_space: '' })
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const joinMut = useMutation({
    mutationFn: (id: string) => api.post(`/virtual-sessions/${id}/join/`).then(r => r.data),
    onSuccess: (data) => {
      if (data?.join_url) window.open(data.join_url, '_blank')
      else toast.error('Lien de connexion indisponible')
    },
    onError: () => toast.error('Impossible de rejoindre la session'),
  })

  const sessions: VirtualSession[] = data?.results ?? data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Classes Virtuelles</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Sessions hybrides synchrones et asynchrones</p>
        </div>
        {(isEnseignant || isAdmin) && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 text-sm font-semibold transition">
            <Plus className="w-4 h-4" /> Planifier une session
          </button>
        )}
      </div>

      {isLoading ? <Spinner text="Chargement des sessions..." /> : !sessions.length ? (
        <Empty icon={<Video className="w-8 h-8" />} message="Aucune session planifiée"
          description="Les classes virtuelles apparaîtront ici une fois créées." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sessions.map(s => (
            <Card key={s.id} hover className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <MonitorPlay className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-50">{s.title}</p>
                    {s.course_space_title && <p className="text-xs text-gray-400 dark:text-gray-500">{s.course_space_title}</p>}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor(s.status)}`}>
                  {s.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  {formatDate(s.scheduled_start)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  {new Date(s.scheduled_start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  {' → '}
                  {new Date(s.scheduled_end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  {PROVIDER_LABELS[s.provider] ?? s.provider}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  {s.room_capacity} places
                </span>
              </div>

              {s.physical_room && (
                <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-2.5 py-1.5">
                  📍 Salle physique : <span className="font-medium">{s.physical_room}</span>
                </p>
              )}

              {s.description && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{s.description}</p>}

              <div className="flex gap-2 pt-1">
                {s.status !== 'annulee' && s.status !== 'terminee' && (
                  <button
                    onClick={() => joinMut.mutate(s.id)}
                    disabled={joinMut.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 text-sm font-semibold transition disabled:opacity-50">
                    <ExternalLink className="w-4 h-4" /> Rejoindre
                  </button>
                )}
                {s.replay_available && s.recording_url && (
                  <a href={s.recording_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 text-sm font-semibold transition">
                    <Video className="w-4 h-4" /> Replay
                  </a>
                )}
                <a href={`/virtual-classes/${s.id}`}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-100 text-sm font-semibold transition">
                  Détails
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal création */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Planifier une classe virtuelle" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Titre *</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Cours Algorithmes S3 - Semaine 5" />
            </div>
            <div>
              <label className="label">Fournisseur</label>
              <select className="input" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}>
                {Object.entries(PROVIDER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Mode</label>
              <select className="input" value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}>
                <option value="presentiel">Présentiel</option>
                <option value="distanciel_sync">Distanciel Synchrone</option>
                <option value="hybride">Hybride</option>
              </select>
            </div>
            <div>
              <label className="label">Début *</label>
              <input type="datetime-local" className="input" value={form.scheduled_start} onChange={e => setForm(f => ({ ...f, scheduled_start: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fin *</label>
              <input type="datetime-local" className="input" value={form.scheduled_end} onChange={e => setForm(f => ({ ...f, scheduled_end: e.target.value }))} />
            </div>
            <div>
              <label className="label">Capacité</label>
              <input type="number" className="input" value={form.room_capacity} onChange={e => setForm(f => ({ ...f, room_capacity: +e.target.value }))} min={1} />
            </div>
            <div>
              <label className="label">Salle physique (hybride)</label>
              <input className="input" value={form.physical_room} onChange={e => setForm(f => ({ ...f, physical_room: e.target.value }))} placeholder="Ex: Amphi A" />
            </div>
            {courseSpaces?.results?.length > 0 && (
              <div className="sm:col-span-2">
                <label className="label">Espace de cours</label>
                <select className="input" value={form.course_space} onChange={e => setForm(f => ({ ...f, course_space: e.target.value }))}>
                  <option value="">— Sélectionner —</option>
                  {courseSpaces.results.map((cs: { id: string; title: string }) => (
                    <option key={cs.id} value={cs.id}>{cs.title}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input h-20 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Objectifs, programme de la session..." />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Annuler</button>
            <button
              onClick={() => createMut.mutate({ ...form, course_space: form.course_space || undefined })}
              disabled={!form.title || !form.scheduled_start || !form.scheduled_end || createMut.isPending}
              className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
              {createMut.isPending ? 'Création...' : 'Créer la session'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

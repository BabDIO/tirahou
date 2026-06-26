import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Video, Plus, Eye, Play, Square, Calendar, Users, Clock, ExternalLink } from 'lucide-react'
import { virtualClassApi, lmsApi } from '../../api'
import { Button, Input, Badge, Spinner, Empty, Pagination, Modal, Card, StatsCard } from '../../components/ui'
import { useToast } from '../../hooks/useToast'
import { useRole } from '../../hooks/useRole'
import type { VirtualClassSession } from '../../types'

const statusColor: Record<string, string> = {
  planifiee: 'badge-gray',
  en_cours: 'badge-green',
  terminee: 'badge-blue',
  annulee: 'badge-red',
}

const providerIcon: Record<string, string> = {
  bbb: '🎓', jitsi: '🎥', zoom: '💙', meet: '📹', teams: '🟣', autre: '🖥',
}

const modeColor: Record<string, string> = {
  presentiel: 'badge-blue', distanciel_sync: 'badge-yellow', hybride: 'badge-green',
}

export default function VirtualClassesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { isEnseignant, isAdmin } = useRole()

  const { data, isLoading } = useQuery({
    queryKey: ['virtual-sessions', page, search, statusFilter],
    queryFn: () => virtualClassApi.getSessions({
      page, search, status: statusFilter || undefined
    }).then(r => r.data),
  })

  const startMutation = useMutation({
    mutationFn: (id: string) => virtualClassApi.startSession(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['virtual-sessions'] }); toast.success('Session démarrée') },
  })

  const endMutation = useMutation({
    mutationFn: (id: string) => virtualClassApi.endSession(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['virtual-sessions'] }); toast.success('Session terminée') },
  })

  const planifiees = data?.results?.filter((s: VirtualClassSession) => s.status === 'planifiee').length ?? 0
  const enCours = data?.results?.filter((s: VirtualClassSession) => s.status === 'en_cours').length ?? 0
  const terminees = data?.results?.filter((s: VirtualClassSession) => s.status === 'terminee').length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Classes Virtuelles</h1>
          <p className="text-gray-400 text-sm mt-0.5">{data?.count ?? 0} session(s) de classe virtuelle</p>
        </div>
        {(isEnseignant || isAdmin) && (
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            Nouvelle session
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Total sessions" value={data?.count ?? 0}
          icon={<Video className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="En cours" value={enCours}
          icon={<Play className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Planifiées" value={planifiees}
          icon={<Calendar className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
        <StatsCard title="Terminées" value={terminees}
          icon={<Square className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
      </div>

      {/* Filters */}
      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par titre, cours..." leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="input w-full sm:w-44">
            <option value="">Tous les statuts</option>
            <option value="planifiee">Planifiée</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminée</option>
            <option value="annulee">Annulée</option>
          </select>
        </div>
      </Card>

      {/* Grid of sessions */}
      {isLoading ? <Spinner text="Chargement des sessions..." /> : !data?.results?.length ? (
        <Empty message="Aucune session de classe virtuelle"
          icon={<Video className="w-8 h-8" />}
          description="Créez votre première session de classe virtuelle"
          action={
            (isEnseignant || isAdmin) ? (
              <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
                Nouvelle session
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.results.map((session: VirtualClassSession) => (
              <SessionCard
                key={session.id}
                session={session}
                canManage={isEnseignant || isAdmin}
                onStart={() => startMutation.mutate(session.id)}
                onEnd={() => endMutation.mutate(session.id)}
                onView={() => navigate(`/virtual-classes/${session.id}`)}
                starting={startMutation.isPending}
                ending={endMutation.isPending}
              />
            ))}
          </div>
          {data.count > 20 && (
            <Pagination page={page} total={data.count} pageSize={20} onChange={setPage} />
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle session de classe virtuelle" size="lg">
        <CreateSessionForm
          onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['virtual-sessions'] }) }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </div>
  )
}

function SessionCard({
  session, canManage, onStart, onEnd, onView, starting, ending
}: {
  session: VirtualClassSession
  canManage: boolean
  onStart: () => void
  onEnd: () => void
  onView: () => void
  starting: boolean
  ending: boolean
}) {
  const durationMin = Math.round(
    (new Date(session.scheduled_end).getTime() - new Date(session.scheduled_start).getTime()) / 60000
  )

  return (
    <div className="card p-5 hover:shadow-md transition-all duration-200 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
          session.status === 'en_cours' ? 'bg-emerald-50 animate-pulse' : 'bg-gray-100'
        }`}>
          {providerIcon[session.provider] ?? '🖥'}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge label={session.status_display} className={statusColor[session.status] ?? 'badge-gray'} dot />
          <Badge label={session.mode} className={modeColor[session.mode] ?? 'badge-gray'} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{session.title}</h3>
        <p className="text-xs text-gray-400 mb-3">{session.course_space_title}</p>
        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            {new Date(session.scheduled_start).toLocaleString('fr-FR', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {durationMin} min
          </div>
          {session.participants_count !== undefined && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              {session.participants_count} participant(s)
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
        <Button variant="secondary" size="sm" className="flex-1" icon={<Eye className="w-3.5 h-3.5" />}
          onClick={onView}>Détails</Button>
        {canManage && session.status === 'planifiee' && (
          <Button size="sm" className="flex-1" icon={<Play className="w-3.5 h-3.5" />}
            loading={starting} onClick={onStart}>Démarrer</Button>
        )}
        {canManage && session.status === 'en_cours' && (
          <Button variant="danger" size="sm" className="flex-1" icon={<Square className="w-3.5 h-3.5" />}
            loading={ending} onClick={onEnd}>Terminer</Button>
        )}
        {session.join_url && session.status === 'en_cours' && (
          <Button size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}
            onClick={() => window.open(session.join_url, '_blank')}>
            Rejoindre
          </Button>
        )}
        {session.recording_url && (
          <Button variant="ghost" size="sm" icon={<Video className="w-3.5 h-3.5" />}
            onClick={() => window.open(session.recording_url, '_blank')}>
            Replay
          </Button>
        )}
      </div>
    </div>
  )
}

function CreateSessionForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({
    course_space: '', title: '', description: '', mode: 'hybride',
    provider: 'bbb', scheduled_start: '', scheduled_end: '',
    is_recorded: false, room_capacity: 100,
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string | boolean | number) => setForm(f => ({ ...f, [k]: v }))

  const { data: spaces } = useQuery({
    queryKey: ['course-spaces-list'],
    queryFn: () => lmsApi.getCourseSpaces({ page_size: 200 }).then(r => r.data),
  })

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.course_space || !form.title || !form.scheduled_start || !form.scheduled_end) {
      toast.error('Tous les champs obligatoires doivent être remplis')
      return
    }
    setLoading(true)
    try {
      await virtualClassApi.createSession(form)
      toast.success('Session créée avec succès')
      onSuccess()
    } catch { toast.error('Erreur lors de la création') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Espace de cours *</label>
        <select className="input bg-white" value={form.course_space} onChange={e => set('course_space', e.target.value)}>
          <option value="">— Sélectionner un cours —</option>
          {spaces?.results?.map((s: { id: string; title: string; ue_code: string }) => (
            <option key={s.id} value={s.id}>{s.ue_code} — {s.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Titre de la session *</label>
        <input className="input" value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="CM — Introduction à l'algorithmique" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Mode</label>
          <select className="input bg-white" value={form.mode} onChange={e => set('mode', e.target.value)}>
            <option value="presentiel">Présentiel</option>
            <option value="distanciel_sync">Distanciel synchrone</option>
            <option value="hybride">Hybride</option>
          </select>
        </div>
        <div>
          <label className="label">Plateforme</label>
          <select className="input bg-white" value={form.provider} onChange={e => set('provider', e.target.value)}>
            <option value="bbb">BigBlueButton</option>
            <option value="jitsi">Jitsi Meet</option>
            <option value="zoom">Zoom</option>
            <option value="meet">Google Meet</option>
            <option value="teams">Microsoft Teams</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div>
          <label className="label">Début *</label>
          <input type="datetime-local" className="input" value={form.scheduled_start}
            onChange={e => set('scheduled_start', e.target.value)} />
        </div>
        <div>
          <label className="label">Fin *</label>
          <input type="datetime-local" className="input" value={form.scheduled_end}
            onChange={e => set('scheduled_end', e.target.value)} />
        </div>
        <div>
          <label className="label">Capacité</label>
          <input type="number" className="input" min={1} value={form.room_capacity}
            onChange={e => set('room_capacity', Number(e.target.value))} />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" id="is_recorded" checked={form.is_recorded}
            onChange={e => set('is_recorded', e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded" />
          <label htmlFor="is_recorded" className="text-sm text-gray-700 cursor-pointer">Enregistrement activé</label>
        </div>
      </div>
      <div>
        <label className="label">Description (optionnel)</label>
        <textarea className="input min-h-[60px] resize-none" value={form.description}
          onChange={e => set('description', e.target.value)} placeholder="Description de la session..." />
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={loading} icon={<Video className="w-4 h-4" />}>
          Créer la session
        </Button>
      </div>
    </form>
  )
}

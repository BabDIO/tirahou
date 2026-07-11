import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Video, Users, Clock, Play, Square, ExternalLink,
  ArrowLeft, Monitor, Wifi, WifiOff, Calendar, Info
} from 'lucide-react'
import { virtualClassApi } from '../../api'
import { Button, Badge, Spinner, Card, StatsCard, Alert, Modal } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import { useAuthStore } from '../../store/authStore'
import { useRole } from '../../hooks/useRole'
import type { VirtualClassSession } from '../../types'

const statusColor: Record<string, string> = {
  planifiee: 'badge-gray',
  en_cours: 'badge-green',
  terminee: 'badge-blue',
  annulee: 'badge-red',
}

const providerInfo: Record<string, { name: string; icon: string; color: string }> = {
  bbb: { name: 'BigBlueButton', icon: '🎓', color: 'bg-blue-100 text-blue-700' },
  jitsi: { name: 'Jitsi Meet', icon: '🎥', color: 'bg-teal-100 text-teal-700' },
  zoom: { name: 'Zoom', icon: '💙', color: 'bg-blue-100 text-blue-800' },
  meet: { name: 'Google Meet', icon: '📹', color: 'bg-green-100 text-green-700' },
  teams: { name: 'Microsoft Teams', icon: '🟣', color: 'bg-purple-100 text-purple-700' },
  autre: { name: 'Autre', icon: '🖥', color: 'bg-gray-100 text-gray-700 dark:text-gray-300' },
}

export default function VirtualClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuthStore()
  const { isEnseignant, isAdmin } = useRole()
  const [joinMode, setJoinMode] = useState<'online' | 'physical'>('online')
  const [joinOpen, setJoinOpen] = useState(false)

  const { data: session, isLoading } = useQuery({
    queryKey: ['virtual-session', id],
    queryFn: () => virtualClassApi.getSessions({ id }).then(r => r.data.results?.[0] as VirtualClassSession),
    enabled: !!id,
  })

  const startMutation = useMutation({
    mutationFn: () => virtualClassApi.startSession(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['virtual-session', id] }); toast.success('Session démarrée') },
    onError: () => toast.error('Erreur lors du démarrage'),
  })

  const endMutation = useMutation({
    mutationFn: () => virtualClassApi.endSession(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['virtual-session', id] }); toast.success('Session terminée') },
    onError: () => toast.error('Erreur lors de la fin'),
  })

  const joinMutation = useMutation({
    mutationFn: (mode: string) => virtualClassApi.joinSession(id!, mode),
    onSuccess: (res) => {
      const joinUrl = (res.data as { join_url?: string }).join_url
      if (joinUrl) window.open(joinUrl, '_blank')
      queryClient.invalidateQueries({ queryKey: ['virtual-session', id] })
      toast.success('Vous avez rejoint la session')
      setJoinOpen(false)
    },
    onError: () => toast.error('Impossible de rejoindre la session'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => virtualClassApi.cancelSession(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['virtual-session', id] }); toast.success('Session annulée') },
  })

  if (isLoading) return <Spinner text="Chargement de la session..." />
  if (!session) return (
    <div className="space-y-4">
      <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>Retour</Button>
      <Alert type="error">Session introuvable.</Alert>
    </div>
  )

  const provider = providerInfo[session.provider] ?? providerInfo.autre
  const canManage = isEnseignant || isAdmin
  const isActive = session.status === 'en_cours'
  const isPlanned = session.status === 'planifiee'
  const isDone = session.status === 'terminee'

  const durationMinutes = session.scheduled_end && session.scheduled_start
    ? Math.round((new Date(session.scheduled_end).getTime() - new Date(session.scheduled_start).getTime()) / 60000)
    : null

  return (
    <div className="space-y-5">
      {/* Back */}
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
        Retour aux classes virtuelles
      </Button>

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-violet-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
              {provider.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge label={session.status_display} className={statusColor[session.status] ?? 'badge-gray'} dot />
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${provider.color}`}>
                  {provider.name}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white">{session.title}</h1>
              <p className="text-primary-200 text-sm mt-1">{session.course_space_title}</p>
            </div>
          </div>
          {/* Actions selon rôle et statut */}
          <div className="flex gap-2 flex-shrink-0">
            {canManage && isPlanned && (
              <Button variant="secondary" size="sm" icon={<Play className="w-4 h-4" />}
                loading={startMutation.isPending} onClick={() => startMutation.mutate()}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                Démarrer
              </Button>
            )}
            {canManage && isActive && (
              <Button variant="secondary" size="sm" icon={<Square className="w-4 h-4" />}
                loading={endMutation.isPending} onClick={() => endMutation.mutate()}
                className="bg-red-500/20 border-red-300/30 text-white hover:bg-red-500/30">
                Terminer
              </Button>
            )}
            {(isPlanned || isActive) && (
              <Button size="sm" icon={<ExternalLink className="w-4 h-4" />}
                onClick={() => setJoinOpen(true)}
                className="bg-white text-primary-700 hover:bg-primary-50">
                Rejoindre
              </Button>
            )}
            {canManage && isPlanned && (
              <Button variant="danger" size="sm" loading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
                className="bg-red-500/20 border-red-300/30 text-white hover:bg-red-500/30">
                Annuler
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Participants" value={session.participants_count ?? 0}
          icon={<Users className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Durée planifiée"
          value={durationMinutes ? `${durationMinutes} min` : '—'}
          icon={<Clock className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Mode" value={session.mode === 'hybride' ? 'Hybride' : session.mode === 'presentiel' ? 'Présentiel' : 'En ligne'}
          icon={<Monitor className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
        <StatsCard title="Enregistrement"
          value={session.recording_url ? 'Disponible' : 'Non disponible'}
          icon={<Video className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Infos session */}
        <Card title="Informations de la session" action={
          <Badge label={session.mode} className={
            session.mode === 'hybride' ? 'badge-green' :
            session.mode === 'presentiel' ? 'badge-blue' : 'badge-yellow'
          } />
        }>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Début planifié', new Date(session.scheduled_start).toLocaleString('fr-FR')],
              ['Fin planifiée', new Date(session.scheduled_end).toLocaleString('fr-FR')],
              session.actual_start ? ['Début réel', new Date(session.actual_start).toLocaleString('fr-FR')] : null,
              session.actual_end ? ['Fin réelle', new Date(session.actual_end).toLocaleString('fr-FR')] : null,
            ].filter(Boolean).map(item => {
              const [label, value] = item as [string, string]
              return (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{value}</p>
                </div>
              )
            })}
          </div>

          {session.join_url && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-semibold uppercase tracking-wide">Lien de connexion</p>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 overflow-hidden">
                <Wifi className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <span className="text-xs text-primary-600 font-mono truncate flex-1">{session.join_url}</span>
                <Button variant="secondary" size="xs" icon={<ExternalLink className="w-3 h-3" />}
                  onClick={() => window.open(session.join_url, '_blank')}>
                  Ouvrir
                </Button>
              </div>
            </div>
          )}

          {session.recording_url && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-semibold uppercase tracking-wide">Enregistrement</p>
              <Button variant="secondary" className="w-full" size="sm" icon={<Video className="w-4 h-4" />}
                onClick={() => window.open(session.recording_url, '_blank')}>
                Accéder au replay
              </Button>
            </div>
          )}
        </Card>

        {/* Status panel */}
        <Card title="État de la session">
          {isActive && (
            <Alert type="success" title="Session en cours">
              La session est actuellement active. Les participants peuvent rejoindre.
            </Alert>
          )}
          {isPlanned && (
            <Alert type="info" title="Session planifiée">
              La session débutera le {new Date(session.scheduled_start).toLocaleString('fr-FR')}.
            </Alert>
          )}
          {isDone && (
            <Alert type="info" title="Session terminée">
              Cette session s'est terminée le {session.actual_end ? new Date(session.actual_end).toLocaleString('fr-FR') : '—'}.
            </Alert>
          )}
          {session.status === 'annulee' && (
            <Alert type="error" title="Session annulée">
              Cette session a été annulée.
            </Alert>
          )}

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Video className="w-4 h-4 text-gray-400 dark:text-gray-500" /> Enregistrement
              </span>
              <Badge label={session.is_recorded ? 'Activé' : 'Non activé'}
                className={session.is_recorded ? 'badge-green' : 'badge-gray'} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-gray-400 dark:text-gray-500" /> Replay disponible
              </span>
              <Badge label={session.replay_available ? 'Oui' : 'Non'}
                className={session.replay_available ? 'badge-green' : 'badge-gray'} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" /> Capacité
              </span>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{session.participants_count ?? 0} / {session.room_capacity ?? '∞'}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Join Modal */}
      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Rejoindre la session" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Comment souhaitez-vous rejoindre cette session ?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setJoinMode('online')}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                joinMode === 'online' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <Wifi className="w-6 h-6 mx-auto mb-2 text-primary-500" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">En ligne</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Via le lien de visioconférence</p>
            </button>
            <button
              onClick={() => setJoinMode('physical')}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                joinMode === 'physical' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <Monitor className="w-6 h-6 mx-auto mb-2 text-primary-500" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">En salle</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Présence physique</p>
            </button>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setJoinOpen(false)}>Annuler</Button>
            <Button className="flex-1" loading={joinMutation.isPending}
              icon={<ExternalLink className="w-4 h-4" />}
              onClick={() => joinMutation.mutate(joinMode)}>
              Rejoindre ({joinMode === 'online' ? 'En ligne' : 'En salle'})
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Button, Badge, Spinner, Alert, Pagination } from '../ui'
import {
  Bell, BellRing, Check, AlertTriangle, Info, Award,
  CreditCard, BookOpen, Clock, ExternalLink, Trash2
} from 'lucide-react'
import api from '../../lib/axios'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface NotifItem {
  id: number
  title: string
  message: string
  type: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  channel: string
  is_read: boolean
  read_at: string | null
  action_url: string
  action_label: string
  icon: string
  color: string
  created_at: string
  extra_data: Record<string, unknown>
}

const typeIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'resultat': return <Award className="h-4 w-4" />
    case 'paiement': return <CreditCard className="h-4 w-4" />
    case 'cours': return <BookOpen className="h-4 w-4" />
    case 'alerte': return <AlertTriangle className="h-4 w-4" />
    case 'absence': return <Clock className="h-4 w-4" />
    case 'info': return <Info className="h-4 w-4" />
    default: return <Bell className="h-4 w-4" />
  }
}

const priorityClass: Record<string, string> = {
  urgent: 'badge-red', high: 'badge-orange',
  normal: 'badge-blue', low: 'badge-gray',
}

const borderClass: Record<string, string> = {
  urgent: 'border-l-red-500', high: 'border-l-orange-500',
  normal: 'border-l-blue-400', low: 'border-l-gray-300',
}

const NotificationList = () => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all')
  const [selectedType, setSelectedType] = useState('all')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications-list', filter, selectedType, page],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      if (filter === 'unread') params.set('is_read', 'false')
      if (filter === 'high') params.set('priority', 'high')
      if (selectedType !== 'all') params.set('type', selectedType)
      return api.get(`/notifications/?${params}`).then(r => r.data)
    },
  })

  const { data: unreadCount } = useQuery({
    queryKey: ['notif-unread-count'],
    queryFn: () => api.get('/notifications/unread_count/').then(r => r.data.count as number),
  })

  const markRead = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/mark_read/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-list'] }),
  })

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/mark_all_read/'),
    onSuccess: () => { toast.success('Toutes les notifications marquées comme lues'); queryClient.invalidateQueries({ queryKey: ['notifications-list'] }) },
  })

  const clearRead = useMutation({
    mutationFn: () => api.delete('/notifications/clear_read/'),
    onSuccess: () => { toast.success('Notifications lues supprimées'); queryClient.invalidateQueries({ queryKey: ['notifications-list'] }) },
  })

  const handleClick = (n: NotifItem) => {
    if (!n.is_read) markRead.mutate(n.id)
    if (n.action_url) window.location.href = n.action_url
  }

  if (isLoading) return <Spinner text="Chargement des notifications..." />

  const count = (unreadCount as number) ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BellRing className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="page-title">Notifications</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {count > 0 ? `${count} non lue(s)` : 'Toutes lues'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {count > 0 && (
            <Button variant="secondary" size="sm" icon={<Check className="w-4 h-4" />}
              loading={markAllRead.isPending} onClick={() => markAllRead.mutate()}>
              Tout marquer lu
            </Button>
          )}
          <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />}
            loading={clearRead.isPending} onClick={() => clearRead.mutate()}>
            Supprimer les lues
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card noPadding>
        <div className="p-4 flex flex-wrap gap-3 items-center">
          <div className="flex gap-1.5">
            {([
              { key: 'all', label: 'Toutes' },
              { key: 'unread', label: `Non lues (${count})` },
              { key: 'high', label: 'Priorité haute' },
            ] as { key: typeof filter; label: string }[]).map(f => (
              <button key={f.key} onClick={() => { setFilter(f.key); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <select value={selectedType} onChange={e => { setSelectedType(e.target.value); setPage(1) }}
            className="input py-1.5 text-xs w-36">
            <option value="all">Tous les types</option>
            <option value="resultat">Résultats</option>
            <option value="paiement">Paiements</option>
            <option value="cours">Cours</option>
            <option value="absence">Absences</option>
            <option value="alerte">Alertes</option>
            <option value="info">Informations</option>
          </select>
        </div>
      </Card>

      {/* Liste */}
      {!notifications?.results?.length ? (
        <Alert type="success">Aucune notification pour les filtres sélectionnés.</Alert>
      ) : (
        <>
          <div className="space-y-2">
            {notifications.results.map((n: NotifItem) => (
              <div key={n.id}
                className={`card p-4 cursor-pointer hover:shadow-md transition-all border-l-4 ${
                  borderClass[n.priority] ?? 'border-l-gray-300'
                } ${!n.is_read ? 'bg-primary-50/30' : ''}`}
                onClick={() => handleClick(n)}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    n.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                    n.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {typeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold text-gray-900 dark:text-gray-50' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                        {n.title}
                      </p>
                      <Badge label={n.priority} className={priorityClass[n.priority] ?? 'badge-gray'} />
                      {!n.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-1.5">{n.message}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                      <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}</span>
                      <span className="capitalize">{n.type}</span>
                      <span className="capitalize">{n.channel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {n.action_label && n.action_url && (
                      <Button size="xs" variant="secondary" icon={<ExternalLink className="w-3 h-3" />}
                        onClick={e => { e.stopPropagation(); window.location.href = n.action_url }}>
                        {n.action_label}
                      </Button>
                    )}
                    {!n.is_read && (
                      <Button size="xs" variant="ghost" icon={<Check className="w-3 h-3" />}
                        loading={markRead.isPending}
                        onClick={e => { e.stopPropagation(); markRead.mutate(n.id) }} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {notifications.count > 20 && (
            <Pagination page={page} total={notifications.count} pageSize={20} onChange={setPage} />
          )}
        </>
      )}
    </div>
  )
}

export default NotificationList

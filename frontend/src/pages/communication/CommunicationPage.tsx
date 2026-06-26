import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, MessageSquare, Megaphone, Check, CheckCheck, Trash2, Plus, Send, Filter } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Modal } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import api from '../../lib/axios'
import { useRole } from '../../hooks/useRole'
import toast from 'react-hot-toast'

interface Notification {
  id: string; title: string; message: string; type: string
  priority: string; is_read: boolean; created_at: string
  action_url: string; icon: string; color: string
}

interface Announcement {
  id: string; title: string; content: string; audience: string
  author_name: string; is_published: boolean; is_pinned: boolean; published_at: string
}

interface Message {
  id: string; sender_name: string; subject: string; body: string
  is_read: boolean; created_at: string
}

const priorityColor: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-gray-100 text-gray-500 border-gray-200',
}

const typeIcon: Record<string, string> = {
  resultat: '🎓', paiement: '💳', inscription: '📋', cours: '📚',
  absence: '📊', document: '📄', alerte: '⚠️', rappel: '🔔', info: 'ℹ️',
}

export default function CommunicationPage() {
  const qc = useQueryClient()
  const { isAdmin, isEnseignant, isScolarite } = useRole()
  const [tab, setTab] = useState<'notifications' | 'announcements' | 'messages'>('notifications')
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all')
  const [showCompose, setShowCompose] = useState(false)
  const [showAnnounce, setShowAnnounce] = useState(false)
  const [composeData, setComposeData] = useState({ recipient: '', subject: '', body: '' })
  const [announceData, setAnnounceData] = useState({ title: '', content: '', audience: 'tous', is_pinned: false })

  // Notifications
  const { data: notifData, isLoading: loadingNotifs } = useQuery({
    queryKey: ['notifications', notifFilter],
    queryFn: () => api.get('/notifications/', { params: notifFilter === 'unread' ? { is_read: false } : {} }).then(r => r.data),
  })

  // Annonces
  const { data: announceData2, isLoading: loadingAnnounce } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements/', { params: { is_published: true } }).then(r => r.data),
  })

  // Messages reçus
  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['messages'],
    queryFn: () => api.get('/messages/').then(r => r.data),
  })

  const markReadMut = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/`, { is_read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMut = useMutation({
    mutationFn: () => api.post('/notifications/mark_all_read/'),
    onSuccess: () => { toast.success('Toutes les notifications marquées comme lues'); qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  const deleteNotifMut = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const sendMessageMut = useMutation({
    mutationFn: (d: object) => api.post('/messages/', d),
    onSuccess: () => { toast.success('Message envoyé'); setShowCompose(false); qc.invalidateQueries({ queryKey: ['messages'] }) },
    onError: () => toast.error('Erreur lors de l\'envoi'),
  })

  const createAnnounceMut = useMutation({
    mutationFn: (d: object) => api.post('/announcements/', d),
    onSuccess: () => { toast.success('Annonce créée'); setShowAnnounce(false); qc.invalidateQueries({ queryKey: ['announcements'] }) },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const notifications: Notification[] = notifData?.results ?? []
  const unreadCount = notifications.filter(n => !n.is_read).length
  const announcements: Announcement[] = announceData2?.results ?? []
  const messages: Message[] = messagesData?.results ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Communication</h1>
          <p className="text-gray-400 text-sm mt-0.5">Notifications, annonces et messagerie</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 text-sm font-semibold transition">
            <Send className="w-4 h-4" /> Nouveau message
          </button>
          {(isAdmin || isEnseignant || isScolarite) && (
            <button onClick={() => setShowAnnounce(true)}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-semibold transition">
              <Megaphone className="w-4 h-4" /> Annonce
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[
          { key: 'notifications', label: 'Notifications', icon: Bell, count: unreadCount },
          { key: 'announcements', label: 'Annonces', icon: Megaphone, count: 0 },
          { key: 'messages', label: 'Messages', icon: MessageSquare, count: messages.filter(m => !m.is_read).length },
        ].map(({ key, label, icon: Icon, count }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[18px] text-center leading-4 py-0.5">{count}</span>}
          </button>
        ))}
      </div>

      {/* Notifications */}
      {tab === 'notifications' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {['all', 'unread'].map(f => (
                <button key={f} onClick={() => setNotifFilter(f as typeof notifFilter)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${notifFilter === f ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {f === 'all' ? 'Toutes' : 'Non lues'}
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <button onClick={() => markAllReadMut.mutate()}
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium">
                <CheckCheck className="w-4 h-4" /> Tout marquer lu
              </button>
            )}
          </div>

          {loadingNotifs ? <Spinner /> : !notifications.length ? (
            <Empty icon={<Bell className="w-8 h-8" />} message="Aucune notification"
              description={notifFilter === 'unread' ? 'Vous avez tout lu !' : 'Pas encore de notifications'} />
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <div key={n.id}
                  onClick={() => { if (!n.is_read) markReadMut.mutate(n.id); if (n.action_url) window.location.assign(n.action_url) }}
                  className={`p-4 rounded-xl border cursor-pointer transition hover:shadow-sm ${!n.is_read ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100'} ${priorityColor[n.priority] ?? ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{typeIcon[n.type] ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold ${!n.is_read ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {n.priority === 'urgent' && <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">URGENT</span>}
                          <span className="text-xs text-gray-400">{formatDate(n.created_at)}</span>
                          <button onClick={e => { e.stopPropagation(); deleteNotifMut.mutate(n.id) }}
                            className="p-1 hover:bg-red-100 rounded-lg transition text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.message}</p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Annonces */}
      {tab === 'announcements' && (
        <div className="space-y-3">
          {loadingAnnounce ? <Spinner /> : !announcements.length ? (
            <Empty icon={<Megaphone className="w-8 h-8" />} message="Aucune annonce disponible" />
          ) : (
            announcements.map(a => (
              <Card key={a.id} hover>
                <div className="flex items-start gap-3">
                  {a.is_pinned && <span className="text-lg">📌</span>}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-900">{a.title}</h3>
                      <Badge label={a.audience} className="badge-blue" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1.5 line-clamp-3">{a.content}</p>
                    <p className="text-xs text-gray-400 mt-2">Par {a.author_name} · {formatDate(a.published_at)}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      {tab === 'messages' && (
        <div className="space-y-2">
          {loadingMessages ? <Spinner /> : !messages.length ? (
            <Empty icon={<MessageSquare className="w-8 h-8" />} message="Aucun message" description="Composez un message pour commencer." />
          ) : (
            messages.map(m => (
              <div key={m.id}
                className={`p-4 rounded-xl border cursor-pointer transition hover:shadow-sm ${!m.is_read ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{m.sender_name}</p>
                    <p className="text-sm text-gray-700 font-medium mt-0.5">{m.subject || '(sans objet)'}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{m.body}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{formatDate(m.created_at)}</p>
                    {!m.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto mt-2" />}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Compose Message */}
      <Modal open={showCompose} onClose={() => setShowCompose(false)} title="Nouveau message" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Destinataire (email)</label>
            <input className="input" value={composeData.recipient}
              onChange={e => setComposeData(d => ({ ...d, recipient: e.target.value }))}
              placeholder="email@universite.edu" />
          </div>
          <div>
            <label className="label">Objet</label>
            <input className="input" value={composeData.subject}
              onChange={e => setComposeData(d => ({ ...d, subject: e.target.value }))}
              placeholder="Sujet du message" />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input h-32 resize-none" value={composeData.body}
              onChange={e => setComposeData(d => ({ ...d, body: e.target.value }))}
              placeholder="Votre message..." />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCompose(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">Annuler</button>
            <button onClick={() => sendMessageMut.mutate(composeData)}
              disabled={!composeData.recipient || !composeData.body || sendMessageMut.isPending}
              className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
              <Send className="w-4 h-4 inline mr-2" />{sendMessageMut.isPending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Annonce */}
      <Modal open={showAnnounce} onClose={() => setShowAnnounce(false)} title="Nouvelle annonce" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Titre *</label>
            <input className="input" value={announceData.title}
              onChange={e => setAnnounceData(d => ({ ...d, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Audience</label>
            <select className="input" value={announceData.audience}
              onChange={e => setAnnounceData(d => ({ ...d, audience: e.target.value }))}>
              <option value="tous">Tous</option>
              <option value="etudiants">Étudiants</option>
              <option value="enseignants">Enseignants</option>
              <option value="personnel">Personnel</option>
            </select>
          </div>
          <div>
            <label className="label">Contenu *</label>
            <textarea className="input h-28 resize-none" value={announceData.content}
              onChange={e => setAnnounceData(d => ({ ...d, content: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={announceData.is_pinned}
              onChange={e => setAnnounceData(d => ({ ...d, is_pinned: e.target.checked }))} />
            📌 Épingler cette annonce
          </label>
          <div className="flex gap-3">
            <button onClick={() => setShowAnnounce(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">Annuler</button>
            <button onClick={() => createAnnounceMut.mutate({ ...announceData, is_published: true })}
              disabled={!announceData.title || !announceData.content || createAnnounceMut.isPending}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
              {createAnnounceMut.isPending ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

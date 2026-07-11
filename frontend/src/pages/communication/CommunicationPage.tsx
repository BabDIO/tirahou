import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, MessageSquare, Megaphone, CheckCheck, Trash2, Send, Users2, MessageCircle, Pin, Lock } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Modal, Button } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import { lmsApi } from '../../api'
import api from '../../lib/axios'
import { useRole } from '../../hooks/useRole'
import toast from 'react-hot-toast'

interface Forum {
  id: string; title: string; description: string; course_space: string
  course_space_title: string; is_open: boolean; posts_count: number
  recent_posts: ForumPostT[]
}
interface ForumPostT {
  id: string; content: string; author_name: string; is_pinned: boolean; created_at: string
}

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
  low: 'bg-gray-100 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
}

const typeIcon: Record<string, string> = {
  resultat: '🎓', paiement: '💳', inscription: '📋', cours: '📚',
  absence: '📊', document: '📄', alerte: '⚠️', rappel: '🔔', info: 'ℹ️',
}

export default function CommunicationPage() {
  const qc = useQueryClient()
  const { isAdmin, isEnseignant, isScolarite, isResponsable } = useRole()
  const canModerateForums = isAdmin || isEnseignant || isResponsable
  const [tab, setTab] = useState<'notifications' | 'announcements' | 'messages' | 'forums'>('notifications')
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all')
  const [showCompose, setShowCompose] = useState(false)
  const [showAnnounce, setShowAnnounce] = useState(false)
  const [showNewForum, setShowNewForum] = useState(false)
  const [activeForum, setActiveForum] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [newForum, setNewForum] = useState({ course_space: '', title: '', description: '' })
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

  // Forums
  const { data: forumsData, isLoading: loadingForums } = useQuery({
    queryKey: ['forums'],
    queryFn: () => api.get('/forums/').then(r => r.data),
    enabled: tab === 'forums',
  })

  const { data: courseSpaces } = useQuery({
    queryKey: ['course-spaces-for-forum'],
    queryFn: () => lmsApi.getCourseSpaces({ page_size: 100 }).then(r => r.data),
    enabled: tab === 'forums' && canModerateForums,
  })

  const createForumMut = useMutation({
    mutationFn: (d: object) => api.post('/forums/', d),
    onSuccess: () => { toast.success('Forum créé'); setShowNewForum(false); setNewForum({ course_space: '', title: '', description: '' }); qc.invalidateQueries({ queryKey: ['forums'] }) },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const postReplyMut = useMutation({
    mutationFn: (d: { forum: string; content: string }) => api.post('/forum-posts/', d),
    onSuccess: () => { setReplyText(''); qc.invalidateQueries({ queryKey: ['forums'] }) },
    onError: () => toast.error("Erreur lors de l'envoi — le forum est peut-être fermé"),
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
  const forums: Forum[] = forumsData?.results ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Communication</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Notifications, annonces et messagerie</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          {tab === 'forums' && canModerateForums && (
            <button onClick={() => setShowNewForum(true)}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 text-sm font-semibold transition">
              <Users2 className="w-4 h-4" /> Nouveau forum
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {[
          { key: 'notifications', label: 'Notifications', icon: Bell, count: unreadCount },
          { key: 'announcements', label: 'Annonces', icon: Megaphone, count: 0 },
          { key: 'messages', label: 'Messages', icon: MessageSquare, count: messages.filter(m => !m.is_read).length },
          { key: 'forums', label: 'Forums', icon: Users2, count: 0 },
        ].map(({ key, label, icon: Icon, count }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${tab === key ? 'bg-white text-gray-900 dark:text-gray-50 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'}`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">{label}</span>
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${notifFilter === f ? 'bg-primary-100 text-primary-700' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100'}`}>
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
                  className={`p-4 rounded-xl border cursor-pointer transition hover:shadow-sm ${!n.is_read ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100 dark:border-gray-700'} ${priorityColor[n.priority] ?? ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{typeIcon[n.type] ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold ${!n.is_read ? 'text-gray-900 dark:text-gray-50' : 'text-gray-700 dark:text-gray-300'}`}>{n.title}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {n.priority === 'urgent' && <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">URGENT</span>}
                          <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(n.created_at)}</span>
                          <button onClick={e => { e.stopPropagation(); deleteNotifMut.mutate(n.id) }}
                            className="p-1 hover:bg-red-100 rounded-lg transition text-gray-400 dark:text-gray-500 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{n.message}</p>
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
                      <h3 className="font-bold text-gray-900 dark:text-gray-50">{a.title}</h3>
                      <Badge label={a.audience} className="badge-blue" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-3">{a.content}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Par {a.author_name} · {formatDate(a.published_at)}</p>
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
                className={`p-4 rounded-xl border cursor-pointer transition hover:shadow-sm ${!m.is_read ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100 dark:border-gray-700'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{m.sender_name}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mt-0.5">{m.subject || '(sans objet)'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{m.body}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(m.created_at)}</p>
                    {!m.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto mt-2" />}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Forums */}
      {tab === 'forums' && (
        <div className="space-y-3">
          {loadingForums ? <Spinner /> : !forums.length ? (
            <Empty icon={<Users2 className="w-8 h-8" />} message="Aucun forum disponible"
              description={canModerateForums ? "Créez un forum pour lancer une discussion sur un cours." : "Vos enseignants n'ont pas encore ouvert de forum."} />
          ) : (
            forums.map(forum => (
              <Card key={forum.id} noPadding>
                <button onClick={() => setActiveForum(activeForum === forum.id ? null : forum.id)}
                  className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-gray-50/60 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-4 h-4 text-cyan-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-gray-50">{forum.title}</h3>
                        {!forum.is_open && <Lock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{forum.course_space_title} · {forum.posts_count} message(s)</p>
                      {forum.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2">{forum.description}</p>}
                    </div>
                  </div>
                  <Badge label={forum.is_open ? 'Ouvert' : 'Fermé'} className={forum.is_open ? 'badge-green' : 'badge-gray'} dot />
                </button>

                {activeForum === forum.id && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-3 bg-gray-50/50">
                    {!forum.recent_posts?.length ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Aucun message pour l'instant — soyez le premier à participer.</p>
                    ) : (
                      forum.recent_posts.map(post => (
                        <div key={post.id} className="bg-white rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                              {post.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
                              {post.author_name}
                            </p>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(post.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{post.content}</p>
                        </div>
                      ))
                    )}
                    {forum.is_open && (
                      <div className="flex gap-2 pt-1">
                        <input className="input flex-1" placeholder="Écrire un message..."
                          value={replyText} onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && replyText.trim()) postReplyMut.mutate({ forum: forum.id, content: replyText }) }} />
                        <Button size="sm" icon={<Send className="w-3.5 h-3.5" />} loading={postReplyMut.isPending}
                          disabled={!replyText.trim()}
                          onClick={() => postReplyMut.mutate({ forum: forum.id, content: replyText })}>
                          Envoyer
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
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
            <button onClick={() => setShowCompose(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:bg-gray-800 transition">Annuler</button>
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
            <button onClick={() => setShowAnnounce(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:bg-gray-800 transition">Annuler</button>
            <button onClick={() => createAnnounceMut.mutate({ ...announceData, is_published: true })}
              disabled={!announceData.title || !announceData.content || createAnnounceMut.isPending}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
              {createAnnounceMut.isPending ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Nouveau Forum */}
      <Modal open={showNewForum} onClose={() => setShowNewForum(false)} title="Nouveau forum de discussion" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Cours *</label>
            <select className="input" value={newForum.course_space}
              onChange={e => setNewForum(f => ({ ...f, course_space: e.target.value }))}>
              <option value="">— Sélectionner un cours —</option>
              {courseSpaces?.results?.map((cs: { id: string; title: string }) => (
                <option key={cs.id} value={cs.id}>{cs.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Titre *</label>
            <input className="input" value={newForum.title}
              onChange={e => setNewForum(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Questions sur le TP 3" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input h-24 resize-none" value={newForum.description}
              onChange={e => setNewForum(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowNewForum(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:bg-gray-800 transition">Annuler</button>
            <button onClick={() => createForumMut.mutate(newForum)}
              disabled={!newForum.course_space || !newForum.title || createForumMut.isPending}
              className="flex-1 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 transition disabled:opacity-50">
              {createForumMut.isPending ? 'Création...' : 'Créer le forum'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

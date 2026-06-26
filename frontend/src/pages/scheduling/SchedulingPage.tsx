import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Calendar, Plus, Eye, MapPin, Clock, Users, CheckCircle, X } from 'lucide-react'
import { schedulingApi, academicApi, programsApi } from '../../api'
import { Button, Input, Badge, Spinner, Empty, Pagination, Modal, Card, StatsCard, Alert, Tabs } from '../../components/ui'
import { formatDate, statusColor } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import type { ScheduledSession, Room } from '../../types'

type Tab = 'sessions' | 'rooms' | 'timetables'

const modeColor: Record<string, string> = {
  presentiel: 'badge-blue',
  distanciel_sync: 'badge-yellow',
  distanciel_async: 'badge-gray',
  hybride: 'badge-green',
}

const statusSession: Record<string, string> = {
  planifie: 'badge-gray',
  confirme: 'badge-blue',
  annule: 'badge-red',
  reporte: 'badge-yellow',
  realise: 'badge-green',
}

export default function SchedulingPage() {
  const [tab, setTab] = useState<Tab>('sessions')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createRoomOpen, setCreateRoomOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<ScheduledSession | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['scheduled-sessions', page, search, modeFilter],
    queryFn: () => schedulingApi.getSessions({ page, search, mode: modeFilter || undefined }).then(r => r.data),
    enabled: tab === 'sessions',
  })

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms', page],
    queryFn: () => schedulingApi.getRooms({ page }).then(r => r.data),
    enabled: tab === 'rooms',
  })

  const { data: timetables, isLoading: timetablesLoading } = useQuery({
    queryKey: ['timetables', page],
    queryFn: () => schedulingApi.getTimetables({ page }).then(r => r.data),
    enabled: tab === 'timetables',
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      schedulingApi.cancelSession(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] })
      toast.success('Séance annulée')
      setCancelOpen(false)
    },
  })

  const publishTimetable = useMutation({
    mutationFn: (id: string) => schedulingApi.publishTimetable(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['timetables'] }); toast.success('Emploi du temps publié') },
  })

  const planifiees = sessions?.results?.filter(s => s.status === 'planifie').length ?? 0
  const confirmees = sessions?.results?.filter(s => s.status === 'confirme').length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Emploi du temps & Planning</h1>
          <p className="text-gray-400 text-sm mt-0.5">Planification des séances, salles et emplois du temps</p>
        </div>
        <div className="flex gap-2">
          {tab === 'sessions' && (
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
              Nouvelle séance
            </Button>
          )}
          {tab === 'rooms' && (
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateRoomOpen(true)}>
              Nouvelle salle
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Total séances" value={sessions?.count ?? 0}
          icon={<Calendar className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Planifiées" value={planifiees}
          icon={<Clock className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
        <StatsCard title="Confirmées" value={confirmees}
          icon={<CheckCircle className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Salles" value={rooms?.count ?? 0}
          icon={<MapPin className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'sessions', label: 'Séances planifiées', icon: <Calendar className="w-4 h-4" /> },
          { key: 'rooms', label: 'Salles', icon: <MapPin className="w-4 h-4" /> },
          { key: 'timetables', label: 'Emplois du temps', icon: <Users className="w-4 h-4" /> },
        ]}
        active={tab} onChange={k => { setTab(k as Tab); setPage(1) }} variant="underline"
      />

      {/* Sessions */}
      {tab === 'sessions' && (
        <>
          <Card noPadding>
            <div className="p-4 flex flex-col sm:flex-row gap-3">
              <Input placeholder="Rechercher par EC, enseignant, salle..."
                leftIcon={<Search className="w-4 h-4" />}
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
              <select value={modeFilter} onChange={e => { setModeFilter(e.target.value); setPage(1) }}
                className="input w-full sm:w-44">
                <option value="">Tous les modes</option>
                <option value="presentiel">Présentiel</option>
                <option value="distanciel_sync">Distanciel sync.</option>
                <option value="distanciel_async">Distanciel async.</option>
                <option value="hybride">Hybride</option>
              </select>
            </div>
          </Card>

          <Card noPadding>
            {sessionsLoading ? <Spinner text="Chargement du planning..." /> : !sessions?.results?.length ? (
              <Empty message="Aucune séance planifiée" icon={<Calendar className="w-8 h-8" />}
                description="Planifiez des séances pour les afficher ici" />
            ) : (
              <>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>EC</th>
                        <th>Enseignant</th>
                        <th>Début</th>
                        <th>Fin</th>
                        <th>Salle</th>
                        <th>Mode</th>
                        <th>Statut</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.results.map((session: ScheduledSession) => (
                        <tr key={session.id}>
                          <td>
                            <div>
                              <p className="font-mono text-xs font-bold text-primary-600">{session.ec_code}</p>
                              <p className="text-xs text-gray-500 mt-0.5 max-w-[120px] truncate">{session.ec_name}</p>
                            </div>
                          </td>
                          <td className="text-sm text-gray-700">{session.teacher_name}</td>
                          <td className="text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              {new Date(session.start_datetime).toLocaleDateString('fr-FR', {
                                day: '2-digit', month: '2-digit', year: '2-digit'
                              })}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {new Date(session.start_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="text-xs text-gray-500">
                            {new Date(session.end_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            {session.room_name ? (
                              <span className="flex items-center gap-1 text-xs text-gray-600">
                                <MapPin className="w-3 h-3" />{session.room_name}
                              </span>
                            ) : <span className="text-xs text-gray-400">—</span>}
                          </td>
                          <td><Badge label={session.mode_display} className={modeColor[session.mode] ?? 'badge-gray'} /></td>
                          <td><Badge label={session.status_display} className={statusSession[session.status] ?? 'badge-gray'} dot /></td>
                          <td className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />}
                                onClick={() => setSelectedSession(session)} />
                              {session.status === 'planifie' && (
                                <Button variant="ghost" size="sm" icon={<X className="w-3.5 h-3.5" />}
                                  onClick={() => { setCancelId(session.id); setCancelOpen(true) }} />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={page} total={sessions.count} pageSize={20} onChange={setPage} />
              </>
            )}
          </Card>
        </>
      )}

      {/* Rooms */}
      {tab === 'rooms' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roomsLoading ? <Spinner /> : rooms?.results?.length ? rooms.results.map((room: Room) => (
            <Card key={room.id} hover>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex gap-1.5">
                  <Badge label={room.type} className="badge-gray" />
                  {room.is_virtual && <Badge label="Virtuelle" className="badge-blue" />}
                </div>
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-0.5">{room.name}</h3>
              <p className="text-xs font-mono text-primary-600 mb-3">{room.code}</p>
              <div className="flex flex-wrap gap-1 text-xs text-gray-500 mb-3">
                <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                  <Users className="w-3 h-3 inline mr-1" />{room.capacity} places
                </span>
                {room.building && (
                  <span className="bg-gray-100 px-2 py-0.5 rounded-full">{room.building}</span>
                )}
              </div>
              <div className="flex gap-1">
                {room.has_projector && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">📽 Projecteur</span>}
                {room.has_computer && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">💻 PC</span>}
                {room.has_internet && <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">🌐 Wifi</span>}
              </div>
            </Card>
          )) : (
            <div className="col-span-3">
              <Empty message="Aucune salle configurée" icon={<MapPin className="w-8 h-8" />} />
            </div>
          )}
        </div>
      )}

      {/* Timetables */}
      {tab === 'timetables' && (
        <Card noPadding>
          {timetablesLoading ? <Spinner text="Chargement des emplois du temps..." /> : !timetables?.results?.length ? (
            <Empty message="Aucun emploi du temps" icon={<Calendar className="w-8 h-8" />} />
          ) : (
            <div className="divide-y divide-gray-50">
              {timetables.results.map((tt: { id: string; group: string; academic_year: string; week_number: number | null; is_published: boolean; published_at: string | null }) => (
                <div key={tt.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Groupe {tt.group}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Année: {tt.academic_year}
                        {tt.week_number != null ? ` · Semaine ${tt.week_number}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {tt.is_published ? (
                      <Badge label="Publié" className="badge-green" dot />
                    ) : (
                      <Button size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />}
                        loading={publishTimetable.isPending}
                        onClick={() => publishTimetable.mutate(tt.id)}>
                        Publier
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Session Detail Modal */}
      <Modal open={!!selectedSession} onClose={() => setSelectedSession(null)}
        title="Détail de la séance" size="md">
        {selectedSession && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['EC', `${selectedSession.ec_code} — ${selectedSession.ec_name}`],
                ['Enseignant', selectedSession.teacher_name],
                ['Début', new Date(selectedSession.start_datetime).toLocaleString('fr-FR')],
                ['Fin', new Date(selectedSession.end_datetime).toLocaleString('fr-FR')],
                ['Salle', selectedSession.room_name ?? '—'],
                ['Mode', selectedSession.mode_display],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">{label}</p>
                  <p className="font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Badge label={selectedSession.status_display}
                className={statusSession[selectedSession.status] ?? 'badge-gray'} dot />
              <Badge label={selectedSession.mode_display}
                className={modeColor[selectedSession.mode] ?? 'badge-gray'} />
            </div>
            {selectedSession.cancellation_reason && (
              <Alert type="warning">
                <strong>Motif d'annulation :</strong> {selectedSession.cancellation_reason}
              </Alert>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Annuler la séance" size="sm">
        <CancelForm
          onSubmit={(reason) => cancelMutation.mutate({ id: cancelId!, reason })}
          onCancel={() => setCancelOpen(false)}
          loading={cancelMutation.isPending}
        />
      </Modal>

      {/* Create Session Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle séance" size="lg">
        <SessionCreateForm
          onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] }) }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      {/* Create Room Modal */}
      <Modal open={createRoomOpen} onClose={() => setCreateRoomOpen(false)} title="Nouvelle salle" size="md">
        <RoomCreateForm
          onSuccess={() => { setCreateRoomOpen(false); queryClient.invalidateQueries({ queryKey: ['rooms'] }) }}
          onCancel={() => setCreateRoomOpen(false)}
        />
      </Modal>
    </div>
  )
}

function CancelForm({ onSubmit, onCancel, loading }: { onSubmit: (reason: string) => void; onCancel: () => void; loading: boolean }) {
  const [reason, setReason] = useState('')
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Motif d'annulation *</label>
        <textarea className="input min-h-[80px] resize-none" placeholder="Expliquez la raison de l'annulation..."
          value={reason} onChange={e => setReason(e.target.value)} />
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button variant="danger" className="flex-1" loading={loading}
          disabled={!reason.trim()} onClick={() => onSubmit(reason)}>
          Confirmer l'annulation
        </Button>
      </div>
    </div>
  )
}

function SessionCreateForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({
    ec: '', teacher: '', room: '', academic_year: '', mode: 'presentiel',
    start_datetime: '', end_datetime: '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: years } = useQuery({ queryKey: ['years-list'], queryFn: () => academicApi.getAcademicYears().then(r => r.data) })
  const { data: rooms } = useQuery({ queryKey: ['rooms-list'], queryFn: () => schedulingApi.getRooms({ page_size: 100 }).then(r => r.data) })

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.ec || !form.academic_year || !form.start_datetime || !form.end_datetime) {
      toast.error('Tous les champs obligatoires doivent être remplis')
      return
    }
    setLoading(true)
    try {
      await schedulingApi.createSession(form)
      toast.success('Séance créée')
      onSuccess()
    } catch { toast.error('Erreur lors de la création') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ID de l'EC *</label>
          <input className="input" value={form.ec} onChange={e => set('ec', e.target.value)} placeholder="UUID de l'EC" />
        </div>
        <div>
          <label className="label">ID Enseignant</label>
          <input className="input" value={form.teacher} onChange={e => set('teacher', e.target.value)} placeholder="UUID enseignant" />
        </div>
        <div>
          <label className="label">Année académique *</label>
          <select className="input bg-white" value={form.academic_year} onChange={e => set('academic_year', e.target.value)}>
            <option value="">— Sélectionner —</option>
            {years?.results?.map((y: { id: string; label: string }) => (
              <option key={y.id} value={y.id}>{y.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Mode</label>
          <select className="input bg-white" value={form.mode} onChange={e => set('mode', e.target.value)}>
            <option value="presentiel">Présentiel</option>
            <option value="distanciel_sync">Distanciel synchrone</option>
            <option value="distanciel_async">Distanciel asynchrone</option>
            <option value="hybride">Hybride</option>
          </select>
        </div>
        <div>
          <label className="label">Salle</label>
          <select className="input bg-white" value={form.room} onChange={e => set('room', e.target.value)}>
            <option value="">— Aucune salle —</option>
            {rooms?.results?.map((r: Room) => (
              <option key={r.id} value={r.id}>{r.code} — {r.name} ({r.capacity} pl.)</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <div>
            <label className="label">Début *</label>
            <input type="datetime-local" className="input" value={form.start_datetime}
              onChange={e => set('start_datetime', e.target.value)} />
          </div>
          <div>
            <label className="label">Fin *</label>
            <input type="datetime-local" className="input" value={form.end_datetime}
              onChange={e => set('end_datetime', e.target.value)} />
          </div>
        </div>
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={loading} icon={<Calendar className="w-4 h-4" />}>
          Créer la séance
        </Button>
      </div>
    </form>
  )
}

function RoomCreateForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: '', code: '', type: 'salle_cours', capacity: 30, building: '',
    has_projector: false, has_computer: false, has_internet: false, is_virtual: false,
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.name || !form.code) { toast.error('Nom et code requis'); return }
    setLoading(true)
    try {
      await schedulingApi.createRoom(form)
      toast.success('Salle créée')
      onSuccess()
    } catch { toast.error('Erreur lors de la création') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Nom *</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Amphithéâtre A" />
        </div>
        <div>
          <label className="label">Code *</label>
          <input className="input" value={form.code} onChange={e => set('code', e.target.value)} placeholder="AMPHI-A" />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input bg-white" value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="amphi">Amphithéâtre</option>
            <option value="salle_cours">Salle de cours</option>
            <option value="salle_td">Salle TD</option>
            <option value="labo">Laboratoire</option>
            <option value="salle_info">Salle informatique</option>
            <option value="virtuelle">Salle virtuelle</option>
          </select>
        </div>
        <div>
          <label className="label">Capacité</label>
          <input type="number" className="input" min={1} value={form.capacity}
            onChange={e => set('capacity', Number(e.target.value))} />
        </div>
        <div className="col-span-2">
          <label className="label">Bâtiment</label>
          <input className="input" value={form.building} onChange={e => set('building', e.target.value)} placeholder="Bâtiment principal" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'has_projector', label: '📽 Projecteur' },
          { key: 'has_computer', label: '💻 Ordinateurs' },
          { key: 'has_internet', label: '🌐 Internet' },
          { key: 'is_virtual', label: '🖥 Virtuelle' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
              onChange={e => set(key, e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={loading} icon={<MapPin className="w-4 h-4" />}>
          Créer la salle
        </Button>
      </div>
    </form>
  )
}

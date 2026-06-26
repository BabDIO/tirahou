import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Edit, Search } from 'lucide-react'
import { Button, Input, Badge, Spinner, Empty, Card, StatsCard, Modal, Alert } from '../../components/ui'
import { programsApi } from '../../api'
import api from '../../lib/axios'

const typeColor: Record<string, string> = {
  promotion: 'badge-blue', td: 'badge-green', tp: 'badge-yellow',
}

export default function ResponsableGroupsPage() {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editGroup, setEditGroup] = useState<{ id: string; name: string; type: string; capacity: number } | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['groups', search],
    queryFn: () => programsApi.getGroups({ search }).then(r => r.data),
  })

  const deleteGroup = useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })

  const groups = data?.results ?? []
  const promotions = groups.filter((g: { type: string }) => g.type === 'promotion').length
  const tdGroups = groups.filter((g: { type: string }) => g.type === 'td').length
  const tpGroups = groups.filter((g: { type: string }) => g.type === 'tp').length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Groupes & Promotions</h1>
          <p className="text-gray-400 text-sm mt-0.5">Gestion des groupes TD/TP et promotions</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={() => setCreateOpen(true)}>
          Nouveau groupe
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Promotions" value={promotions}
          icon={<Users className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Groupes TD" value={tdGroups}
          icon={<Users className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Groupes TP" value={tpGroups}
          icon={<Users className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
      </div>

      <Card noPadding>
        <div className="p-4">
          <Input placeholder="Rechercher par nom, programme..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {isLoading ? <Spinner text="Chargement des groupes..." /> : !groups.length ? (
          <Empty message="Aucun groupe créé" icon={<Users className="w-8 h-8" />}
            action={<Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>Créer</Button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th><th>Type</th><th>Programme</th>
                  <th>Capacité</th><th>Année</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g: {
                  id: string; name: string; type: string; program: string
                  capacity: number; academic_year: string
                }) => (
                  <tr key={g.id}>
                    <td className="font-semibold text-sm">{g.name}</td>
                    <td><Badge label={g.type} className={typeColor[g.type] ?? 'badge-gray'} /></td>
                    <td className="text-sm text-gray-600">{g.program}</td>
                    <td className="text-sm">{g.capacity} places</td>
                    <td className="text-sm text-gray-500">{g.academic_year}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" icon={<Edit className="w-3.5 h-3.5" />}
                          onClick={() => setEditGroup(g)} />
                        <Button variant="ghost" size="sm"
                          onClick={() => { if (confirm('Supprimer ce groupe ?')) deleteGroup.mutate(g.id) }}>
                          ✕
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau groupe" size="sm">
        <GroupForm onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['groups'] }) }} />
      </Modal>

      <Modal open={!!editGroup} onClose={() => setEditGroup(null)} title="Modifier le groupe" size="sm">
        {editGroup && (
          <GroupForm group={editGroup}
            onSuccess={() => { setEditGroup(null); queryClient.invalidateQueries({ queryKey: ['groups'] }) }} />
        )}
      </Modal>
    </div>
  )
}

function GroupForm({ group, onSuccess }: {
  group?: { id: string; name: string; type: string; capacity: number }
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    name: group?.name ?? '',
    type: group?.type ?? 'promotion',
    capacity: group?.capacity ?? 30,
    program: '', academic_year: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const { data: programs } = useQuery({
    queryKey: ['programs-list'],
    queryFn: () => programsApi.getPrograms({ page_size: 50 }).then(r => r.data),
  })

  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => api.get('/academic-years/').then(r => r.data),
  })

  const handleSubmit = async () => {
    if (!form.name) { setError('Nom requis'); return }
    setLoading(true); setError('')
    try {
      if (group) {
        await api.patch(`/groups/${group.id}/`, { name: form.name, type: form.type, capacity: form.capacity })
      } else {
        await programsApi.createGroup(form)
      }
      onSuccess()
    } catch { setError('Erreur lors de la sauvegarde.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">Nom du groupe *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="Ex: Groupe A, TD-1, TP-Informatique" />
      </div>
      <div>
        <label className="label">Type</label>
        <select className="input bg-white" value={form.type} onChange={e => set('type', e.target.value)}>
          <option value="promotion">Promotion</option>
          <option value="td">Groupe TD</option>
          <option value="tp">Groupe TP</option>
        </select>
      </div>
      <div>
        <label className="label">Capacité</label>
        <input type="number" className="input" value={form.capacity}
          onChange={e => set('capacity', Number(e.target.value))} />
      </div>
      {!group && (
        <>
          <div>
            <label className="label">Programme *</label>
            <select className="input bg-white" value={form.program} onChange={e => set('program', e.target.value)}>
              <option value="">— Sélectionner —</option>
              {programs?.results?.map((p: { id: string; code: string; name: string }) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Année académique *</label>
            <select className="input bg-white" value={form.academic_year} onChange={e => set('academic_year', e.target.value)}>
              <option value="">— Sélectionner —</option>
              {years?.results?.map((y: { id: string; label: string; is_current: boolean }) => (
                <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' (en cours)' : ''}</option>
              ))}
            </select>
          </div>
        </>
      )}
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Plus className="w-4 h-4" />}>
        {group ? 'Mettre à jour' : 'Créer le groupe'}
      </Button>
    </div>
  )
}

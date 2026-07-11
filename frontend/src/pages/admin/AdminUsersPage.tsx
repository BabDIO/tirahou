import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Shield, Lock, Unlock, Edit, Users, Briefcase } from 'lucide-react'
import { Button, Input, Badge, Spinner, Empty, Pagination, Card, StatsCard, Modal, Alert, Avatar, Tabs } from '../../components/ui'
import { authApi, adminStaffApi, academicApi } from '../../api'
import { formatDate } from '../../lib/utils'
import type { User, Role, AdminStaff } from '../../types'
import api from '../../lib/axios'
import { useToast } from '../../hooks/useToast'

const roleBadgeColor: Record<string, string> = {
  super_admin: 'badge-red', admin_institutionnel: 'badge-red',
  admin_scolarite: 'badge-blue', admin_financier: 'badge-green',
  responsable_pedagogique: 'badge-purple', chef_departement: 'badge-purple',
  enseignant: 'badge-yellow', etudiant: 'badge-gray', bibliothecaire: 'badge-yellow',
}

const SERVICE_LABEL: Record<string, string> = {
  scolarite: 'Scolarité', finance: 'Finance', rh: 'Ressources Humaines',
  informatique: 'Informatique', bibliotheque: 'Bibliothèque', direction: 'Direction', autre: 'Autre',
}

export default function AdminUsersPage() {
  const [tab, setTab] = useState<'users' | 'staff'>('users')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [createStaffOpen, setCreateStaffOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => authApi.getUsers({ page, search }).then(r => r.data),
    enabled: tab === 'users',
  })

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['admin-staff', page, search],
    queryFn: () => adminStaffApi.getStaff({ page, search }).then(r => r.data),
    enabled: tab === 'staff',
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => authApi.getRoles().then(r => r.data),
  })

  const lockUser = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/`, { is_locked: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  const unlockUser = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/`, { is_locked: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const active = data?.results?.filter((u: User) => u.is_active && !u.is_locked).length ?? 0
  const locked = data?.results?.filter((u: User) => u.is_locked).length ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Gestion des Utilisateurs</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
            {tab === 'users' ? `${data?.count ?? 0} utilisateur(s) enregistré(s)` : `${staffData?.count ?? 0} membre(s) du personnel`}
          </p>
        </div>
        {tab === 'users' ? (
          <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={() => setCreateOpen(true)}>
            Nouvel utilisateur
          </Button>
        ) : (
          <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={() => setCreateStaffOpen(true)}>
            Nouveau personnel
          </Button>
        )}
      </div>

      <Tabs
        tabs={[
          { key: 'users', label: 'Comptes utilisateurs', icon: <Users className="w-4 h-4" /> },
          { key: 'staff', label: 'Personnel administratif', icon: <Briefcase className="w-4 h-4" /> },
        ]}
        active={tab} onChange={k => { setTab(k as typeof tab); setPage(1) }} variant="underline"
      />

      {tab === 'users' && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total utilisateurs" value={data?.count ?? 0}
          icon={<Users className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Actifs" value={active}
          icon={<Unlock className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Verrouillés" value={locked}
          icon={<Lock className="w-5 h-5" />} color="bg-gradient-to-br from-red-500 to-rose-500" />
      </div>
      )}

      {tab === 'users' && (
      <Card noPadding>
        <div className="p-4">
          <Input placeholder="Rechercher par nom, email..." leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>

        {isLoading ? <Spinner text="Chargement des utilisateurs..." /> : !data?.results?.length ? (
          <Empty message="Aucun utilisateur" icon={<Users className="w-8 h-8" />} />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Utilisateur</th><th>Rôles</th><th>Statut</th>
                    <th>Vérifié</th><th>Créé le</th><th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results?.map((user: User, idx: number) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={user.full_name} size="md"
                            color={['bg-primary-100 text-primary-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700'][idx % 3]} />
                          <div>
                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">{user.full_name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.slice(0, 2).map(r => (
                            <Badge key={r.id} label={r.name} className={roleBadgeColor[r.name] ?? 'badge-gray'} />
                          ))}
                          {user.roles.length > 2 && <Badge label={`+${user.roles.length - 2}`} className="badge-gray" />}
                        </div>
                      </td>
                      <td>
                        {user.is_locked
                          ? <Badge label="Verrouillé" className="badge-red" dot />
                          : user.is_active
                            ? <Badge label="Actif" className="badge-green" dot />
                            : <Badge label="Inactif" className="badge-gray" dot />}
                      </td>
                      <td>
                        {user.is_verified
                          ? <Badge label="Vérifié" className="badge-green" />
                          : <Badge label="Non vérifié" className="badge-yellow" />}
                      </td>
                      <td className="text-xs text-gray-400 dark:text-gray-500">{formatDate(user.created_at)}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" icon={<Edit className="w-3.5 h-3.5" />}
                            onClick={() => setEditUser(user)} />
                          {user.is_locked ? (
                            <Button variant="secondary" size="sm" icon={<Unlock className="w-3.5 h-3.5" />}
                              loading={unlockUser.isPending}
                              onClick={() => unlockUser.mutate(user.id)}>Débloquer</Button>
                          ) : (
                            <Button variant="ghost" size="sm" icon={<Lock className="w-3.5 h-3.5" />}
                              loading={lockUser.isPending}
                              onClick={() => lockUser.mutate(user.id)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={data.count} pageSize={20} onChange={setPage} />
          </>
        )}
      </Card>
      )}

      {tab === 'staff' && (
      <Card noPadding>
        <div className="p-4">
          <Input placeholder="Rechercher par nom, matricule..." leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>

        {staffLoading ? <Spinner text="Chargement du personnel..." /> : !staffData?.results?.length ? (
          <Empty message="Aucun membre du personnel administratif" icon={<Briefcase className="w-8 h-8" />}
            description="Rattachez un compte utilisateur existant à un service pour l'ajouter ici." />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Personnel</th><th>Matricule</th><th>Service</th><th>Poste</th><th className="text-right">Département</th>
                  </tr>
                </thead>
                <tbody>
                  {staffData.results.map((s: AdminStaff) => (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={s.user.full_name} size="md" color="bg-slate-100 text-slate-700" />
                          <div>
                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">{s.user.full_name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{s.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-gray-500 dark:text-gray-400">{s.staff_id}</td>
                      <td><Badge label={SERVICE_LABEL[s.service] ?? s.service} className="badge-blue" /></td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{s.position || '—'}</td>
                      <td className="text-right text-sm text-gray-500 dark:text-gray-400">{s.department_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={staffData.count} pageSize={20} onChange={setPage} />
          </>
        )}
      </Card>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un utilisateur" size="md">
        <CreateUserForm
          roles={roles?.results ?? []}
          onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['admin-users'] }) }}
        />
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Modifier les rôles" subtitle={editUser?.email} size="sm">
        {editUser && (
          <AssignRolesForm
            user={editUser}
            allRoles={roles?.results ?? []}
            onSuccess={() => { setEditUser(null); queryClient.invalidateQueries({ queryKey: ['admin-users'] }) }}
          />
        )}
      </Modal>

      <Modal open={createStaffOpen} onClose={() => setCreateStaffOpen(false)} title="Nouveau personnel administratif" size="md">
        <CreateStaffForm
          onSuccess={() => { setCreateStaffOpen(false); queryClient.invalidateQueries({ queryKey: ['admin-staff'] }) }}
        />
      </Modal>
    </div>
  )
}

function CreateStaffForm({ onSuccess }: { onSuccess: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ user: '', service: 'scolarite', position: '', department: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: users } = useQuery({
    queryKey: ['users-for-staff'],
    queryFn: () => authApi.getUsers({ page_size: 200 }).then(r => r.data),
  })
  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => academicApi.getDepartments().then(r => r.data),
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.user || !form.service) { setError('Compte utilisateur et service requis'); return }
    setLoading(true); setError('')
    try {
      await adminStaffApi.createStaff({
        user: form.user, service: form.service, position: form.position || undefined,
        department: form.department || undefined,
      })
      toast.success('Personnel ajouté')
      onSuccess()
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } }
      const msgs = Object.values(err?.response?.data ?? {}).flat().join(' ')
      setError(msgs || "Erreur lors de la création — ce compte est peut-être déjà rattaché à un profil.")
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">Compte utilisateur *</label>
        <select className="input bg-white dark:bg-slate-900" value={form.user} onChange={e => set('user', e.target.value)}>
          <option value="">— Sélectionner un compte —</option>
          {users?.results?.map((u: User) => (
            <option key={u.id} value={u.id}>{u.full_name} — {u.email}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Service *</label>
        <select className="input bg-white dark:bg-slate-900" value={form.service} onChange={e => set('service', e.target.value)}>
          {Object.entries(SERVICE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Poste</label>
        <input className="input" value={form.position} onChange={e => set('position', e.target.value)}
          placeholder="Ex: Chargé de scolarité" />
      </div>
      <div>
        <label className="label">Département</label>
        <select className="input bg-white dark:bg-slate-900" value={form.department} onChange={e => set('department', e.target.value)}>
          <option value="">— Aucun —</option>
          {departments?.results?.map((d: { id: string; name: string }) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Briefcase className="w-4 h-4" />}>
        Ajouter le personnel
      </Button>
    </div>
  )
}

function CreateUserForm({ roles, onSuccess }: { roles: Role[]; onSuccess: () => void }) {
  const [form, setForm] = useState({ email: '', username: '', first_name: '', last_name: '', phone: '', password: '', role_ids: [] as string[] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.email || !form.password || !form.first_name || !form.last_name) {
      setError('Tous les champs obligatoires doivent être remplis'); return
    }
    setLoading(true); setError('')
    try {
      await authApi.createUser(form)
      onSuccess()
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } }
      const msgs = Object.values(err?.response?.data ?? {}).flat().join(' ')
      setError(msgs || 'Erreur lors de la création.')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Prénom *</label>
          <input className="input" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
        </div>
        <div>
          <label className="label">Nom *</label>
          <input className="input" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Email *</label>
        <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} />
      </div>
      <div>
        <label className="label">Nom d'utilisateur *</label>
        <input className="input" value={form.username} onChange={e => set('username', e.target.value)} />
      </div>
      <div>
        <label className="label">Téléphone</label>
        <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
      </div>
      <div>
        <label className="label">Mot de passe *</label>
        <input type="password" className="input" value={form.password} onChange={e => set('password', e.target.value)} />
      </div>
      <div>
        <label className="label">Rôles</label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-3">
          {roles.map(role => (
            <label key={role.id} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox"
                checked={form.role_ids.includes(role.id)}
                onChange={e => setForm(f => ({
                  ...f,
                  role_ids: e.target.checked
                    ? [...f.role_ids, role.id]
                    : f.role_ids.filter(id => id !== role.id)
                }))}
                className="w-4 h-4 text-primary-600 rounded" />
              {role.name}
            </label>
          ))}
        </div>
      </div>
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Plus className="w-4 h-4" />}>
        Créer l'utilisateur
      </Button>
    </div>
  )
}

function AssignRolesForm({ user, allRoles, onSuccess }: { user: User; allRoles: Role[]; onSuccess: () => void }) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles.map(r => r.id))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      await authApi.assignRoles(user.id, selectedRoles)
      onSuccess()
    } catch { setError('Erreur lors de l\'assignation.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div className="p-3 bg-primary-50 rounded-xl">
        <p className="font-semibold text-primary-800">{user.full_name}</p>
        <p className="text-xs text-primary-600">{user.email}</p>
      </div>
      <div>
        <label className="label">Rôles assignés</label>
        <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
          {allRoles.map(role => (
            <label key={role.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:bg-gray-800">
              <input type="checkbox"
                checked={selectedRoles.includes(role.id)}
                onChange={e => setSelectedRoles(prev =>
                  e.target.checked ? [...prev, role.id] : prev.filter(id => id !== role.id)
                )}
                className="w-4 h-4 text-primary-600 rounded" />
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{role.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{role.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Shield className="w-4 h-4" />}>
        Enregistrer les rôles
      </Button>
    </div>
  )
}

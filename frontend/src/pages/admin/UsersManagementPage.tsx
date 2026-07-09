import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query'
import { Users, Plus, Edit, Trash2, Lock } from 'lucide-react'
import { Card, Button, Badge } from '../../components/ui'
import DataTable, { Column } from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

export default function UsersManagementPage() {
  const [addModal, setAddModal] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const qc = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users/').then(r => r.data)
  })

  const saveMut = useMutation({
    mutationFn: (data: any) => formData.id ? api.put(`/users/${formData.id}/`, data) : api.post('/users/', data),
    onSuccess: () => {
      toast.success('Utilisateur enregistré')
      setAddModal(false)
      setFormData({})
      qc.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}/`),
    onSuccess: () => {
      toast.success('Utilisateur supprimé')
      qc.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const columns: Column<any>[] = [
    {
      key: 'name',
      label: 'Nom',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.first_name} {row.last_name}</p>
          <p className="text-xs text-gray-400">{row.email}</p>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Rôle',
      render: (val) => <Badge label={val} className="badge-blue" />
    },
    {
      key: 'is_active',
      label: 'Statut',
      render: (val) => <Badge label={val ? 'Actif' : 'Inactif'} className={val ? 'badge-green' : 'badge-red'} />
    },
    {
      key: 'last_login',
      label: 'Dernière connexion',
      render: (val) => val ? new Date(val).toLocaleDateString('fr-FR') : '—'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-1">
          <Button size="xs" variant="ghost" icon={<Edit className="w-3.5 h-3.5" />} onClick={() => { setFormData(row); setAddModal(true) }} />
          <Button size="xs" variant="ghost" icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />} onClick={() => deleteMut.mutate(row.id)} />
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddModal(true)}>Ajouter</Button>
      </div>

      <DataTable data={users || []} columns={columns} isLoading={isLoading} pageSize={20} />

      <Modal open={addModal} onClose={() => { setAddModal(false); setFormData({}) }} title={formData.id ? 'Modifier' : 'Ajouter'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Prénom" className="input" value={formData.first_name || ''} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
            <input placeholder="Nom" className="input" value={formData.last_name || ''} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
          </div>
          <input placeholder="Email" type="email" className="input" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <select className="input" value={formData.role || ''} onChange={e => setFormData({ ...formData, role: e.target.value })}>
            <option value="">Sélectionner un rôle</option>
            <option value="etudiant">Étudiant</option>
            <option value="enseignant">Enseignant</option>
            <option value="admin_scolarite">Admin Scolarité</option>
            <option value="admin_financier">Admin Financier</option>
            <option value="responsable_pedagogique">Responsable Pédagogique</option>
            <option value="bibliothecaire">Bibliothécaire</option>
          </select>
          {!formData.id && <input placeholder="Mot de passe" type="password" className="input" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} />}
          <div className="flex gap-2 pt-4">
            <Button variant="secondary" onClick={() => { setAddModal(false); setFormData({}) }} className="flex-1">Annuler</Button>
            <Button onClick={() => saveMut.mutate(formData)} loading={saveMut.isPending} className="flex-1">Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

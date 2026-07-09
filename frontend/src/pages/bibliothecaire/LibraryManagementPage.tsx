import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus, Edit, Trash2, Eye } from 'lucide-react'
import { Card, Button, Badge, StatsCard } from '../../components/ui'
import DataTable, { Column } from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

export default function LibraryManagementPage() {
  const [addModal, setAddModal] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const qc = useQueryClient()

  const { data: documents, isLoading } = useQuery({
    queryKey: ['library-documents'],
    queryFn: () => api.get('/library/documents/').then(r => r.data)
  })

  const { data: stats } = useQuery({
    queryKey: ['library-stats'],
    queryFn: () => api.get('/library/statistics/').then(r => r.data)
  })

  const saveMut = useMutation({
    mutationFn: (data: any) => formData.id
      ? api.put(`/library/documents/${formData.id}/`, data)
      : api.post('/library/documents/', data),
    onSuccess: () => {
      toast.success(formData.id ? 'Document modifié' : 'Document ajouté')
      setAddModal(false)
      setFormData({})
      qc.invalidateQueries({ queryKey: ['library-documents'] })
    }
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/library/documents/${id}/`),
    onSuccess: () => {
      toast.success('Document supprimé')
      qc.invalidateQueries({ queryKey: ['library-documents'] })
    }
  })

  const columns: Column<any>[] = [
    {
      key: 'title',
      label: 'Titre',
      sortable: true,
      render: (val, row) => (
        <div>
          <p className="font-medium text-gray-900">{val}</p>
          <p className="text-xs text-gray-400">{row.author}</p>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      render: (val) => <Badge label={val} className="badge-blue" />
    },
    {
      key: 'category',
      label: 'Catégorie',
      render: (val) => val || '—'
    },
    {
      key: 'download_count',
      label: 'Téléchargements',
      sortable: true
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-1">
          <Button size="xs" variant="ghost" icon={<Edit className="w-3.5 h-3.5" />}
            onClick={() => { setFormData(row); setAddModal(true) }} />
          <Button size="xs" variant="ghost" icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
            onClick={() => deleteMut.mutate(row.id)} />
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion de la bibliothèque</h1>
          <p className="text-sm text-gray-500 mt-1">Gérer les ressources documentaires</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddModal(true)}>
          Ajouter
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatsCard title="Total documents" value={stats?.total || 0} icon={<BookOpen className="w-5 h-5" />} color="bg-blue-600" />
        <StatsCard title="Téléchargements" value={stats?.downloads || 0} icon={<Eye className="w-5 h-5" />} color="bg-emerald-600" />
        <StatsCard title="Nouveaux ce mois" value={stats?.new_this_month || 0} icon={<Plus className="w-5 h-5" />} color="bg-purple-600" />
        <StatsCard title="Populaires" value={stats?.popular || 0} icon={<BookOpen className="w-5 h-5" />} color="bg-amber-600" />
      </div>

      <DataTable data={documents || []} columns={columns} isLoading={isLoading} />

      <Modal open={addModal} onClose={() => { setAddModal(false); setFormData({}) }} title={formData.id ? 'Modifier' : 'Ajouter'}>
        <div className="space-y-4">
          <input placeholder="Titre" className="input" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          <input placeholder="Auteur" className="input" value={formData.author || ''} onChange={e => setFormData({ ...formData, author: e.target.value })} />
          <select className="input" value={formData.type || ''} onChange={e => setFormData({ ...formData, type: e.target.value })}>
            <option value="">Type</option>
            <option value="livre">Livre</option>
            <option value="article">Article</option>
            <option value="these">Thèse</option>
            <option value="memoire">Mémoire</option>
          </select>
          <div className="flex gap-2 pt-4">
            <Button variant="secondary" onClick={() => { setAddModal(false); setFormData({}) }} className="flex-1">Annuler</Button>
            <Button onClick={() => saveMut.mutate(formData)} loading={saveMut.isPending} className="flex-1">Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

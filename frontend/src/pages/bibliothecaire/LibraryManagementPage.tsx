import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus, Edit, Trash2, Eye, Clock, AlertTriangle, CheckCircle, Bell, X } from 'lucide-react'
import { Card, Button, Badge, StatsCard, Tabs, Spinner } from '../../components/ui'
import DataTable, { Column } from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import { libraryApi } from '../../api'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'

interface DocumentRow {
  id: string
  title: string
  author: string
  type: string
  domain: string
  quantity: number
  available_quantity: number
  location: string
  download_count: number
}

interface BorrowingRow {
  id: string
  document_title: string
  borrower_name: string
  borrowed_at: string
  due_date: string
  status: string
  late_days: number
  penalty_amount: string
  penalty_paid: boolean
}

interface ReservationRow {
  id: string
  document_title: string
  user_name: string
  reserved_at: string
  status: string
  position: number
}

const RESERVATION_STATUS_LABEL: Record<string, string> = {
  en_attente: 'En attente', disponible: 'Disponible', recupere: 'Récupéré',
  annule: 'Annulé', expire: 'Expiré',
}

export default function LibraryManagementPage() {
  const [tab, setTab] = useState<'catalog' | 'borrowings' | 'reservations'>('catalog')
  const [addModal, setAddModal] = useState(false)
  const [formData, setFormData] = useState<Partial<DocumentRow> & { id?: string }>({})
  const qc = useQueryClient()

  const { data: documents, isLoading } = useQuery({
    queryKey: ['library-documents'],
    queryFn: () => libraryApi.getDocuments().then(r => r.data.results ?? r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['library-stats'],
    queryFn: () => libraryApi.getStats().then(r => r.data),
  })

  const { data: borrowings, isLoading: loadingBorrowings } = useQuery({
    queryKey: ['library-borrowings'],
    queryFn: () => libraryApi.getBorrowings().then(r => (r.data.results ?? r.data) as BorrowingRow[]),
    enabled: tab === 'borrowings',
  })

  const { data: reservations, isLoading: loadingReservations } = useQuery({
    queryKey: ['library-reservations'],
    queryFn: () => libraryApi.getReservations().then(r => (r.data.results ?? r.data) as ReservationRow[]),
    enabled: tab === 'reservations',
  })

  const saveMut = useMutation({
    mutationFn: (data: Partial<DocumentRow>) => formData.id
      ? libraryApi.updateDocument(formData.id, data)
      : libraryApi.uploadDocument(Object.entries(data).reduce((fd, [k, v]) => { fd.append(k, String(v ?? '')); return fd }, new FormData())),
    onSuccess: () => {
      toast.success(formData.id ? 'Document modifié' : 'Document ajouté')
      setAddModal(false)
      setFormData({})
      qc.invalidateQueries({ queryKey: ['library-documents'] })
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => libraryApi.deleteDocument(id),
    onSuccess: () => {
      toast.success('Document supprimé')
      qc.invalidateQueries({ queryKey: ['library-documents'] })
    },
  })

  const returnMut = useMutation({
    mutationFn: (id: string) => libraryApi.returnBorrowing(id),
    onSuccess: () => {
      toast.success('Retour enregistré')
      qc.invalidateQueries({ queryKey: ['library-borrowings'] })
      qc.invalidateQueries({ queryKey: ['library-documents'] })
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement du retour'),
  })

  const markPaidMut = useMutation({
    mutationFn: (id: string) => libraryApi.markPenaltyPaid(id),
    onSuccess: () => {
      toast.success('Pénalité marquée comme payée')
      qc.invalidateQueries({ queryKey: ['library-borrowings'] })
    },
  })

  const notifyMut = useMutation({
    mutationFn: (id: string) => libraryApi.notifyReservationAvailable(id),
    onSuccess: () => {
      toast.success('Utilisateur notifié')
      qc.invalidateQueries({ queryKey: ['library-reservations'] })
    },
  })

  const cancelReservationMut = useMutation({
    mutationFn: (id: string) => libraryApi.cancelReservation(id),
    onSuccess: () => {
      toast.success('Réservation annulée')
      qc.invalidateQueries({ queryKey: ['library-reservations'] })
    },
  })

  const columns: Column<DocumentRow>[] = [
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
    { key: 'type', label: 'Type', render: (val) => <Badge label={String(val)} className="badge-blue" /> },
    { key: 'location', label: 'Emplacement', render: (val) => val || '—' },
    {
      key: 'available_quantity',
      label: 'Disponibilité',
      render: (val, row) => (
        <span className={Number(val) > 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
          {val}/{row.quantity}
        </span>
      )
    },
    { key: 'download_count', label: 'Téléchargements', sortable: true },
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
          <p className="text-sm text-gray-500 mt-1">Catalogue, emprunts et réservations</p>
        </div>
        {tab === 'catalog' && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddModal(true)}>Ajouter</Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatsCard title="Total documents" value={stats?.total || 0} icon={<BookOpen className="w-5 h-5" />} color="bg-blue-600" />
        <StatsCard title="Téléchargements" value={stats?.total_downloads || 0} icon={<Eye className="w-5 h-5" />} color="bg-emerald-600" />
        <StatsCard title="Emprunts (livres)" value={stats?.livres || 0} icon={<Clock className="w-5 h-5" />} color="bg-purple-600" />
        <StatsCard title="Mémoires / Thèses" value={(stats?.memoires || 0) + (stats?.theses || 0)} icon={<BookOpen className="w-5 h-5" />} color="bg-amber-600" />
      </div>

      <Tabs
        tabs={[
          { key: 'catalog', label: 'Catalogue', icon: <BookOpen className="w-4 h-4" /> },
          { key: 'borrowings', label: 'Emprunts', icon: <Clock className="w-4 h-4" /> },
          { key: 'reservations', label: 'Réservations', icon: <Bell className="w-4 h-4" /> },
        ]}
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
        variant="underline"
      />

      {tab === 'catalog' && (
        <DataTable data={documents || []} columns={columns} isLoading={isLoading} />
      )}

      {tab === 'borrowings' && (
        loadingBorrowings ? <Spinner text="Chargement des emprunts..." /> : (
          <Card noPadding>
            <div className="divide-y divide-gray-100">
              {(!borrowings || borrowings.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-8">Aucun emprunt en cours.</p>
              )}
              {borrowings?.map((b) => {
                const isOverdue = b.status === 'en_retard' || (b.status === 'en_cours' && new Date(b.due_date) < new Date())
                return (
                  <div key={b.id} className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{b.document_title}</p>
                      <p className="text-xs text-gray-500">{b.borrower_name} • Emprunté le {formatDate(b.borrowed_at)} • Retour prévu {formatDate(b.due_date)}</p>
                      {Number(b.penalty_amount) > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Pénalité : {b.penalty_amount} FCFA ({b.late_days}j de retard)
                          {b.penalty_paid ? <span className="text-emerald-600"> — payée</span> : null}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isOverdue && <Badge label="En retard" className="badge-red" dot />}
                      {b.status === 'retourne' ? (
                        <Badge label="Retourné" className="badge-green" />
                      ) : (
                        <Button size="sm" variant="secondary" icon={<CheckCircle className="w-3.5 h-3.5" />}
                          loading={returnMut.isPending} onClick={() => returnMut.mutate(b.id)}>
                          Marquer retourné
                        </Button>
                      )}
                      {Number(b.penalty_amount) > 0 && !b.penalty_paid && (
                        <Button size="sm" variant="ghost" onClick={() => markPaidMut.mutate(b.id)}>
                          Pénalité payée
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      )}

      {tab === 'reservations' && (
        loadingReservations ? <Spinner text="Chargement des réservations..." /> : (
          <Card noPadding>
            <div className="divide-y divide-gray-100">
              {(!reservations || reservations.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-8">Aucune réservation en attente.</p>
              )}
              {reservations?.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.document_title}</p>
                    <p className="text-xs text-gray-500">{r.user_name} • Position {r.position} • Réservé le {formatDate(r.reserved_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      label={RESERVATION_STATUS_LABEL[r.status] ?? r.status}
                      className={r.status === 'disponible' ? 'badge-green' : r.status === 'en_attente' ? 'badge-amber' : 'badge-gray'}
                      dot
                    />
                    {r.status === 'en_attente' && (
                      <Button size="sm" variant="secondary" icon={<Bell className="w-3.5 h-3.5" />}
                        loading={notifyMut.isPending} onClick={() => notifyMut.mutate(r.id)}>
                        Notifier dispo.
                      </Button>
                    )}
                    {r.status !== 'annule' && (
                      <button onClick={() => cancelReservationMut.mutate(r.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Annuler">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )
      )}

      <Modal isOpen={addModal} onClose={() => { setAddModal(false); setFormData({}) }} title={formData.id ? 'Modifier' : 'Ajouter'}>
        <div className="space-y-4">
          <input placeholder="Titre" className="input" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          <input placeholder="Auteur" className="input" value={formData.author || ''} onChange={e => setFormData({ ...formData, author: e.target.value })} />
          <select className="input" value={formData.type || ''} onChange={e => setFormData({ ...formData, type: e.target.value })}>
            <option value="">Type</option>
            <option value="livre">Livre</option>
            <option value="article">Article</option>
            <option value="these">Thèse</option>
            <option value="memoire">Mémoire</option>
            <option value="guide">Guide</option>
            <option value="rapport">Rapport</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Emplacement (ex: Rayon A3)" className="input" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} />
            <input type="number" min="1" placeholder="Exemplaires" className="input" value={formData.quantity ?? ''} onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })} />
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="secondary" onClick={() => { setAddModal(false); setFormData({}) }} className="flex-1">Annuler</Button>
            <Button onClick={() => saveMut.mutate(formData)} loading={saveMut.isPending} className="flex-1">Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

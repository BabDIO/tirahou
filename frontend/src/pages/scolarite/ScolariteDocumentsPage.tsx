import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, FileText, CheckCircle, XCircle, Eye, Shield } from 'lucide-react'
import { Button, Input, Badge, Spinner, Empty, Pagination, Card, StatsCard, Modal, Alert } from '../../components/ui'
import { documentsApi } from '../../api'
import { formatDate } from '../../lib/utils'

const statusColor: Record<string, string> = {
  depose: 'badge-yellow', en_verification: 'badge-blue',
  valide: 'badge-green', rejete: 'badge-red', archive: 'badge-gray',
}

export default function ScolariteDocumentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('depose')
  const [rejectModal, setRejectModal] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['scolarite-docs', page, search, statusFilter],
    queryFn: () => documentsApi.getStudentDocuments({ page, search, status: statusFilter || undefined }).then(r => r.data),
  })

  const validate = useMutation({
    mutationFn: (id: string) => documentsApi.validateDocument(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scolarite-docs'] }),
  })

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      documentsApi.rejectDocument(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['scolarite-docs'] }); setRejectModal(null) },
  })

  const pending = data?.results?.filter((d: { status: string }) => d.status === 'depose').length ?? 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Vérification des Documents</h1>
        <p className="text-gray-400 text-sm mt-0.5">Validation des pièces justificatives des étudiants</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total documents" value={data?.count ?? 0}
          icon={<FileText className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="En attente" value={pending}
          icon={<Shield className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
        <StatsCard title="Validés" value={data?.results?.filter((d: { status: string }) => d.status === 'valide').length ?? 0}
          icon={<CheckCircle className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
      </div>

      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par titre, étudiant..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="input w-full sm:w-44">
            <option value="">Tous les statuts</option>
            <option value="depose">Déposé (à vérifier)</option>
            <option value="valide">Validé</option>
            <option value="rejete">Rejeté</option>
          </select>
        </div>

        {isLoading ? <Spinner text="Chargement des documents..." /> : !data?.results?.length ? (
          <Empty message="Aucun document" icon={<FileText className="w-8 h-8" />} />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Document</th><th>Étudiant</th><th>Taille</th>
                    <th>Déposé le</th><th>Statut</th><th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results?.map((doc: { id: string; title: string; student: string; file_size: number; created_at: string; status: string; file: string }) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-sm truncate max-w-xs">{doc.title}</span>
                        </div>
                      </td>
                      <td className="text-sm text-gray-600">{doc.student}</td>
                      <td className="text-xs text-gray-400">
                        {doc.file_size > 0 ? `${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : '—'}
                      </td>
                      <td className="text-xs text-gray-400">{formatDate(doc.created_at)}</td>
                      <td><Badge label={doc.status} className={statusColor[doc.status] ?? 'badge-gray'} dot /></td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {doc.file && (
                            <a href={doc.file} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />} />
                            </a>
                          )}
                          {doc.status === 'depose' && (
                            <>
                              <Button size="sm" variant="success" icon={<CheckCircle className="w-3.5 h-3.5" />}
                                loading={validate.isPending}
                                onClick={() => validate.mutate(doc.id)}>Valider</Button>
                              <Button size="sm" variant="danger" icon={<XCircle className="w-3.5 h-3.5" />}
                                onClick={() => setRejectModal(doc.id)}>Rejeter</Button>
                            </>
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

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Motif de rejet" size="sm">
        <div className="space-y-4">
          <Alert type="warning">Précisez le motif de rejet pour informer l'étudiant.</Alert>
          <div>
            <label className="label">Motif</label>
            <textarea className="input min-h-[80px] resize-none" value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Ex: Document illisible, pièce expirée, mauvais format..." />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setRejectModal(null)}>Annuler</Button>
            <Button variant="danger" className="flex-1" loading={reject.isPending}
              icon={<XCircle className="w-4 h-4" />}
              onClick={() => reject.mutate({ id: rejectModal!, reason: rejectReason })}>
              Confirmer le rejet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

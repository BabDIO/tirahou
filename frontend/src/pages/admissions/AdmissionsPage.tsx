import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, ClipboardList, Eye, CheckCircle, XCircle, Clock } from 'lucide-react'
import { admissionsApi } from '../../api'
import { Button, Input, Badge, Spinner, Empty, Pagination, Modal, Card, StatsCard } from '../../components/ui'
import { formatDate, statusColor } from '../../lib/utils'
import type { Application } from '../../types'

export default function AdmissionsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Application | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['applications', page, search, statusFilter],
    queryFn: () => admissionsApi.getApplications({ page, search, status: statusFilter || undefined }).then(r => r.data),
  })

  const startReview = useMutation({
    mutationFn: (id: string) => admissionsApi.startReview(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  })

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: string }) =>
      admissionsApi.decide(id, { decision }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['applications'] }); setSelected(null) },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Admissions & Candidatures</h1>
          <p className="text-gray-500 text-sm mt-1">{data?.count ?? 0} candidature(s)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Total" value={data?.count ?? 0} icon={<ClipboardList className="w-6 h-6" />} color="bg-primary-600" />
        <StatsCard title="En attente" value={data?.results?.filter(a => a.status === 'soumise').length ?? 0} icon={<Clock className="w-6 h-6" />} color="bg-amber-500" />
        <StatsCard title="Admis" value={data?.results?.filter(a => a.status === 'admis').length ?? 0} icon={<CheckCircle className="w-6 h-6" />} color="bg-emerald-500" />
        <StatsCard title="Refusés" value={data?.results?.filter(a => a.status === 'refuse').length ?? 0} icon={<XCircle className="w-6 h-6" />} color="bg-red-500" />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par numéro, candidat..." leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="input w-full sm:w-48">
            <option value="">Tous les statuts</option>
            <option value="soumise">Soumise</option>
            <option value="en_instruction">En instruction</option>
            <option value="admis">Admis</option>
            <option value="refuse">Refusé</option>
          </select>
        </div>
      </Card>

      <div className="card overflow-hidden">
        {isLoading ? <Spinner /> : !data?.results?.length ? (
          <Empty message="Aucune candidature" icon={<ClipboardList className="w-12 h-12" />} />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>N° Dossier</th><th>Candidat</th><th>Programme</th>
                    <th>Soumis le</th><th>Score</th><th>Statut</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results?.map(app => (
                    <tr key={app.id}>
                      <td className="font-mono text-sm font-semibold text-primary-600">{app.application_number}</td>
                      <td className="font-medium">{app.applicant_name}</td>
                      <td className="text-sm">{app.program_name}</td>
                      <td className="text-sm text-gray-500">{formatDate(app.submitted_at)}</td>
                      <td className="text-sm">{app.score ?? '—'}</td>
                      <td><Badge label={app.status_display} className={statusColor(app.status)} /></td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />} onClick={() => setSelected(app)}>Voir</Button>
                          {app.status === 'soumise' && (
                            <Button variant="secondary" size="sm" loading={startReview.isPending}
                              onClick={() => startReview.mutate(app.id)}>Instruire</Button>
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
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Dossier de candidature" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['N° Dossier', selected.application_number],
                ['Candidat', selected.applicant_name],
                ['Programme', selected.program_name],
                ['Soumis le', formatDate(selected.submitted_at)],
                ['Score', selected.score?.toString() ?? '—'],
                ['Rang', selected.rank?.toString() ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Statut actuel</span>
              <Badge label={selected.status_display} className={statusColor(selected.status)} />
            </div>
            {selected.status === 'en_instruction' && (
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" icon={<CheckCircle className="w-4 h-4" />}
                  loading={decide.isPending}
                  onClick={() => decide.mutate({ id: selected.id, decision: 'admis' })}>
                  Admettre
                </Button>
                <Button variant="danger" className="flex-1" icon={<XCircle className="w-4 h-4" />}
                  loading={decide.isPending}
                  onClick={() => decide.mutate({ id: selected.id, decision: 'refuse' })}>
                  Refuser
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

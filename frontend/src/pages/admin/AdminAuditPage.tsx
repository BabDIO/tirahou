import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Shield, Eye } from 'lucide-react'
import { Input, Badge, Spinner, Empty, Pagination, Card, StatsCard } from '../../components/ui'
import { authApi } from '../../api'
import { formatDate } from '../../lib/utils'

const actionColor: Record<string, string> = {
  login: 'badge-green', logout: 'badge-gray', create: 'badge-blue',
  update: 'badge-yellow', delete: 'badge-red', validate: 'badge-green',
  export: 'badge-purple', view: 'badge-gray', login_failed: 'badge-red',
}

export default function AdminAuditPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, search, actionFilter],
    queryFn: () => authApi.getAuditLogs({ page, search, action: actionFilter || undefined }).then(r => r.data),
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Journal d'Audit</h1>
        <p className="text-gray-400 text-sm mt-0.5">Traçabilité de toutes les actions sensibles du système</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total actions" value={data?.count ?? 0}
          icon={<Shield className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Connexions" value={data?.results?.filter((l: { action: string }) => l.action === 'login').length ?? 0}
          icon={<Eye className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Échecs connexion" value={data?.results?.filter((l: { action: string }) => l.action === 'login_failed').length ?? 0}
          icon={<Shield className="w-5 h-5" />} color="bg-gradient-to-br from-red-500 to-rose-500" />
      </div>

      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par utilisateur, description..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }} className="input w-full sm:w-44">
            <option value="">Toutes les actions</option>
            <option value="login">Connexion</option>
            <option value="logout">Déconnexion</option>
            <option value="create">Création</option>
            <option value="update">Modification</option>
            <option value="delete">Suppression</option>
            <option value="validate">Validation</option>
            <option value="login_failed">Échec connexion</option>
          </select>
        </div>

        {isLoading ? <Spinner text="Chargement du journal..." /> : !data?.results?.length ? (
          <Empty message="Aucune entrée dans le journal" icon={<Shield className="w-8 h-8" />} />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Utilisateur</th><th>Action</th><th>Module</th>
                    <th>Description</th><th>IP</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results?.map((log: { id: string; user_name: string; action: string; module: string; description: string; ip_address: string | null; timestamp: string }) => (
                    <tr key={log.id}>
                      <td className="font-semibold text-sm">{log.user_name}</td>
                      <td><Badge label={log.action} className={actionColor[log.action] ?? 'badge-gray'} /></td>
                      <td className="text-sm text-gray-600">{log.module}</td>
                      <td className="text-sm text-gray-500 max-w-xs truncate">{log.description || '—'}</td>
                      <td className="font-mono text-xs text-gray-400">{log.ip_address ?? '—'}</td>
                      <td className="text-xs text-gray-400">{formatDate(log.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={data.count} pageSize={20} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}

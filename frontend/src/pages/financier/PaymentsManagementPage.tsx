import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, CheckCircle, Clock, Download } from 'lucide-react'
import { Card, Button, Badge, StatsCard, Tabs } from '../../components/ui'
import DataTable, { Column } from '../../components/ui/DataTable'
import { analyticsApi } from '../../api'
import { formatCurrency } from '../../lib/utils'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

export default function PaymentsManagementPage() {
  const [status, setStatus] = useState('all')
  const qc = useQueryClient()

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', status],
    queryFn: () => api.get('/payments/', {
      params: status !== 'all' ? { status } : {}
    }).then(r => r.data.results ?? r.data)
  })

  const { data: stats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => api.get('/payments/stats/').then(r => r.data)
  })

  const validatePaymentMut = useMutation({
    mutationFn: (id: string) => api.post(`/payments/${id}/validate/`),
    onSuccess: () => {
      toast.success('Paiement validé')
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['payment-stats'] })
    }
  })

  const columns: Column<any>[] = [
    {
      key: 'student',
      label: 'Étudiant',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-50">{row.student_name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{row.student_id}</p>
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Montant',
      sortable: true,
      render: (val) => (
        <span className="font-bold text-gray-900 dark:text-gray-50">{formatCurrency(val ?? 0)}</span>
      )
    },
    {
      key: 'method_display',
      label: 'Méthode',
    },
    {
      key: 'status',
      label: 'Statut',
      render: (val, row) => {
        const config: Record<string, string> = {
          en_attente: 'badge-yellow', valide: 'badge-green', rejete: 'badge-red', rembourse: 'badge-gray',
        }
        return <Badge label={row.status_display} className={config[val] ?? 'badge-gray'} />
      }
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (val) => new Date(val).toLocaleDateString('fr-FR')
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => row.status === 'en_attente' && (
        <Button
          size="xs"
          onClick={() => validatePaymentMut.mutate(row.id)}
          loading={validatePaymentMut.isPending}
          icon={<CheckCircle className="w-3.5 h-3.5" />}
        >
          Valider
        </Button>
      )
    }
  ]

  const exportMut = useMutation({
    mutationFn: () => analyticsApi.exportPayments().then(r => {
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `paiements_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    }),
    onSuccess: () => toast.success('Export réussi')
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Gestion des paiements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Suivi et validation des transactions</p>
        </div>
        <Button
          onClick={() => exportMut.mutate()}
          loading={exportMut.isPending}
          variant="secondary"
          icon={<Download className="w-4 h-4" />}
        >
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total reçu"
          value={formatCurrency(stats?.total_amount ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="bg-emerald-600"
        />
        <StatsCard
          title="En attente"
          value={formatCurrency(stats?.pending_amount ?? 0)}
          icon={<Clock className="w-5 h-5" />}
          color="bg-amber-600"
        />
        <StatsCard
          title="Validés ce mois"
          value={stats?.validated_count || 0}
          icon={<CheckCircle className="w-5 h-5" />}
          color="bg-blue-600"
        />
        <StatsCard
          title="Taux de collecte"
          value={`${stats?.collection_rate || 0}%`}
          icon={<DollarSign className="w-5 h-5" />}
          color="bg-purple-600"
        />
      </div>

      <Card>
        <Tabs
          tabs={[
            { key: 'all', label: 'Tous' },
            { key: 'en_attente', label: 'En attente', count: stats?.pending_count || 0 },
            { key: 'valide', label: 'Validés' },
            { key: 'rejete', label: 'Rejetés' }
          ]}
          active={status}
          onChange={setStatus}
        />

        <div className="mt-6">
          <DataTable
            data={payments || []}
            columns={columns}
            isLoading={isLoading}
            searchPlaceholder="Rechercher un étudiant..."
            emptyMessage="Aucun paiement"
            pageSize={20}
          />
        </div>
      </Card>
    </div>
  )
}

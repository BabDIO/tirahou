import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, CheckCircle, Clock, XCircle, Filter, Download } from 'lucide-react'
import { Card, Button, Badge, StatsCard, Tabs } from '../../components/ui'
import DataTable, { Column } from '../../components/ui/DataTable'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

export default function PaymentsManagementPage() {
  const [status, setStatus] = useState('all')
  const qc = useQueryClient()

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', status],
    queryFn: () => api.get('/finance/payments/', {
      params: status !== 'all' ? { status } : {}
    }).then(r => r.data)
  })

  const { data: stats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => api.get('/finance/statistics/').then(r => r.data)
  })

  const validatePaymentMut = useMutation({
    mutationFn: (id: string) => api.post(`/finance/payments/${id}/validate/`),
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
        <span className="font-bold text-gray-900 dark:text-gray-50">{val?.toLocaleString()}€</span>
      )
    },
    {
      key: 'payment_method',
      label: 'Méthode',
      render: (val) => {
        const methods: Record<string, string> = {
          cash: 'Espèces',
          check: 'Chèque',
          card: 'Carte',
          transfer: 'Virement',
          mobile: 'Mobile Money'
        }
        return methods[val] || val
      }
    },
    {
      key: 'status',
      label: 'Statut',
      render: (val) => {
        const config: Record<string, any> = {
          pending: { label: 'En attente', className: 'badge-yellow' },
          validated: { label: 'Validé', className: 'badge-green' },
          rejected: { label: 'Rejeté', className: 'badge-red' }
        }
        const c = config[val] || config.pending
        return <Badge label={c.label} className={c.className} />
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
      render: (_, row) => row.status === 'pending' && (
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
    mutationFn: () => api.get('/finance/export-payments/', {
      params: status !== 'all' ? { status } : {},
      responseType: 'blob'
    }).then(r => {
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
          value={`${stats?.total_amount?.toLocaleString() || 0}€`}
          icon={<DollarSign className="w-5 h-5" />}
          color="bg-emerald-600"
        />
        <StatsCard
          title="En attente"
          value={`${stats?.pending_amount?.toLocaleString() || 0}€`}
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
            { key: 'pending', label: 'En attente', count: stats?.pending_count || 0 },
            { key: 'validated', label: 'Validés' },
            { key: 'rejected', label: 'Rejetés' }
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

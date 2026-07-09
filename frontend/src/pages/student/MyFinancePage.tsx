import { useQuery } from '@tanstack/react-query'
import { DollarSign, Clock, CheckCircle, Download } from 'lucide-react'
import { Card, StatsCard, Badge, Button, Progress } from '../../components/ui'
import api from '../../lib/axios'

export default function MyFinancePage() {
  const { data: finance } = useQuery({
    queryKey: ['student-finance'],
    queryFn: () => api.get('/student/finance/').then(r => r.data)
  })

  const { data: payments } = useQuery({
    queryKey: ['student-payments'],
    queryFn: () => api.get('/student/payments/').then(r => r.data)
  })

  const totalAmount = finance?.total_amount || 0
  const paidAmount = finance?.paid_amount || 0
  const remaining = totalAmount - paidAmount
  const percentPaid = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ma situation financière</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total à payer" value={`${totalAmount}€`} icon={<DollarSign className="w-5 h-5" />} color="bg-blue-600" />
        <StatsCard title="Déjà payé" value={`${paidAmount}€`} icon={<CheckCircle className="w-5 h-5" />} color="bg-emerald-600" />
        <StatsCard title="Reste à payer" value={`${remaining}€`} icon={<Clock className="w-5 h-5" />} color="bg-amber-600" />
      </div>

      <Card title="Avancement des paiements">
        <Progress value={percentPaid} max={100} label="Progression" size="lg" color="bg-emerald-600" />
      </Card>

      <Card title="Historique des paiements">
        <div className="space-y-3">
          {payments?.map((payment: any) => (
            <div key={payment.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{payment.amount}€</p>
                <p className="text-sm text-gray-500">{payment.description}</p>
              </div>
              <div className="text-right">
                <Badge label={payment.status === 'validated' ? 'Validé' : 'En attente'} className={payment.status === 'validated' ? 'badge-green' : 'badge-yellow'} />
                <p className="text-xs text-gray-400 mt-1">{payment.date}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

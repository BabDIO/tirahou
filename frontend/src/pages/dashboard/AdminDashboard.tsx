import { useQuery } from '@tanstack/react-query'
import { Users, BookOpen, DollarSign, TrendingUp, Calendar, FileText } from 'lucide-react'
import { Card, StatsCard, Spinner } from '../../components/ui'
import LineChart from '../../components/charts/LineChart'
import BarChart from '../../components/charts/BarChart'
import api from '../../lib/axios'

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/analytics/admin/dashboard/').then(r => r.data)
  })

  const { data: chartData } = useQuery({
    queryKey: ['admin-charts'],
    queryFn: () => api.get('/analytics/admin/charts/').then(r => r.data)
  })

  if (isLoading) return <Spinner text="Chargement du tableau de bord..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord administrateur</h1>
        <p className="text-sm text-gray-500 mt-1">Vue d'ensemble de la plateforme</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Étudiants actifs"
          value={stats?.students || 0}
          icon={<Users className="w-5 h-5" />}
          color="bg-blue-600"
          trend={{ value: 12, label: 'vs mois dernier' }}
        />
        <StatsCard
          title="Cours actifs"
          value={stats?.courses || 0}
          icon={<BookOpen className="w-5 h-5" />}
          color="bg-emerald-600"
          trend={{ value: 8, label: 'vs mois dernier' }}
        />
        <StatsCard
          title="Revenus ce mois"
          value={`${stats?.revenue || 0}€`}
          icon={<DollarSign className="w-5 h-5" />}
          color="bg-purple-600"
          trend={{ value: 15, label: 'vs mois dernier' }}
        />
        <StatsCard
          title="Taux de réussite"
          value={`${stats?.success_rate || 0}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-amber-600"
          trend={{ value: 3, label: 'vs année dernière' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Inscriptions par mois" noPadding>
          <div className="p-6">
            <LineChart
              data={chartData?.enrollments || []}
              lines={[{ dataKey: 'count', name: 'Inscriptions', color: '#3b82f6' }]}
              xAxisKey="month"
              height={250}
            />
          </div>
        </Card>

        <Card title="Étudiants par programme" noPadding>
          <div className="p-6">
            <BarChart
              data={chartData?.programs || []}
              bars={[{ dataKey: 'students', name: 'Étudiants', color: '#10b981' }]}
              xAxisKey="name"
              height={250}
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Actions rapides">
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition text-left">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">Gérer les utilisateurs</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition text-left">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium">Calendrier académique</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition text-left">
              <FileText className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium">Rapports et exports</span>
            </button>
          </div>
        </Card>

        <Card title="Activité récente" className="lg:col-span-2">
          <div className="space-y-3">
            {stats?.recent_activities?.map((activity: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

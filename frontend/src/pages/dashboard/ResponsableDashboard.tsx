import { useQuery } from '@tanstack/react-query'
import { BookMarked, Users, TrendingUp, Award, Sparkles, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { programsApi, studentsApi, analyticsApi } from '../../api'
import { Card, StatsCard, Badge, Alert, Progress } from '../../components/ui'
import { statusColor } from '../../lib/utils'

export default function ResponsableDashboard() {
  const { user } = useAuthStore()

  const { data: programs } = useQuery({
    queryKey: ['resp-programs'],
    queryFn: () => programsApi.getPrograms({ page_size: 6 }).then(r => r.data),
  })

  const { data: students } = useQuery({
    queryKey: ['resp-students'],
    queryFn: () => studentsApi.getStudents({ page_size: 1 }).then(r => r.data),
  })

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.getDashboard().then(r => r.data),
  })

  const { data: atRisk } = useQuery({
    queryKey: ['at-risk'],
    queryFn: () => analyticsApi.getAtRisk().then(r => r.data),
  })

  const activeProgs = programs?.results?.filter((p: { status: string }) => p.status === 'active').length ?? 0
  const avgGrade = dashboard?.results?.average
  const riskCount = Array.isArray(atRisk) ? atRisk.length : 0

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-violet-200" />
            <span className="text-violet-200 text-sm font-medium">Espace Responsable Pédagogique</span>
          </div>
          <h1 className="text-2xl font-bold">{user?.full_name}</h1>
          <p className="text-violet-200 text-sm mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Programmes" value={programs?.count ?? 0}
          icon={<BookMarked className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
        <StatsCard title="Actifs" value={activeProgs}
          icon={<BookMarked className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Étudiants" value={students?.count ?? 0}
          icon={<Users className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Moyenne générale" value={avgGrade ? `${Number(avgGrade).toFixed(1)}/20` : '—'}
          icon={<Award className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Programmes actifs">
          {!programs?.results?.length ? (
            <Alert type="info">Aucun programme.</Alert>
          ) : (
            <div className="space-y-2">
              {programs.results.map((p: { id: string; code: string; name: string; type_display: string; mode_display: string; status: string; capacity: number }) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                    <p className="text-xs font-mono text-violet-600">{p.code} · {p.type_display}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge label={p.status} className={statusColor(p.status)} dot />
                    <span className="text-xs text-gray-400">{p.capacity} places</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Indicateurs de performance">
          <div className="space-y-4">
            <Progress
              value={avgGrade ? Math.round((Number(avgGrade) / 20) * 100) : 0}
              label="Moyenne académique"
              color="bg-primary-500" size="md"
            />
            <Progress
              value={dashboard?.enrollments?.total && students?.count
                ? Math.round((dashboard.enrollments.total / students.count) * 100) : 0}
              label="Taux d'inscription"
              color="bg-emerald-500" size="md"
            />
            <Progress
              value={dashboard?.courses?.total_spaces ? Math.min(100, dashboard.courses.total_spaces * 5) : 0}
              label="Espaces de cours actifs"
              color="bg-violet-500" size="md"
            />
            {riskCount > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100 mt-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  <span className="font-bold">{riskCount}</span> étudiant(s) à risque de décrochage détecté(s)
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

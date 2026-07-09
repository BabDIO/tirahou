/**
 * MyGradesPage - Page des notes pour étudiant
 * =========================================
 * 
 * Affiche toutes les notes de l'étudiant avec :
 * - Filtres par semestre et session
 * - Statistiques personnelles
 * - Graphiques d'évolution
 * - Détails par UE et EC
 * 
 * @module pages/student/MyGradesPage
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Award, TrendingUp, Target, BookOpen } from 'lucide-react'
import { Card, StatsCard, Tabs, Badge, Spinner, Empty } from '../../components/ui'
import PageHeader from '../../components/layout/PageHeader'
import LineChart from '../../components/charts/LineChart'
import BarChart from '../../components/charts/BarChart'
import api from '../../lib/axios'

interface Grade {
  id: string
  ec_code: string
  ec_name: string
  cc_grade: number | null
  exam_grade: number | null
  final_grade: number | null
  is_absent: boolean
  status: string
  appreciation: string
}

export default function MyGradesPage() {
  const [selectedSemester, setSelectedSemester] = useState('all')
  const [selectedSession, setSelectedSession] = useState('current')

  // Récupérer les notes
  const { data: grades, isLoading } = useQuery({
    queryKey: ['my-grades', selectedSemester, selectedSession],
    queryFn: () => api.get('/evaluation/student/grades/', {
      params: {
        semester: selectedSemester !== 'all' ? selectedSemester : undefined,
        exam_session: selectedSession !== 'current' ? selectedSession : undefined
      }
    }).then(r => r.data)
  })

  // Récupérer les statistiques
  const { data: stats } = useQuery({
    queryKey: ['my-grades-stats'],
    queryFn: () => api.get('/evaluation/student/statistics/').then(r => r.data)
  })

  // Calculer les statistiques locales
  const validGrades = grades?.filter((g: Grade) => g.final_grade !== null && !g.is_absent) || []
  const average = validGrades.length > 0
    ? (validGrades.reduce((sum: number, g: Grade) => sum + (g.final_grade || 0), 0) / validGrades.length).toFixed(2)
    : '—'

  const successCount = validGrades.filter((g: Grade) => (g.final_grade || 0) >= 10).length
  const successRate = validGrades.length > 0
    ? ((successCount / validGrades.length) * 100).toFixed(1)
    : '—'

  // Préparer données pour graphiques
  const chartData = validGrades.map((g: Grade) => ({
    name: g.ec_code,
    'Note CC': g.cc_grade || 0,
    'Examen': g.exam_grade || 0,
    'Finale': g.final_grade || 0
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes Notes"
        description="Consultez vos résultats et suivez votre progression"
        breadcrumbs={[
          { label: 'Accueil', href: '/dashboard' },
          { label: 'Mes Notes' }
        ]}
      />

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Moyenne générale"
            value={average}
            icon={<Award className="w-5 h-5" />}
            color="bg-primary-600"
            subtitle="/20"
          />
          <StatsCard
            title="Taux de réussite"
            value={`${successRate}%`}
            icon={<Target className="w-5 h-5" />}
            color="bg-emerald-600"
          />
          <StatsCard
            title="EC validés"
            value={`${successCount}/${validGrades.length}`}
            icon={<BookOpen className="w-5 h-5" />}
            color="bg-blue-600"
          />
          <StatsCard
            title="Crédits obtenus"
            value={stats.total_credits || 0}
            icon={<TrendingUp className="w-5 h-5" />}
            color="bg-purple-600"
            subtitle={`/${stats.total_credits_available || 0}`}
          />
        </div>
      )}

      {/* Graphiques */}
      {!isLoading && validGrades.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Évolution des notes" noPadding>
            <div className="p-6">
              <LineChart
                data={chartData}
                lines={[
                  { dataKey: 'Finale', name: 'Note finale', color: '#3b82f6' }
                ]}
                xAxisKey="name"
                height={250}
              />
            </div>
          </Card>

          <Card title="Comparaison CC vs Examen" noPadding>
            <div className="p-6">
              <BarChart
                data={chartData.slice(0, 6)}
                bars={[
                  { dataKey: 'Note CC', name: 'CC (40%)', color: '#10b981' },
                  { dataKey: 'Examen', name: 'Examen (60%)', color: '#3b82f6' }
                ]}
                xAxisKey="name"
                height={250}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Tableau des notes */}
      <Card title="Détail des notes" noPadding>
        {isLoading ? (
          <Spinner text="Chargement des notes..." />
        ) : validGrades.length === 0 ? (
          <Empty message="Aucune note disponible" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 uppercase text-xs">
                    EC
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 uppercase text-xs">
                    CC (40%)
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 uppercase text-xs">
                    Examen (60%)
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 uppercase text-xs">
                    Note finale
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 uppercase text-xs">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {validGrades.map((grade: Grade) => (
                  <tr key={grade.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{grade.ec_name}</p>
                      <p className="text-xs text-gray-400">{grade.ec_code}</p>
                    </td>
                    <td className="text-center px-4 py-3">
                      {grade.cc_grade?.toFixed(2) || '—'}
                    </td>
                    <td className="text-center px-4 py-3">
                      {grade.exam_grade?.toFixed(2) || '—'}
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className={`font-bold ${
                        (grade.final_grade || 0) >= 10 
                          ? 'text-emerald-600' 
                          : 'text-red-600'
                      }`}>
                        {grade.final_grade?.toFixed(2) || '—'}/20
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <Badge
                        label={(grade.final_grade || 0) >= 10 ? 'Validé' : 'Échoué'}
                        className={(grade.final_grade || 0) >= 10 ? 'badge-green' : 'badge-red'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

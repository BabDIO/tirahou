/**
 * Composant de statistiques avancées pour les notes
 * ================================================
 * 
 * Affiche des statistiques détaillées pour un EC :
 * - Distribution des notes (histogramme)
 * - Quartiles et écart-type
 * - Corrélation CC/Examen
 * - Détection d'anomalies
 * - Comparaison avec cohortes précédentes
 * 
 * @module components/evaluation
 */

import { useQuery } from '@tanstack/react-query'
import { Card, Spinner } from '../ui'
import { BarChart, TrendingUp, AlertTriangle, Users } from 'lucide-react'
import api from '../../lib/axios'
import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'

interface GradeStatisticsProps {
  ecId: string
  examSessionId: string
}

/**
 * Composant principal des statistiques de notes
 */
export default function GradeStatistics({ ecId, examSessionId }: GradeStatisticsProps) {
  // Récupérer les statistiques avancées
  const { data: stats, isLoading } = useQuery({
    queryKey: ['grade-analytics', ecId, examSessionId],
    queryFn: () => api.get(`/evaluation/analytics/distribution/`, {
      params: { ec: ecId, exam_session: examSessionId }
    }).then(r => r.data),
    enabled: !!(ecId && examSessionId)
  })

  if (isLoading) return <Spinner text="Chargement des statistiques..." />
  if (!stats) return null

  // Préparer les données pour le graphique de distribution
  const distributionData = stats.distribution ? [
    { range: '0-5', count: stats.distribution['[0-5['], color: '#ef4444' },
    { range: '5-10', count: stats.distribution['[5-10['], color: '#f97316' },
    { range: '10-12', count: stats.distribution['[10-12['], color: '#fbbf24' },
    { range: '12-14', count: stats.distribution['[12-14['], color: '#84cc16' },
    { range: '14-16', count: stats.distribution['[14-16['], color: '#22c55e' },
    { range: '16-20', count: stats.distribution['[16-20]'], color: '#10b981' }
  ] : []

  return (
    <div className="space-y-6">
      {/* Indicateurs clés */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card noPadding className="p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Moyenne</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats.mean != null ? Number(stats.mean).toFixed(2) : '—'}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Médiane: {stats.median != null ? Number(stats.median).toFixed(2) : '—'}</p>
        </Card>

        <Card noPadding className="p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Écart-type</p>
          <p className="text-2xl font-bold text-blue-600">{stats.std_dev != null ? Number(stats.std_dev).toFixed(2) : '—'}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Variance: {stats.variance != null ? Number(stats.variance).toFixed(2) : '—'}</p>
        </Card>

        <Card noPadding className="p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Min / Max</p>
          <p className="text-2xl font-bold text-purple-600">
            {stats.min != null ? Number(stats.min).toFixed(1) : '—'} / {stats.max != null ? Number(stats.max).toFixed(1) : '—'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Étendue: {stats.range != null ? Number(stats.range).toFixed(1) : '—'}</p>
        </Card>

        <Card noPadding className="p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quartiles</p>
          <p className="text-lg font-bold text-emerald-600">
            Q1: {stats.q1 != null ? Number(stats.q1).toFixed(1) : '—'} | Q3: {stats.q3 != null ? Number(stats.q3).toFixed(1) : '—'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">IQR: {stats.iqr != null ? Number(stats.iqr).toFixed(1) : '—'}</p>
        </Card>
      </div>

      {/* Distribution des notes */}
      <Card title="Distribution des notes" icon={<BarChart className="w-5 h-5" />}>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsBar data={distributionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" />
          </RechartsBar>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

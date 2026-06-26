import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Button, Badge, Spinner, StatsCard } from '../ui'
import { AlertTriangle, TrendingUp, Users, Award, BookOpen, Clock } from 'lucide-react'
import api from '../../lib/axios'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface StudentPrediction {
  student_id: number
  student_name: string
  student_number: string
  course: string
  risk_level: 'faible' | 'moyen' | 'eleve' | 'critique'
  prediction_score: number
  success_probability: string
  engagement_score: number
  completion_rate: number
  days_inactive: number
  recommendations: string[]
  contact_email: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const riskClass: Record<string, string> = {
  faible: 'badge-green', moyen: 'badge-yellow',
  eleve: 'badge-orange', critique: 'badge-red',
}

const AnalyticsTemplate = () => {
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null)
  const [timeRange, setTimeRange] = useState(30)

  const { data: studentsAtRisk, isLoading: loadingRisk } = useQuery({
    queryKey: ['analytics', 'students-at-risk'],
    queryFn: () => api.get('/analytics/students-at-risk/').then(r => r.data),
  })

  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ['analytics', 'performance-trends', timeRange],
    queryFn: () => api.get(`/analytics/performance-trends/?days=${timeRange}`).then(r => r.data),
  })

  const { data: cohort, isLoading: loadingCohort } = useQuery({
    queryKey: ['analytics', 'cohort-analysis'],
    queryFn: () => api.get('/analytics/cohort-analysis/').then(r => r.data),
  })

  const { data: prediction } = useQuery({
    queryKey: ['analytics', 'predict-success', selectedStudent],
    queryFn: () => api.get(`/analytics/predict-success/?student_id=${selectedStudent}`).then(r => r.data),
    enabled: !!selectedStudent,
  })

  if (loadingRisk || loadingTrends || loadingCohort) return <Spinner text="Chargement analytics..." />

  const gradesData = (trends?.grades ?? []).map((item: { day: string; avg_score: number }) => ({
    name: new Date(item.day).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
    Note: Number(item.avg_score.toFixed(2)),
  }))

  const attendanceData = (trends?.attendance ?? []).map((item: { day: string; present: number; total: number }) => ({
    name: new Date(item.day).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
    Taux: item.total > 0 ? Math.round((item.present / item.total) * 100) : 0,
  }))

  const programData = (cohort?.by_program ?? []).slice(0, 8).map((item: { program__name?: string; count: number }) => ({
    name: (item.program__name ?? 'N/A').substring(0, 20),
    Étudiants: item.count,
  }))

  const levelData = (cohort?.by_level ?? []).map((item: { level: string; count: number }) => ({
    name: item.level ?? 'N/A',
    value: item.count,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Analytics & Prédictions</h1>
          <p className="text-gray-500 text-sm">Suivi pédagogique intelligent et détection précoce du décrochage</p>
        </div>
        <select value={timeRange} onChange={e => setTimeRange(Number(e.target.value))} className="input w-36 py-1.5 text-sm">
          <option value={7}>7 jours</option>
          <option value={30}>30 jours</option>
          <option value={90}>90 jours</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Étudiants à risque" value={studentsAtRisk?.count ?? 0}
          icon={<AlertTriangle className="w-5 h-5" />} color="bg-red-500" />
        <StatsCard title="Taux de rétention" value={`${cohort?.retention_rate ?? 0}%`}
          icon={<Users className="w-5 h-5" />} color="bg-blue-500" />
        <StatsCard title="Taux de diplomation" value={`${cohort?.graduation_rate ?? 0}%`}
          icon={<Award className="w-5 h-5" />} color="bg-emerald-500" />
        <StatsCard title="Total inscrits" value={cohort?.total_enrolled ?? 0}
          icon={<BookOpen className="w-5 h-5" />} color="bg-violet-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Évolution des notes">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={gradesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="Note" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Taux de présence (%)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="Taux" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Répartition par programme">
          {programData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={programData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                <Tooltip />
                <Bar dataKey="Étudiants" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Aucune donnée</div>
          )}
        </Card>

        <Card title="Répartition par niveau">
          {levelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={levelData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {levelData.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Aucune donnée</div>
          )}
        </Card>
      </div>

      {/* Students at risk */}
      <Card title={`Étudiants nécessitant une attention (${studentsAtRisk?.count ?? 0})`}
        action={<Badge label={`${studentsAtRisk?.count ?? 0} alertes`} className="badge-red" dot />}>
        {!studentsAtRisk?.students?.length ? (
          <div className="py-8 text-center text-gray-400 text-sm">Aucun étudiant à risque détecté</div>
        ) : (
          <div className="space-y-3">
            {studentsAtRisk.students.map((student: StudentPrediction) => (
              <div key={student.student_id}
                className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedStudent(student.student_id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Badge label={student.risk_level} className={riskClass[student.risk_level] ?? 'badge-gray'} dot />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{student.student_name}</p>
                      <p className="text-xs text-gray-500">{student.student_number} · {student.course}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-900">{student.prediction_score.toFixed(1)}/100</p>
                    <p className="text-xs text-gray-500">{student.success_probability}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-gray-500">
                  <span>Engagement: <strong>{student.engagement_score.toFixed(1)}</strong></span>
                  <span>Complétion: <strong>{student.completion_rate.toFixed(1)}%</strong></span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />{student.days_inactive}j inactif
                  </span>
                </div>
                {student.recommendations.length > 0 && (
                  <ul className="mt-3 space-y-0.5">
                    {student.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />{rec}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Detailed prediction */}
      {selectedStudent && prediction && (
        <Card title={`Prédiction détaillée — ${prediction.student_name}`}
          action={<Button variant="ghost" size="xs" onClick={() => setSelectedStudent(null)}>Fermer</Button>}>
          <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 rounded-xl">
            <span className="text-sm font-medium text-blue-800">Score prédictif global</span>
            <span className="text-2xl font-bold text-blue-700">{prediction.overall_prediction_score}/100</span>
          </div>
          <div className="space-y-3">
            {(prediction.courses ?? []).map((course: { course: string; risk_level: string; prediction_score: number; success_probability: string; engagement_score: number; completion_rate: number; recommendations: string[] }, i: number) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm text-gray-900">{course.course}</h4>
                  <Badge label={course.risk_level} className={riskClass[course.risk_level] ?? 'badge-gray'} dot />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-2">
                  <span>Score: <strong>{course.prediction_score}/100</strong></span>
                  <span>Probabilité: <strong>{course.success_probability}</strong></span>
                  <span>Engagement: <strong>{course.engagement_score}</strong></span>
                  <span>Complétion: <strong>{course.completion_rate}%</strong></span>
                </div>
                {course.recommendations?.length > 0 && (
                  <ul className="space-y-0.5">
                    {course.recommendations.map((rec: string, j: number) => (
                      <li key={j} className="text-xs text-gray-600 flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />{rec}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default AnalyticsTemplate

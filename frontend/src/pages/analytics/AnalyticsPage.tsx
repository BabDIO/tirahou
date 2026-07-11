import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, LineChart, Line, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  BarChart3, AlertTriangle, TrendingUp, Users, Download,
  FileSpreadsheet, FileText, RefreshCw,
} from 'lucide-react'
import { analyticsApi } from '../../api'
import { Card, Spinner, StatsCard, Badge, Button, Tabs } from '../../components/ui'
import { formatCurrency } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import { saveAs } from 'file-saver'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const riskColor: Record<string, string> = {
  faible: 'badge-green', moyen: 'badge-yellow',
  eleve: 'badge-red', critique: 'badge-red',
}

type TabKey = 'overview' | 'academic' | 'finance' | 'lms' | 'risk' | 'trends'

export default function AnalyticsPage() {
  const [tab, setTab] = useState<TabKey>('overview')
  const toast = useToast()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.getDashboard().then(r => r.data),
  })

  const { data: report } = useQuery({
    queryKey: ['global-report'],
    queryFn: () => analyticsApi.getReport().then(r => r.data),
  })

  const { data: atRisk } = useQuery({
    queryKey: ['students-at-risk'],
    queryFn: () => analyticsApi.getStudentsAtRisk().then(r => r.data),
    enabled: tab === 'risk',
  })

  const { data: lmsStats } = useQuery({
    queryKey: ['lms-stats'],
    queryFn: () => analyticsApi.getLmsStats().then(r => r.data),
    enabled: tab === 'lms',
  })

  const { data: attendanceData } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: () => analyticsApi.getAttendanceStats().then(r => r.data),
    enabled: tab === 'overview' || tab === 'academic',
  })

  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ['performance-trends'],
    queryFn: () => analyticsApi.getPerformanceTrends(30).then(r => r.data),
    enabled: tab === 'trends',
  })

  const { data: cohort, isLoading: loadingCohort } = useQuery({
    queryKey: ['cohort-analysis'],
    queryFn: () => analyticsApi.getCohortAnalysis().then(r => r.data),
    enabled: tab === 'trends',
  })

  const handleExport = async (type: 'students' | 'grades' | 'payments') => {
    const tid = toast.loading('Export en cours...')
    try {
      let res
      const filename = { students: 'etudiants.xlsx', grades: 'notes.xlsx', payments: 'paiements.csv' }[type]
      if (type === 'students') res = await analyticsApi.exportStudents()
      else if (type === 'grades') res = await analyticsApi.exportGrades()
      else res = await analyticsApi.exportPayments()
      saveAs(new Blob([res.data]), filename)
      toast.dismiss(tid)
      toast.success('Export téléchargé')
    } catch {
      toast.dismiss(tid)
      toast.error('Erreur lors de l\'export')
    }
  }

  if (isLoading) return <Spinner />

  const statusChartData = dashboard?.students.by_status.map(s => ({
    name: s.status, value: s.count,
  })) ?? []

  const paidRate = dashboard
    ? Math.round(((dashboard.finance.total_paid ?? 0) / (dashboard.finance.total_invoiced || 1)) * 100)
    : 0

  const enrollmentRate = report?.enrollments?.total
    ? Math.min(100, Math.round((report.enrollments.validees / report.enrollments.total) * 100))
    : 0
  const successRate = report?.results?.success_rate ?? 0
  const avgCompletion = lmsStats?.avg_completion ?? 0
  const attendanceRate = Math.round(attendanceData?.global_rate ?? 75)

  const radarData = [
    { subject: 'Inscriptions', A: enrollmentRate },
    { subject: 'Paiements', A: paidRate },
    { subject: 'Cours actifs', A: Math.min(100, (dashboard?.courses.total_spaces ?? 0) * 2) },
    { subject: 'Résultats', A: Math.round((successRate / 100) * 100) },
    { subject: 'Assiduité', A: attendanceRate },
    { subject: 'Engagement LMS', A: Math.round(avgCompletion) },
  ]

  const genderData = report?.students?.by_gender?.map((g: { gender: string; count: number }) => ({
    name: g.gender === 'M' ? 'Masculin' : g.gender === 'F' ? 'Féminin' : 'Autre',
    value: g.count,
  })) ?? []

  const programData = report?.students?.by_program?.slice(0, 6).map((p: { current_program__name: string; count: number }) => ({
    name: p.current_program__name?.substring(0, 20) ?? '—',
    étudiants: p.count,
  })) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Analytics & Pilotage</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Indicateurs clés de performance institutionnelle</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={() => handleExport('students')}>Étudiants</Button>
          <Button variant="secondary" size="sm" icon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={() => handleExport('grades')}>Notes</Button>
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}
            onClick={() => handleExport('payments')}>Paiements</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Étudiants" value={dashboard?.students.total ?? 0}
          icon={<Users className="w-6 h-6" />} color="bg-primary-600"
          trend={{ value: 12, label: 'vs an dernier' }} />
        <StatsCard title="Inscriptions validées" value={report?.enrollments?.validees ?? dashboard?.enrollments.total ?? 0}
          icon={<TrendingUp className="w-6 h-6" />} color="bg-emerald-500" />
        <StatsCard title="Revenus encaissés" value={formatCurrency(dashboard?.finance.total_paid ?? 0)}
          icon={<BarChart3 className="w-6 h-6" />} color="bg-amber-500"
          trend={{ value: paidRate, label: '% collecté' }} />
        <StatsCard title="Taux de réussite"
          value={report?.results?.success_rate ? `${report.results.success_rate}%` : '—'}
          icon={<BarChart3 className="w-6 h-6" />} color="bg-violet-500" />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'overview', label: 'Vue globale', icon: <BarChart3 className="w-4 h-4" /> },
          { key: 'academic', label: 'Académique', icon: <Users className="w-4 h-4" /> },
          { key: 'finance', label: 'Finance', icon: <TrendingUp className="w-4 h-4" /> },
          { key: 'lms', label: 'LMS', icon: <FileText className="w-4 h-4" /> },
          { key: 'risk', label: 'Risques', icon: <AlertTriangle className="w-4 h-4" />, count: Array.isArray(atRisk) ? atRisk.length : 0 },
          { key: 'trends', label: 'Tendances', icon: <TrendingUp className="w-4 h-4" /> },
        ]}
        active={tab}
        onChange={k => setTab(k as TabKey)}
        variant="underline"
      />

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Radar de performance globale">
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <Radar name="Score" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Répartition par statut étudiant">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  dataKey="value" paddingAngle={3} label={false}
                  labelLine={false}>
                  {statusChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Academic */}
      {tab === 'academic' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Étudiants par programme (Top 6)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={programData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="étudiants" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Répartition par genre">
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" outerRadius={90}
                    dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {genderData.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-60 text-gray-400 dark:text-gray-500 text-sm">Aucune donnée</div>
            )}
          </Card>

          <Card title="Résultats académiques" className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Moyenne générale', value: dashboard?.results.average ? `${Number(dashboard.results.average).toFixed(2)}/20` : '—', color: 'text-primary-600' },
                { label: 'Taux de réussite', value: report?.results?.success_rate ? `${report.results.success_rate}%` : '—', color: 'text-emerald-600' },
                { label: 'Ajournés', value: report?.results?.ajournes ?? '—', color: 'text-amber-600' },
                { label: 'Redoublants', value: report?.results?.redoublants ?? '—', color: 'text-red-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Finance */}
      {tab === 'finance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Résumé financier">
            <div className="space-y-4">
              {[
                { label: 'Total facturé', value: formatCurrency(dashboard?.finance.total_invoiced ?? 0), color: 'text-gray-900 dark:text-gray-50' },
                { label: 'Encaissé', value: formatCurrency(dashboard?.finance.total_paid ?? 0), color: 'text-emerald-600' },
                { label: 'Reste à collecter', value: formatCurrency((dashboard?.finance.total_invoiced ?? 0) - (dashboard?.finance.total_paid ?? 0)), color: 'text-red-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                  <span className={`font-bold ${color}`}>{value}</span>
                </div>
              ))}
              <div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span>Taux de collecte</span>
                  <span className="font-semibold">{paidRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-emerald-500 h-3 rounded-full transition-all duration-700"
                    style={{ width: `${paidRate}%` }} />
                </div>
              </div>
            </div>
          </Card>

          <Card title="Statistiques factures">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total factures', value: report?.finance?.total_invoices ?? '—' },
                { label: 'Factures payées', value: report?.finance?.paid_invoices ?? '—' },
                { label: 'Taux paiement', value: report?.finance?.collection_rate ? `${report.finance.collection_rate}%` : '—' },
                { label: 'Impayées', value: (report?.finance?.total_invoices ?? 0) - (report?.finance?.paid_invoices ?? 0) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* LMS */}
      {tab === 'lms' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Activité LMS — Données réelles">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Espaces de cours', value: dashboard?.courses.total_spaces ?? 0 },
                { label: 'Complétion moyenne', value: lmsStats?.avg_completion ? `${Number(lmsStats.avg_completion).toFixed(1)}%` : '0%' },
                { label: 'Étudiants actifs', value: lmsStats?.total_students_active ?? 0 },
                { label: 'Devoirs soumis', value: lmsStats?.assignments_submitted ?? 0 },
                { label: 'Tentatives quiz', value: lmsStats?.quiz_attempts ?? 0 },
                { label: 'Sessions virtuelles', value: lmsStats?.virtual_sessions_done ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                  <p className="text-2xl font-bold text-primary-600">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Répartition par taux de complétion">
            {lmsStats?.by_completion && lmsStats.by_completion.length > 0 ? (
              <div className="space-y-3">
                {lmsStats.by_completion.map((item: { range: string; count: number }) => {
                  const total = lmsStats.by_completion.reduce((s: number, i: { count: number }) => s + i.count, 0)
                  const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
                  return (
                    <div key={item.range}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{item.range}</span>
                        <span className="font-semibold">{item.count} étudiants ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 flex-col gap-3">
                <RefreshCw className="w-10 h-10 opacity-30" />
                <p className="text-sm">Aucune donnée de progression disponible</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Risk */}
      {tab === 'risk' && (
        <div className="space-y-6">
          {/* Statistiques de risque */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard 
              title="Étudiants à risque" 
              value={atRisk?.count || 0}
              icon={<AlertTriangle className="w-5 h-5" />} 
              color="bg-red-500" 
            />
            <StatsCard 
              title="Risque critique" 
              value={atRisk?.students?.filter((s: any) => s.risk_level === 'critique').length || 0}
              icon={<AlertTriangle className="w-5 h-5" />} 
              color="bg-red-600" 
            />
            <StatsCard 
              title="Risque élevé" 
              value={atRisk?.students?.filter((s: any) => s.risk_level === 'eleve').length || 0}
              icon={<AlertTriangle className="w-5 h-5" />} 
              color="bg-orange-500" 
            />
            <StatsCard 
              title="Score moyen" 
              value={atRisk?.students?.length ? 
                (atRisk.students.reduce((sum: number, s: any) => sum + s.prediction_score, 0) / atRisk.students.length).toFixed(1) : 
                '0'}
              icon={<BarChart3 className="w-5 h-5" />} 
              color="bg-blue-500" 
            />
          </div>

          <Card title="Étudiants nécessitant une attention">
            {!atRisk?.students || atRisk.students.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <p className="text-sm text-emerald-700 font-medium">Aucun étudiant à risque détecté actuellement.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {atRisk.students.map((student: {
                  student_id: number; student_name: string; student_number: string
                  risk_level: string; prediction_score: number; success_probability: string
                  engagement_score: number; completion_rate: number; days_inactive: number
                  recommendations: string[]; contact_email: string; course: string
                }) => (
                  <div key={student.student_id}
                    className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                          student.risk_level === 'critique' ? 'bg-red-100 text-red-800' :
                          student.risk_level === 'eleve' ? 'bg-orange-100 text-orange-800' :
                          student.risk_level === 'moyen' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          <AlertTriangle className="h-3 w-3" />
                          {student.risk_level}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-50">{student.student_name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{student.student_number} • {student.course}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-50">
                          {student.prediction_score.toFixed(1)}/100
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {student.success_probability}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Engagement:</span>
                        <span className="ml-1 font-medium">{student.engagement_score.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Complétion:</span>
                        <span className="ml-1 font-medium">{student.completion_rate.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Inactif:</span>
                        <span className="ml-1 font-medium">{student.days_inactive}j</span>
                      </div>
                    </div>

                    {student.recommendations.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recommandations:</p>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {student.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm">
                        Contacter ({student.contact_email})
                      </Button>
                      <Button size="sm">
                        Voir détails
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tendances */}
      {tab === 'trends' && (
        loadingTrends || loadingCohort ? <Spinner text="Chargement des tendances..." /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatsCard title="Taux de rétention" value={`${cohort?.retention_rate ?? 0}%`}
                icon={<Users className="w-5 h-5" />} color="bg-blue-500" />
              <StatsCard title="Taux de diplomation" value={`${cohort?.graduation_rate ?? 0}%`}
                icon={<TrendingUp className="w-5 h-5" />} color="bg-emerald-500" />
              <StatsCard title="Total inscrits" value={cohort?.total_enrolled ?? 0}
                icon={<BarChart3 className="w-5 h-5" />} color="bg-violet-500" />
              <StatsCard title="Programmes suivis" value={cohort?.by_program?.length ?? 0}
                icon={<FileText className="w-5 h-5" />} color="bg-amber-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Évolution des notes (30 derniers jours)">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={(trends?.grades ?? []).map((item: { day: string; avg_score: number }) => ({
                    name: new Date(item.day).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
                    Note: Number(item.avg_score.toFixed(2)),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Note" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Taux de présence (%)">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={(trends?.attendance ?? []).map((item: { day: string; present: number; total: number }) => ({
                    name: new Date(item.day).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
                    Taux: item.total > 0 ? Math.round((item.present / item.total) * 100) : 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Taux" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Répartition par programme">
                {(cohort?.by_program ?? []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={(cohort?.by_program ?? []).slice(0, 8).map((item: { program__name?: string; count: number }) => ({
                      name: (item.program__name ?? 'N/A').substring(0, 20),
                      Étudiants: item.count,
                    }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="Étudiants" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">Aucune donnée</div>
                )}
              </Card>

              <Card title="Répartition par niveau">
                {(cohort?.by_level ?? []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={(cohort?.by_level ?? []).map((item: { level: string; count: number }) => ({
                        name: item.level ?? 'N/A', value: item.count,
                      }))} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                        {(cohort?.by_level ?? []).map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">Aucune donnée</div>
                )}
              </Card>
            </div>
          </div>
        )
      )}
    </div>
  )
}

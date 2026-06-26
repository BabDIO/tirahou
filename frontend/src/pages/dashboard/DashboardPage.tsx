import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  GraduationCap, Users, CreditCard, BookOpen,
  TrendingUp, AlertTriangle, ArrowUpRight, Sparkles,
} from 'lucide-react'
import { analyticsApi } from '../../api'
import { StatsCard, Card, Spinner, Badge, Progress, Alert } from '../../components/ui'
import { formatCurrency, statusColor } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { useRole } from '../../hooks/useRole'
import StudentDashboard from './StudentDashboard'
import TeacherDashboard from './TeacherDashboard'
import FinancierDashboard from './FinancierDashboard'
import ScolariteDashboard from './ScolariteDashboard'
import BibliothecaireDashboard from './BibliothecaireDashboard'
import ResponsableDashboard from './ResponsableDashboard'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

// enrollmentTrend vient du backend via data?.enrollment_trend

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { isEtudiant, isEnseignant, isFinancier, isScolarite, isBibliothecaire, isResponsable } = useRole()

  // Router vers le bon dashboard selon le rôle
  if (isEtudiant) return <StudentDashboard />
  if (isEnseignant) return <TeacherDashboard />
  if (isFinancier) return <FinancierDashboard />
  if (isScolarite) return <ScolariteDashboard />
  if (isBibliothecaire) return <BibliothecaireDashboard />
  if (isResponsable) return <ResponsableDashboard />

  // Dashboard admin/scolarité/financier/responsable
  return <AdminDashboard />
}

function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.getDashboard().then(r => r.data),
  })

  const { data: atRisk } = useQuery({
    queryKey: ['at-risk'],
    queryFn: () => analyticsApi.getAtRisk().then(r => r.data),
  })

  if (isLoading) return <Spinner text="Chargement du tableau de bord..." />

  const statusData = data?.students.by_status.map(s => ({ name: s.status, value: s.count })) ?? []
  const paidRate = data ? Math.round((data.finance.total_paid / (data.finance.total_invoiced || 1)) * 100) : 0
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="space-y-6">

      {/* ── Welcome banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-violet-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -right-4 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary-200" />
              <span className="text-primary-200 text-sm font-medium">{greeting},</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{user?.full_name ?? 'Administrateur'}</h1>
            <p className="text-primary-200 text-sm mt-1">
              Voici un aperçu de votre université — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white/90 font-medium">Système opérationnel</span>
          </div>
        </div>
      </div>

      {/* ── KPI Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Étudiants inscrits"
          value={data?.students.total ?? 0}
          icon={<GraduationCap className="w-5 h-5" />}
          color="bg-gradient-to-br from-primary-500 to-primary-600"
          trend={{ value: 12, label: 'vs année préc.' }}
          subtitle="Tous statuts confondus"
        />
        <StatsCard
          title="Inscriptions validées"
          value={data?.enrollments.total ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          trend={{ value: 8, label: 'ce mois' }}
          subtitle="Année académique en cours"
        />
        <StatsCard
          title="Revenus encaissés"
          value={formatCurrency(data?.finance.total_paid ?? 0)}
          icon={<CreditCard className="w-5 h-5" />}
          color="bg-gradient-to-br from-amber-500 to-orange-500"
          trend={{ value: paidRate, label: '% collecté' }}
          subtitle={`Sur ${formatCurrency(data?.finance.total_invoiced ?? 0)} facturés`}
        />
        <StatsCard
          title="Espaces de cours"
          value={data?.courses.total_spaces ?? 0}
          icon={<BookOpen className="w-5 h-5" />}
          color="bg-gradient-to-br from-violet-500 to-violet-600"
          subtitle="Campus virtuel actif"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Trend chart */}
        <Card
          title="Évolution des inscriptions"
          subtitle="Progression mensuelle vs objectif"
          className="lg:col-span-2"
          action={
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" /> +12%
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.enrollment_trend ?? []} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradInscrits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradObjectif" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="objectif" name="Objectif" stroke="#8b5cf6" strokeWidth={1.5}
                strokeDasharray="4 4" fill="url(#gradObjectif)" />
              <Area type="monotone" dataKey="inscrits" name="Inscrits" stroke="#3b82f6" strokeWidth={2.5}
                fill="url(#gradInscrits)" dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie chart */}
        <Card title="Statuts étudiants" subtitle="Répartition actuelle">
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="45%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3} strokeWidth={0}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, '']} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-300 text-sm">
              Aucune donnée
            </div>
          )}
        </Card>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Finance summary */}
        <Card title="Résumé financier" subtitle="Année académique en cours"
          action={
            <button
              onClick={() => navigate('/finance')}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Détails <ArrowUpRight className="w-3 h-3" />
            </button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Facturé', value: formatCurrency(data?.finance.total_invoiced ?? 0), color: 'text-gray-900' },
                { label: 'Encaissé', value: formatCurrency(data?.finance.total_paid ?? 0), color: 'text-emerald-600' },
                { label: 'Reste', value: formatCurrency((data?.finance.total_invoiced ?? 0) - (data?.finance.total_paid ?? 0)), color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <Progress value={paidRate} label="Taux de collecte" color="bg-emerald-500" size="md" />
          </div>
        </Card>

        {/* At-risk students */}
        <Card title="Étudiants à risque" subtitle="Détection précoce de décrochage"
          action={<Badge label={`${Array.isArray(atRisk) ? atRisk.length : 0} alertes`} className="badge-red" dot />}
        >
          {!atRisk || (Array.isArray(atRisk) && atRisk.length === 0) ? (
            <Alert type="success">
              Aucun étudiant à risque détecté pour le moment.
            </Alert>
          ) : (
            <div className="space-y-2">
              {Array.isArray(atRisk) && atRisk.slice(0, 4).map((score: {
                id: string; student_name: string; dropout_risk: string;
                engagement_score: number; completion_rate: number
              }) => {
                const riskColor: Record<string, string> = {
                  faible: 'badge-green', moyen: 'badge-yellow', eleve: 'badge-red', critique: 'badge-red',
                }
                return (
                  <div key={score.id} className="flex items-center justify-between p-3 bg-red-50/60 rounded-xl border border-red-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{score.student_name}</p>
                        <p className="text-xs text-gray-400">Score: {score.engagement_score} · Complétion: {score.completion_rate}%</p>
                      </div>
                    </div>
                    <Badge label={score.dropout_risk} className={riskColor[score.dropout_risk] ?? 'badge-gray'} />
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Academic performance ── */}
      <Card title="Performance académique" subtitle="Indicateurs clés de la session en cours">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-4 border border-primary-100">
            <p className="text-xs text-primary-600 font-semibold uppercase tracking-wide mb-2">Moyenne générale</p>
            <p className="text-3xl font-bold text-primary-700">
              {data?.results?.average != null ? `${Number(data?.results?.average).toFixed(1)}` : '—'}
              <span className="text-base font-normal text-primary-400">/20</span>
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-2">Cours actifs</p>
            <p className="text-3xl font-bold text-emerald-700">
              {data?.courses.total_spaces ?? 0}
              <span className="text-base font-normal text-emerald-400"> espaces</span>
            </p>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
            <p className="text-xs text-violet-600 font-semibold uppercase tracking-wide mb-2">Inscriptions</p>
            <p className="text-3xl font-bold text-violet-700">
              {data?.enrollments.total ?? 0}
              <span className="text-base font-normal text-violet-400"> validées</span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

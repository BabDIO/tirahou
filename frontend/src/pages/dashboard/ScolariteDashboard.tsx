import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Users, ClipboardList, FileText, TrendingUp, Sparkles,
  AlertTriangle, Clock, GraduationCap, ShieldCheck, Send,
} from 'lucide-react'
import { StatsCard, Card, Badge, Progress, Alert, Spinner } from '../../components/ui'
import { formatNumber, cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/axios'

interface PendingDoc {
  student: string
  document: string
  submitted: string
  priority: 'haute' | 'moyenne' | 'normale'
}

interface ScolariteData {
  admissions: {
    applications: number
    admitted: number
    admission_rate: number
    pending_review: number
  }
  enrollment: {
    total: number
    validated: number
    validation_rate: number
  }
  documents: {
    pending_verification: number
    verified_this_month: number
    total: number
  }
  pending_docs: PendingDoc[]
}

const EMPTY_DATA: ScolariteData = {
  admissions: { applications: 0, admitted: 0, admission_rate: 0, pending_review: 0 },
  enrollment: { total: 0, validated: 0, validation_rate: 0 },
  documents: { pending_verification: 0, verified_this_month: 0, total: 0 },
  pending_docs: [],
}

export default function ScolariteDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['scolarite-dashboard'],
    queryFn: () => api.get('/enrollment/dashboard/').then(r => r.data),
    initialData: EMPTY_DATA,
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner text="Chargement des données scolarité..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span className="text-blue-200 text-sm font-medium">{greeting},</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>
            <p className="text-blue-200 text-sm mt-1">
              Gestion de la scolarité — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white/90 font-medium">Validation: {data.enrollment.validation_rate}%</span>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Candidatures"
          value={formatNumber(data.admissions.applications)}
          icon={<ClipboardList className="w-5 h-5" />}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          subtitle={`${data.admissions.pending_review} en attente`}
          onClick={() => navigate('/admissions')}
        />
        <StatsCard
          title="Inscriptions"
          value={formatNumber(data.enrollment.total)}
          icon={<Users className="w-5 h-5" />}
          color="bg-gradient-to-br from-teal-500 to-teal-600"
          subtitle={`${data.enrollment.validated} validées`}
          onClick={() => navigate('/enrollment')}
        />
        <StatsCard
          title="Documents"
          value={formatNumber(data.documents.total)}
          icon={<FileText className="w-5 h-5" />}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          subtitle={`${data.documents.pending_verification} à vérifier`}
          onClick={() => navigate('/scolarite/documents')}
        />
        <StatsCard
          title="Taux d'admission"
          value={`${data.admissions.admission_rate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
          subtitle={`${data.admissions.admitted} admis`}
          onClick={() => navigate('/admissions')}
        />
      </div>

      {/* ── Middle Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Admission pipeline */}
        <Card title="Pipeline d'admission" subtitle="Répartition des candidatures" className="lg:col-span-2">
          <div className="space-y-4">
            {[
              { label: 'Candidatures reçues', value: data.admissions.applications, color: 'bg-blue-500' },
              { label: 'Admises', value: data.admissions.admitted, color: 'bg-emerald-500' },
              { label: 'En instruction', value: data.admissions.pending_review, color: 'bg-amber-500' },
            ].map((row: { label: string; value: number; color: string }) => {
              const percentage = data.admissions.applications ? Math.round((row.value / data.admissions.applications) * 100) : 0
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{row.label}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-50">{row.value}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', row.color)} style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{percentage}%</span>
                  </div>
                </div>
              )
            })}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">Taux d'admission</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-50">{data.admissions.admission_rate}%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Enrollment validation */}
        <Card title="Validation des inscriptions" subtitle="Progression">
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="45" fill="none" stroke="#0891b2" strokeWidth="8"
                      strokeDasharray={`${data.enrollment.validation_rate * 2.827} 282.7`}
                      strokeLinecap="round" transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-gray-900 dark:text-gray-50">{data.enrollment.validation_rate}%</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Validées</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Inscriptions validées</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">{data.enrollment.validated}/{data.enrollment.total}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Bottom Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending documents */}
        <Card title="Documents à vérifier" subtitle="File de traitement">
          <div className="space-y-3">
            {data.pending_docs.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Aucun document en attente de vérification.</p>
            )}
            {data.pending_docs.map((doc: PendingDoc, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                  doc.priority === 'haute' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300' :
                  doc.priority === 'moyenne' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300' :
                  'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                )}>
                  {doc.priority === 'haute' ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{doc.document}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{doc.student} • Soumis {doc.submitted}</p>
                </div>
                <Badge
                  label={doc.priority === 'haute' ? 'Urgent' : doc.priority === 'moyenne' ? 'Moyenne' : 'Normale'}
                  className={doc.priority === 'haute' ? 'badge-red' : doc.priority === 'moyenne' ? 'badge-amber' : 'badge-blue'}
                  dot
                />
              </div>
            ))}
            <button
              onClick={() => navigate('/scolarite/documents')}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium py-2"
            >
              Voir toute la file →
            </button>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card title="Actions rapides" subtitle="Gestion scolarité">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/admissions')}
              className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 text-left hover:bg-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-700/30 dark:hover:bg-blue-800/30 transition-colors"
            >
              <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Admissions</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Traiter les candidatures</p>
            </button>
            <button
              onClick={() => navigate('/enrollment')}
              className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-xl p-4 text-left hover:bg-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 dark:border-teal-700/30 dark:hover:bg-teal-800/30 transition-colors"
            >
              <GraduationCap className="w-5 h-5 text-teal-600 dark:text-teal-400 mb-2" />
              <p className="text-sm font-semibold text-teal-900 dark:text-teal-200">Inscriptions</p>
              <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">Valider les dossiers</p>
            </button>
            <button
              onClick={() => navigate('/scolarite/documents')}
              className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 text-left hover:bg-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 dark:border-amber-700/30 dark:hover:bg-amber-800/30 transition-colors"
            >
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2" />
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Vérification pièces</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Contrôle documents</p>
            </button>
            <button
              onClick={() => navigate('/scolarite/generated-docs')}
              className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 text-left hover:bg-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 dark:border-emerald-700/30 dark:hover:bg-emerald-800/30 transition-colors"
            >
              <Send className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Générer documents</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">Certificats & relevés</p>
            </button>
          </div>
        </Card>
      </div>

      {/* ── Progress footer ── */}
      <Card title="Objectifs du semestre" subtitle="Suivi de traitement">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Progress
            value={data.documents.verified_this_month}
            max={data.documents.total}
            label="Documents vérifiés"
            color="bg-blue-500"
          />
          <Progress
            value={data.enrollment.validated}
            max={data.enrollment.total}
            label="Inscriptions validées"
            color="bg-teal-500"
          />
        </div>
      </Card>

      {/* ── Alertes ── */}
      {data.documents.pending_verification > 15 && (
        <Alert type="warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">File de vérification élevée</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {data.documents.pending_verification} document(s) en attente de vérification.
              </p>
            </div>
          </div>
        </Alert>
      )}
    </div>
  )
}

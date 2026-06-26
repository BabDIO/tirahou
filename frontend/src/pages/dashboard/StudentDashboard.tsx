import { useQuery } from '@tanstack/react-query'
import { BookOpen, Award, CreditCard, Calendar, Bell, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Card, Spinner, Badge, Alert, Progress } from '../../components/ui'
import { formatCurrency, formatDate, statusColor } from '../../lib/utils'
import api from '../../lib/axios'

export default function StudentDashboard() {
  const { user } = useAuthStore()

  const { data: notifications } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => api.get('/notifications/', { params: { is_read: false } }).then(r => r.data),
  })

  const { data: enrollments } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => api.get('/admin-enrollments/').then(r => r.data),
  })

  const { data: invoices } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: () => api.get('/invoices/').then(r => r.data),
  })

  const { data: results } = useQuery({
    queryKey: ['my-results'],
    queryFn: () => api.get('/semester-results/').then(r => r.data),
  })

  const { data: courses } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => api.get('/course-spaces/').then(r => r.data),
  })

  const { data: sessions } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => api.get('/sessions/').then(r => r.data),
  })

  const unread = notifications?.count ?? 0
  const enrollment = enrollments?.results?.[0]
  const invoice = invoices?.results?.[0]
  const latestResult = results?.results?.[0]
  const todaySessions = (sessions?.results ?? []).filter((s: { start_datetime: string }) =>
    new Date(s.start_datetime).toDateString() === new Date().toDateString()
  )

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-violet-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative">
          <p className="text-primary-200 text-sm font-medium mb-1">Bienvenue,</p>
          <h1 className="text-2xl font-bold">{user?.full_name}</h1>
          <p className="text-primary-200 text-sm mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {unread > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1 text-xs">
              <Bell className="w-3 h-3" />
              {unread} notification(s) non lue(s)
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <BookOpen className="w-5 h-5 text-violet-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{courses?.count ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Cours actifs</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Award className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {latestResult?.average ? `${Number(latestResult.average).toFixed(1)}` : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Dernière moyenne</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <CreditCard className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {invoice ? (invoice.remaining_amount > 0 ? formatCurrency(invoice.remaining_amount) : '✓') : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Reste à payer</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-10 h-10 bg-fuchsia-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Calendar className="w-5 h-5 text-fuchsia-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{todaySessions.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Cours aujourd'hui</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Statut inscription */}
        <Card title="Mon inscription" subtitle="Année académique en cours">
          {enrollment ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">N° inscription</span>
                <span className="font-mono text-sm font-bold text-primary-600">{enrollment.enrollment_number}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Programme</span>
                <span className="text-sm font-semibold">{enrollment.program_name}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Statut</span>
                <Badge label={enrollment.status_display} className={statusColor(enrollment.status)} dot />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Paiement</span>
                {enrollment.payment_validated
                  ? <Badge label="Validé" className="badge-green" dot />
                  : <Badge label="En attente" className="badge-red" dot />}
              </div>
            </div>
          ) : (
            <Alert type="info">Aucune inscription trouvée pour cette année.</Alert>
          )}
        </Card>

        {/* Situation financière */}
        <Card title="Ma situation financière">
          {invoice ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
                  <p className="text-sm font-bold text-gray-800">{formatCurrency(invoice.total_amount)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Payé</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(invoice.paid_amount)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Reste</p>
                  <p className="text-sm font-bold text-red-500">{formatCurrency(invoice.remaining_amount)}</p>
                </div>
              </div>
              <Progress
                value={invoice.total_amount > 0 ? Math.round((invoice.paid_amount / invoice.total_amount) * 100) : 0}
                color="bg-emerald-500" label="Taux de paiement" size="md"
              />
              {invoice.due_date && (
                <p className="text-xs text-gray-400 text-center">Échéance : {formatDate(invoice.due_date)}</p>
              )}
            </div>
          ) : (
            <Alert type="info">Aucune facture disponible.</Alert>
          )}
        </Card>

        {/* Cours du jour */}
        <Card title="Cours d'aujourd'hui" subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}>
          {todaySessions.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-400">
              <CheckCircle className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Pas de cours aujourd'hui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySessions.slice(0, 4).map((s: { id: string; ec_code: string; ec_name: string; start_datetime: string; end_datetime: string; room_name: string; mode_display: string }) => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.ec_name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.start_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {' → '}
                      {new Date(s.end_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {s.room_name ? ` · ${s.room_name}` : ''}
                    </p>
                  </div>
                  <Badge label={s.mode_display} className="badge-blue" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Derniers résultats */}
        <Card title="Mes résultats" subtitle="Derniers semestres">
          {!results?.results?.length ? (
            <Alert type="info">Aucun résultat publié pour le moment.</Alert>
          ) : (
            <div className="space-y-2">
              {results.results.slice(0, 4).map((r: { id: string; semester_label: string; average: number | null; credits_obtained: number; decision_display: string; decision: string }) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.semester_label}</p>
                    <p className="text-xs text-gray-400">{r.credits_obtained} crédits obtenus</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${(r.average ?? 0) >= 10 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {r.average ? `${Number(r.average).toFixed(2)}/20` : '—'}
                    </p>
                    <Badge label={r.decision_display} className={statusColor(r.decision)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

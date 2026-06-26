import { useQuery } from '@tanstack/react-query'
import { BookOpen, Users, Award, Calendar, Clock, FileText, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Card, Spinner, Badge, Alert, StatsCard } from '../../components/ui'
import { statusColor } from '../../lib/utils'
import api from '../../lib/axios'

export default function TeacherDashboard() {
  const { user } = useAuthStore()

  const { data: courses } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => api.get('/course-spaces/').then(r => r.data),
  })

  const { data: sessions } = useQuery({
    queryKey: ['teacher-sessions'],
    queryFn: () => api.get('/sessions/').then(r => r.data),
  })

  const { data: assignments } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: () => api.get('/assignments/').then(r => r.data),
  })

  const { data: grades } = useQuery({
    queryKey: ['teacher-grades'],
    queryFn: () => api.get('/grades/', { params: { status: 'saisie' } }).then(r => r.data),
  })

  const { data: notifications } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => api.get('/notifications/', { params: { is_read: false } }).then(r => r.data),
  })

  const todaySessions = (sessions?.results ?? []).filter((s: { start_datetime: string }) =>
    new Date(s.start_datetime).toDateString() === new Date().toDateString()
  )
  const pendingGrades = grades?.count ?? 0
  const openAssignments = (assignments?.results ?? []).filter((a: { status: string }) => a.status === 'publie').length

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative">
          <p className="text-emerald-200 text-sm font-medium mb-1">Espace Enseignant</p>
          <h1 className="text-2xl font-bold">{user?.full_name}</h1>
          <p className="text-emerald-200 text-sm mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Mes cours" value={courses?.count ?? 0}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-cyan-500 to-cyan-600" />
        <StatsCard title="Cours aujourd'hui" value={todaySessions.length}
          icon={<Calendar className="w-5 h-5" />} color="bg-gradient-to-br from-fuchsia-500 to-fuchsia-600" />
        <StatsCard title="Notes à valider" value={pendingGrades}
          icon={<Award className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500"
          subtitle="En attente de validation" />
        <StatsCard title="Devoirs ouverts" value={openAssignments}
          icon={<FileText className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cours du jour */}
        <Card title="Mes cours aujourd'hui">
          {todaySessions.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-400">
              <CheckCircle className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Pas de cours planifié aujourd'hui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((s: { id: string; ec_code: string; ec_name: string; start_datetime: string; end_datetime: string; room_name: string; mode_display: string; status: string }) => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{s.ec_name}</p>
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

        {/* Mes espaces de cours */}
        <Card title="Mes espaces de cours" subtitle={`${courses?.count ?? 0} cours actifs`}>
          {!courses?.results?.length ? (
            <Alert type="info">Aucun espace de cours assigné.</Alert>
          ) : (
            <div className="space-y-2">
              {courses.results.slice(0, 5).map((cs: { id: string; title: string; ue_code: string; mode_display: string; is_published: boolean }) => (
                <div key={cs.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-cyan-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{cs.title}</p>
                      <p className="text-xs font-mono text-primary-600">{cs.ue_code}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Badge label={cs.mode_display} className="badge-blue" />
                    {cs.is_published
                      ? <Badge label="Publié" className="badge-green" dot />
                      : <Badge label="Brouillon" className="badge-gray" dot />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Notes à valider */}
        <Card title="Notes en attente de validation" subtitle="À traiter en priorité">
          {pendingGrades === 0 ? (
            <Alert type="success">Toutes les notes sont validées.</Alert>
          ) : (
            <div className="space-y-2">
              {grades?.results?.slice(0, 5).map((g: { id: string; student_name: string; ec_code: string; final_grade: number | null; status: string }) => (
                <div key={g.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{g.student_name}</p>
                    <p className="text-xs font-mono text-primary-600">{g.ec_code}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${(g.final_grade ?? 0) >= 10 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {g.final_grade != null ? `${Number(g.final_grade).toFixed(2)}/20` : '—'}
                    </p>
                    <Badge label={g.status} className={statusColor(g.status)} />
                  </div>
                </div>
              ))}
              {pendingGrades > 5 && (
                <p className="text-xs text-gray-400 text-center">+{pendingGrades - 5} autres notes à valider</p>
              )}
            </div>
          )}
        </Card>

        {/* Devoirs récents */}
        <Card title="Mes devoirs" subtitle="Devoirs publiés en cours">
          {!assignments?.results?.length ? (
            <Alert type="info">Aucun devoir créé.</Alert>
          ) : (
            <div className="space-y-2">
              {assignments.results.slice(0, 4).map((a: { id: string; title: string; due_date: string; status: string }) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-400">Échéance : {new Date(a.due_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <Badge label={a.status} className={statusColor(a.status)} dot />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

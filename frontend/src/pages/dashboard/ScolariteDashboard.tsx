import { useQuery } from '@tanstack/react-query'
import { Users, ClipboardList, FileText, CheckCircle, Clock, AlertTriangle, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { admissionsApi, enrollmentApi, studentsApi } from '../../api'
import { Card, StatsCard, Badge, Alert } from '../../components/ui'
import { formatDate, statusColor } from '../../lib/utils'
import api from '../../lib/axios'

export default function ScolariteDashboard() {
  const { user } = useAuthStore()

  const { data: applications } = useQuery({
    queryKey: ['scolarite-apps'],
    queryFn: () => admissionsApi.getApplications({ status: 'soumise', page_size: 5 }).then(r => r.data),
  })

  const { data: enrollments } = useQuery({
    queryKey: ['scolarite-enr'],
    queryFn: () => enrollmentApi.getEnrollments({ status: 'en_attente', page_size: 5 }).then(r => r.data),
  })

  const { data: students } = useQuery({
    queryKey: ['scolarite-students'],
    queryFn: () => studentsApi.getStudents({ page_size: 1 }).then(r => r.data),
  })

  const { data: docs } = useQuery({
    queryKey: ['scolarite-docs-pending'],
    queryFn: () => api.get('/documents/student-documents/', { params: { status: 'depose', page_size: 5 } }).then(r => r.data),
  })

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span className="text-blue-200 text-sm font-medium">Espace Scolarité</span>
          </div>
          <h1 className="text-2xl font-bold">{user?.full_name}</h1>
          <p className="text-blue-200 text-sm mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Étudiants" value={students?.count ?? 0}
          icon={<Users className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
        <StatsCard title="Candidatures en attente" value={applications?.count ?? 0}
          icon={<ClipboardList className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
        <StatsCard title="Inscriptions à valider" value={enrollments?.count ?? 0}
          icon={<CheckCircle className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Documents à vérifier" value={docs?.count ?? 0}
          icon={<FileText className="w-5 h-5" />} color="bg-gradient-to-br from-red-500 to-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Candidatures en attente */}
        <Card title="Candidatures à instruire"
          action={applications?.count ? <Badge label={`${applications.count} en attente`} className="badge-yellow" dot /> : undefined}>
          {!applications?.results?.length ? (
            <Alert type="success">Aucune candidature en attente.</Alert>
          ) : (
            <div className="space-y-2">
              {applications.results.map((app: { id: string; application_number: string; applicant_name: string; program_name: string; submitted_at: string | null; status: string; status_display: string }) => (
                <div key={app.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{app.applicant_name}</p>
                      <p className="text-xs text-gray-400">{app.program_name} · {formatDate(app.submitted_at)}</p>
                    </div>
                  </div>
                  <Badge label={app.status_display} className={statusColor(app.status)} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Inscriptions à valider */}
        <Card title="Inscriptions à valider"
          action={enrollments?.count ? <Badge label={`${enrollments.count} en attente`} className="badge-blue" dot /> : undefined}>
          {!enrollments?.results?.length ? (
            <Alert type="success">Aucune inscription en attente.</Alert>
          ) : (
            <div className="space-y-2">
              {enrollments.results.map((enr: { id: string; enrollment_number: string; student_name: string; program_name: string; payment_validated: boolean; status: string; status_display: string }) => (
                <div key={enr.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{enr.student_name}</p>
                    <p className="text-xs text-gray-400">{enr.program_name} · {enr.enrollment_number}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge label={enr.status_display} className={statusColor(enr.status)} />
                    {enr.payment_validated
                      ? <Badge label="Payé ✓" className="badge-green" />
                      : <Badge label="Non payé" className="badge-red" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Documents à vérifier */}
        <Card title="Documents à vérifier" className="lg:col-span-2"
          action={docs?.count ? <Badge label={`${docs.count} en attente`} className="badge-red" dot /> : undefined}>
          {!docs?.results?.length ? (
            <Alert type="success">Tous les documents ont été vérifiés.</Alert>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {docs.results.map((doc: { id: string; title: string; student: string; created_at: string; status: string }) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-400">Déposé le {formatDate(doc.created_at)}</p>
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

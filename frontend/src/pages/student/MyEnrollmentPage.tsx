import { useQuery } from '@tanstack/react-query'
import { GraduationCap, BookMarked, CheckCircle, Users, Calendar, BookOpen } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Alert, Progress } from '../../components/ui'
import { formatDate, statusColor } from '../../lib/utils'
import api from '../../lib/axios'

interface AdminEnrollment {
  id: string
  enrollment_number: string
  program_name: string
  type: string
  status: string
  status_display: string
  payment_validated: boolean
  created_at: string
  validated_at: string | null
}

interface PedaEnrollment {
  id: string
  semester_label: string
  group_name: string | null
  status: string
  status_display: string
  confirmed_at: string | null
  ue_count?: number
}

export default function MyEnrollmentPage() {
  const { data: adminEnrollments, isLoading: loadAdmin } = useQuery({
    queryKey: ['my-admin-enrollments'],
    queryFn: () => api.get('/admin-enrollments/').then(r => r.data),
  })

  const { data: pedaEnrollments, isLoading: loadPeda } = useQuery({
    queryKey: ['my-peda-enrollments'],
    queryFn: () => api.get('/peda-enrollments/').then(r => r.data),
  })

  const { data: ueEnrollments } = useQuery({
    queryKey: ['my-ue-enrollments'],
    queryFn: () => api.get('/ue-enrollments/').then(r => r.data),
  })

  const adminList: AdminEnrollment[] = adminEnrollments?.results ?? []
  const pedaList: PedaEnrollment[] = pedaEnrollments?.results ?? []
  const ueList = ueEnrollments?.results ?? []
  const enrollment = adminList[0]

  const isLoading = loadAdmin || loadPeda

  // Calcul du statut global
  const adminValidated = adminList.some(e => e.status === 'validee')
  const pedaConfirmed = pedaList.some(e => e.status === 'confirmee')
  const paymentOk = adminList.some(e => e.payment_validated)
  const progressSteps = [adminValidated, paymentOk, pedaConfirmed]
  const progressPct = Math.round((progressSteps.filter(Boolean).length / progressSteps.length) * 100)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Mon Inscription</h1>
        <p className="text-gray-400 text-sm mt-0.5">Détails de votre inscription administrative et pédagogique</p>
      </div>

      {isLoading ? <Spinner text="Chargement de votre inscription..." /> : !adminList.length ? (
        <Alert type="info" title="Aucune inscription trouvée">
          Contactez le service de scolarité pour initier votre inscription.
        </Alert>
      ) : (
        <>
          {/* Progression */}
          <Card title="État de votre inscription">
            <div className="flex items-center gap-4 mb-4">
              {[
                { label: 'Inscription admin', done: adminValidated },
                { label: 'Paiement', done: paymentOk },
                { label: 'Inscription péda', done: pedaConfirmed },
              ].map(({ label, done }, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${done ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                    {done ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <span className="text-gray-400 font-bold text-sm">{i + 1}</span>}
                  </div>
                  <p className={`text-xs text-center font-medium ${done ? 'text-emerald-700' : 'text-gray-400'}`}>{label}</p>
                </div>
              ))}
            </div>
            <Progress value={progressPct}
              color={progressPct === 100 ? 'bg-emerald-500' : progressPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}
              label={`${progressPct}% complété`} />
          </Card>

          {/* Inscriptions administratives */}
          {adminList.map(enroll => (
            <Card key={enroll.id} title="Inscription administrative" subtitle={enroll.enrollment_number}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['N° inscription', enroll.enrollment_number],
                  ['Programme', enroll.program_name],
                  ['Type', enroll.type === 'premiere_inscription' ? 'Première inscription' : enroll.type === 'reinscription' ? 'Réinscription' : enroll.type],
                  ['Date d\'inscription', formatDate(enroll.created_at)],
                  ['Validation', enroll.validated_at ? formatDate(enroll.validated_at) : '—'],
                  ['Paiement', enroll.payment_validated ? '✓ Validé' : '⏳ En attente'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">{label}</p>
                    <p className={`font-semibold text-sm ${value === '✓ Validé' ? 'text-emerald-700' : value === '⏳ En attente' ? 'text-amber-700' : 'text-gray-800'}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Badge label={enroll.status_display} className={statusColor(enroll.status)} dot />
                {enroll.payment_validated && <Badge label="Paiement validé ✓" className="badge-green" />}
              </div>
            </Card>
          ))}

          {/* Inscriptions pédagogiques */}
          <Card title="Inscriptions pédagogiques" subtitle="Semestres et groupes">
            {!pedaList.length ? (
              <Alert type="info">Aucune inscription pédagogique. Contactez votre responsable de filière.</Alert>
            ) : (
              <div className="space-y-3">
                {pedaList.map(pe => {
                  const myUEs = ueList.filter((u: { peda_enrollment: string }) => u.peda_enrollment === pe.id)
                  return (
                    <div key={pe.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-gray-900">{pe.semester_label}</p>
                          {pe.group_name && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Users className="w-3 h-3" /> Groupe : {pe.group_name}
                            </p>
                          )}
                        </div>
                        <Badge label={pe.status_display} className={statusColor(pe.status)} dot />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1.5">
                          <BookMarked className="w-3.5 h-3.5 text-primary-500" />
                          {myUEs.length > 0 ? `${myUEs.length} UE inscrites` : (pe.ue_count ?? 0) + ' UE'}
                        </span>
                        {pe.confirmed_at && (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            Confirmé le {formatDate(pe.confirmed_at)}
                          </span>
                        )}
                      </div>
                      {/* Liste des UE */}
                      {myUEs.length > 0 && (
                        <div className="space-y-1">
                          {myUEs.map((ue: { id: string; ue_code: string; ue_name: string; is_optional: boolean }) => (
                            <div key={ue.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-gray-100">
                              <BookOpen className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                              <span className="text-xs font-semibold text-gray-700">{ue.ue_code}</span>
                              <span className="text-xs text-gray-400 truncate">{ue.ue_name}</span>
                              {ue.is_optional && <span className="ml-auto text-xs text-amber-600 font-medium">Optionnelle</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

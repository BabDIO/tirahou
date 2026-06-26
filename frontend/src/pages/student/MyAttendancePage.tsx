import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCheck, AlertTriangle, CheckCircle, Clock, Upload } from 'lucide-react'
import { Card, Spinner, Badge, Empty, StatsCard, Alert, Progress, Modal } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

interface AbsenceSummary {
  id: string
  course_space_title: string
  total_sessions: number
  present_count: number
  absent_count: number
  late_count: number
  justified_count: number
  unjustified_count: number
  attendance_rate: number
  alert_level: string
  punctuality_rate: number
  recommendations: string[]
}

interface AttendanceRecord {
  id: string
  sheet_session_date: string
  status: string
  method: string
  marked_at: string | null
  justification_status: string
  justification: string
}

const alertLevelColor = (level: string) => ({
  none: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-orange-100 text-orange-700',
  exclusion_risk: 'bg-red-100 text-red-700',
}[level] ?? 'bg-gray-100 text-gray-600')

const statusColor = (s: string) => ({
  present: 'badge-green', absent: 'badge-red', retard: 'badge-yellow', excuse: 'badge-blue',
}[s] ?? 'badge-gray')

export default function MyAttendancePage() {
  const qc = useQueryClient()
  const [selectedSummary, setSelectedSummary] = useState<AbsenceSummary | null>(null)
  const [justifyRecord, setJustifyRecord] = useState<AttendanceRecord | null>(null)
  const [justifyText, setJustifyText] = useState('')
  const [justifyFile, setJustifyFile] = useState<File | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-absence-summaries'],
    queryFn: () => api.get('/absence-summaries/').then(r => r.data),
  })

  const { data: records } = useQuery({
    queryKey: ['my-attendance-records', selectedSummary?.id],
    queryFn: () => api.get('/attendance-records/my_attendance/').then(r => r.data),
    enabled: !!selectedSummary,
  })

  const justifyMut = useMutation({
    mutationFn: ({ id, justification, file }: { id: string; justification: string; file: File | null }) => {
      const fd = new FormData()
      fd.append('justification', justification)
      if (file) fd.append('justification_file', file)
      return api.post(`/attendance-records/${id}/justify/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      toast.success('Justificatif soumis — en attente de validation')
      setJustifyRecord(null)
      setJustifyText('')
      setJustifyFile(null)
      qc.invalidateQueries({ queryKey: ['my-attendance-records'] })
    },
    onError: () => toast.error('Erreur lors de la soumission'),
  })

  const summaries: AbsenceSummary[] = data?.results ?? []
  const recordList: AttendanceRecord[] = records?.results ?? records ?? []

  const avgRate = summaries.length
    ? Math.round(summaries.reduce((s, a) => s + a.attendance_rate, 0) / summaries.length)
    : 0
  const atRiskCount = summaries.filter(a => ['critical', 'exclusion_risk'].includes(a.alert_level)).length
  const goodCount = summaries.filter(a => a.attendance_rate >= 80).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Mon Assiduité</h1>
        <p className="text-gray-400 text-sm mt-0.5">Suivi de votre présence par cours</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Taux moyen" value={`${avgRate}%`}
          icon={<UserCheck className="w-5 h-5" />}
          color={avgRate >= 80 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : avgRate >= 60 ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-red-500 to-rose-500'} />
        <StatsCard title="Cours OK (≥ 80%)" value={goodCount}
          icon={<CheckCircle className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Cours à risque" value={atRiskCount}
          icon={<AlertTriangle className="w-5 h-5" />} color={atRiskCount > 0 ? 'bg-gradient-to-br from-red-500 to-rose-500' : 'bg-gradient-to-br from-gray-400 to-gray-500'} />
      </div>

      {atRiskCount > 0 && (
        <Alert type="error" title="⚠ Assiduité insuffisante">
          Vous avez {atRiskCount} cours avec un niveau d'alerte élevé. Régularisez vos absences au plus vite.
        </Alert>
      )}

      {isLoading ? <Spinner text="Chargement de votre assiduité..." /> : !summaries.length ? (
        <Empty icon={<UserCheck className="w-8 h-8" />} message="Aucune donnée d'assiduité"
          description="Les données apparaîtront après les premières séances de cours." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summaries.sort((a, b) => a.attendance_rate - b.attendance_rate).map(abs => (
            <Card key={abs.id} hover onClick={() => setSelectedSummary(abs)} className="cursor-pointer">
              <div className="flex items-start gap-4 mb-3">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg ${
                  abs.attendance_rate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  abs.attendance_rate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  {Math.round(abs.attendance_rate)}%
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{abs.course_space_title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {abs.alert_level !== 'none' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${alertLevelColor(abs.alert_level)}`}>
                        {abs.alert_level === 'warning' ? '⚠ Avertissement' :
                         abs.alert_level === 'critical' ? '🔴 Critique' : '🚨 Risque exclusion'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-5 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full" />{abs.present_count} présence(s)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" />{abs.absent_count} absence(s)</span>
                {abs.late_count > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" />{abs.late_count} retard(s)</span>}
                <span className="text-gray-400">{abs.total_sessions} séances</span>
              </div>

              <Progress value={abs.attendance_rate}
                color={abs.attendance_rate >= 80 ? 'bg-emerald-500' : abs.attendance_rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}
                size="sm" />

              {abs.recommendations?.length > 0 && (
                <div className="mt-3 space-y-1">
                  {abs.recommendations.slice(0, 2).map((r, i) => (
                    <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                      <span className="flex-shrink-0">→</span>{r}
                    </p>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Détail séances */}
      {selectedSummary && (
        <Card title={`Détail — ${selectedSummary.course_space_title}`}
          subtitle="Cliquez sur une absence pour la justifier"
          action={<button onClick={() => setSelectedSummary(null)} className="text-xs text-gray-400 hover:text-gray-600">Fermer ✕</button>}>
          {!recordList.length ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucune séance enregistrée</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {recordList.map(r => (
                <div key={r.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                  <div className="flex items-center gap-2">
                    <Badge label={r.status} className={statusColor(r.status)} />
                    <div>
                      <p className="text-xs text-gray-600">{r.marked_at ? formatDate(r.marked_at) : '—'}</p>
                      <p className="text-xs text-gray-400">{r.method}</p>
                    </div>
                  </div>
                  {r.status === 'absent' && r.justification_status !== 'approved' && (
                    <button onClick={() => { setJustifyRecord(r); setJustifyText(r.justification ?? '') }}
                      className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg font-medium hover:bg-amber-200 transition">
                      {r.justification_status === 'pending' ? 'En attente' : 'Justifier'}
                    </button>
                  )}
                  {r.justification_status === 'approved' && <span className="text-xs text-emerald-600 font-medium">✓ Approuvé</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Modal justification */}
      <Modal open={!!justifyRecord} onClose={() => setJustifyRecord(null)} title="Justifier une absence" size="sm">
        {justifyRecord && (
          <div className="space-y-4">
            <div>
              <label className="label">Motif de l'absence *</label>
              <textarea className="input h-24 resize-none" value={justifyText}
                onChange={e => setJustifyText(e.target.value)}
                placeholder="Expliquez le motif de votre absence (médical, familial, etc.)" />
            </div>
            <div>
              <label className="label">Pièce justificative (optionnel)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                className="input file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary-100 file:text-primary-700 file:text-sm"
                onChange={e => setJustifyFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setJustifyRecord(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">Annuler</button>
              <button onClick={() => justifyMut.mutate({ id: justifyRecord.id, justification: justifyText, file: justifyFile })}
                disabled={!justifyText.trim() || justifyMut.isPending}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition disabled:opacity-50">
                <Upload className="w-4 h-4 inline mr-2" />{justifyMut.isPending ? 'Envoi...' : 'Soumettre'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

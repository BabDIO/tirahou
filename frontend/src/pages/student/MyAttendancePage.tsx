import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, TrendingDown, Upload, FileText, AlertCircle } from 'lucide-react'
import { Card, StatsCard, Badge, Progress, Modal, Button } from '../../components/ui'
import { attendanceApi } from '../../api'
import { useToast } from '../../hooks/useToast'
import api from '../../lib/axios'

interface AttendanceEntry {
  id: string
  course_name: string
  status: string
  status_display: string
  date: string
  time: string
  justification_status: string
  justification_status_display: string
  justification_reason: string
  justification: string
  justification_file_url: string | null
  reviewer_comment: string
  can_justify: boolean
}

const REASON_OPTIONS = [
  { value: 'medical', label: 'Certificat médical' },
  { value: 'family', label: 'Raison familiale' },
  { value: 'transport', label: 'Incident de transport' },
  { value: 'professional', label: 'Raison professionnelle' },
  { value: 'other', label: 'Autre' },
]

const justificationBadge = (status: string) => ({
  pending: 'badge-yellow',
  approved: 'badge-green',
  rejected: 'badge-red',
  not_required: 'badge-gray',
}[status] ?? 'badge-gray')

export default function MyAttendancePage() {
  const [justifyRecord, setJustifyRecord] = useState<AttendanceEntry | null>(null)
  const qc = useQueryClient()

  const { data: attendance } = useQuery({
    queryKey: ['student-attendance'],
    queryFn: () => api.get('/student/attendance/').then(r => r.data as AttendanceEntry[])
  })

  const { data: stats } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: () => api.get('/student/attendance/stats/').then(r => r.data)
  })

  const rate = stats?.rate || 0
  const present = stats?.present || 0
  const absent = stats?.absent || 0
  const total = present + absent

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mon assiduité</h1>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatsCard title="Taux de présence" value={`${rate}%`} icon={<TrendingDown className="w-5 h-5" />} color="bg-blue-600" />
        <StatsCard title="Présent" value={present} icon={<CheckCircle className="w-5 h-5" />} color="bg-emerald-600" />
        <StatsCard title="Absent" value={absent} icon={<XCircle className="w-5 h-5" />} color="bg-red-600" />
        <StatsCard title="Total séances" value={total} icon={<Clock className="w-5 h-5" />} color="bg-purple-600" />
      </div>

      <Card title="Progression">
        <Progress value={rate} max={100} label="Taux de présence" size="lg" color={rate >= 75 ? 'bg-emerald-600' : rate >= 50 ? 'bg-amber-600' : 'bg-red-600'} />
        {rate < 75 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">⚠️ Votre taux de présence est inférieur à 75%. Cela peut affecter votre validation du semestre.</p>
          </div>
        )}
      </Card>

      <Card title="Historique">
        <div className="space-y-3">
          {attendance?.map((record) => (
            <div key={record.id} className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${record.status === 'present' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {record.status === 'present' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{record.course_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{record.date} - {record.time}</p>
                </div>
                <Badge label={record.status_display} className={record.status === 'present' ? 'badge-green' : 'badge-red'} />
              </div>

              {record.justification_status !== 'not_required' && (
                <div className="flex items-start gap-2 ml-14 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge label={record.justification_status_display} className={justificationBadge(record.justification_status)} />
                    </div>
                    {record.justification && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{record.justification}</p>}
                    {record.reviewer_comment && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">Commentaire scolarité : {record.reviewer_comment}</p>
                    )}
                  </div>
                </div>
              )}

              {record.can_justify && (
                <div className="ml-14">
                  <Button size="sm" variant="secondary" icon={<Upload className="w-3.5 h-3.5" />}
                    onClick={() => setJustifyRecord(record)}>
                    {record.justification_status === 'rejected' ? 'Soumettre un nouveau justificatif' : 'Justifier cette absence'}
                  </Button>
                </div>
              )}
            </div>
          ))}
          {!attendance?.length && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Aucun enregistrement pour l'instant.</p>
          )}
        </div>
      </Card>

      <Modal open={!!justifyRecord} onClose={() => setJustifyRecord(null)} title="Justifier une absence" size="sm">
        {justifyRecord && (
          <JustifyForm record={justifyRecord} onClose={() => setJustifyRecord(null)}
            onSuccess={() => { qc.invalidateQueries({ queryKey: ['student-attendance'] }); setJustifyRecord(null) }} />
        )}
      </Modal>
    </div>
  )
}

function JustifyForm({ record, onClose, onSuccess }: { record: AttendanceEntry; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const toast = useToast()

  const submitMut = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('reason', reason)
      fd.append('justification', text)
      if (file) fd.append('justification_file', file)
      return attendanceApi.justify(record.id, fd)
    },
    onSuccess: () => { toast.success('Justificatif soumis — en attente de validation.'); onSuccess() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Erreur lors de l\'envoi du justificatif'),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{record.course_name} — {record.date} à {record.time}</span>
      </div>
      <div>
        <label className="label">Motif *</label>
        <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
          <option value="">— Sélectionner —</option>
          {REASON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Explication</label>
        <textarea className="input min-h-[80px]" placeholder="Précisez le contexte de votre absence..."
          value={text} onChange={e => setText(e.target.value)} />
      </div>
      <div>
        <label className="label">Pièce justificative <span className="normal-case text-gray-400 font-medium">(PDF, JPG ou PNG, 10 Mo max)</span></label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input"
          onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Annuler</Button>
        <Button className="flex-1" loading={submitMut.isPending} disabled={!reason}
          onClick={() => submitMut.mutate()}>
          Envoyer
        </Button>
      </div>
    </div>
  )
}

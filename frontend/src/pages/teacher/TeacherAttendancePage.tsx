import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCheck, QrCode, Code, Check, X, Clock, AlertTriangle } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Modal, Alert } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

const statusColor = (s: string) => ({
  present: 'badge-green', absent: 'badge-red', retard: 'badge-yellow', excuse: 'badge-blue',
}[s] ?? 'badge-gray')

export default function TeacherAttendancePage() {
  const qc = useQueryClient()
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null)
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [sessionId, setSessionId] = useState('')

  const { data: sessions } = useQuery({
    queryKey: ['teacher-sessions'],
    queryFn: () => api.get('/sessions/', { params: { ordering: '-start_datetime' } }).then(r => r.data),
  })

  const { data: sheets, isLoading } = useQuery({
    queryKey: ['attendance-sheets'],
    queryFn: () => api.get('/attendance-sheets/').then(r => r.data),
  })

  const { data: records } = useQuery({
    queryKey: ['attendance-records', selectedSheet],
    queryFn: () => api.get('/attendance-records/', { params: { sheet: selectedSheet } }).then(r => r.data),
    enabled: !!selectedSheet,
  })

  const createSheetMut = useMutation({
    mutationFn: (data: object) => api.post('/attendance-sheets/', data),
    onSuccess: () => { toast.success('Feuille créée'); setShowCreateSheet(false); qc.invalidateQueries({ queryKey: ['attendance-sheets'] }) },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const openSheetMut = useMutation({
    mutationFn: (id: string) => api.post(`/attendance-sheets/${id}/open/`),
    onSuccess: () => { toast.success('Feuille ouverte — les étudiants peuvent pointer'); qc.invalidateQueries({ queryKey: ['attendance-sheets'] }) },
  })

  const closeSheetMut = useMutation({
    mutationFn: (id: string) => api.post(`/attendance-sheets/${id}/close/`),
    onSuccess: () => { toast.success('Feuille fermée'); qc.invalidateQueries({ queryKey: ['attendance-sheets'] }) },
  })

  const updateRecordMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/attendance-records/${id}/`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-records', selectedSheet] }),
  })

  const sheetList = sheets?.results ?? []
  const recordList = records?.results ?? []
  const selectedSheetData = sheetList.find((s: { id: string }) => s.id === selectedSheet)

  const presentCount = recordList.filter((r: { status: string }) => r.status === 'present').length
  const absentCount = recordList.filter((r: { status: string }) => r.status === 'absent').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Gestion des Présences</h1>
          <p className="text-gray-400 text-sm mt-0.5">Créez des feuilles, gérez les pointages QR code</p>
        </div>
        <button onClick={() => setShowCreateSheet(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 text-sm font-semibold transition">
          <UserCheck className="w-4 h-4" /> Nouvelle feuille
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Liste des feuilles */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-700">Feuilles de présence</h3>
          {isLoading ? <Spinner /> : !sheetList.length ? (
            <Empty icon={<UserCheck className="w-6 h-6" />} message="Aucune feuille" description="Créez une feuille pour une séance." />
          ) : sheetList.map((sheet: { id: string; session_code: string; is_open: boolean; created_at: string; session?: { ec_code?: string; start_datetime?: string } }) => (
            <Card key={sheet.id} hover onClick={() => setSelectedSheet(sheet.id)}
              className={`cursor-pointer ${selectedSheet === sheet.id ? 'ring-2 ring-primary-500' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{sheet.session?.ec_code ?? 'Séance'}</p>
                  <p className="text-xs text-gray-400">{sheet.session?.start_datetime ? formatDate(sheet.session.start_datetime) : formatDate(sheet.created_at)}</p>
                  <p className="font-mono text-xs text-primary-600 mt-0.5">Code : {sheet.session_code}</p>
                </div>
                <Badge label={sheet.is_open ? 'Ouverte' : 'Fermée'} className={sheet.is_open ? 'badge-green' : 'badge-gray'} />
              </div>
            </Card>
          ))}
        </div>

        {/* Détail de la feuille */}
        {selectedSheet && selectedSheetData ? (
          <div className="lg:col-span-2 space-y-4">
            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {!selectedSheetData.is_open ? (
                <button onClick={() => openSheetMut.mutate(selectedSheet)}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition">
                  <QrCode className="w-4 h-4" /> Ouvrir (activer QR)
                </button>
              ) : (
                <button onClick={() => closeSheetMut.mutate(selectedSheet)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition">
                  <X className="w-4 h-4" /> Fermer la feuille
                </button>
              )}
              {selectedSheetData.is_open && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                  <Code className="w-4 h-4 text-emerald-600" />
                  <span className="font-mono text-sm font-bold text-emerald-800">{selectedSheetData.session_code}</span>
                  <span className="text-xs text-emerald-600">— Code à dicter</span>
                </div>
              )}
            </div>

            {/* Stats rapides */}
            {recordList.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                  <p className="text-2xl font-black text-emerald-700">{presentCount}</p>
                  <p className="text-xs text-emerald-600">Présents</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                  <p className="text-2xl font-black text-red-700">{absentCount}</p>
                  <p className="text-xs text-red-600">Absents</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                  <p className="text-2xl font-black text-gray-700">{recordList.length}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            )}

            {/* Liste des présences */}
            {!recordList.length ? (
              <Alert type="info">
                {selectedSheetData.is_open
                  ? 'La feuille est ouverte. Les étudiants peuvent pointer via QR code ou code de séance.'
                  : 'Ouvrez la feuille pour permettre le pointage.'}
              </Alert>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {recordList.map((r: { id: string; student_name?: string; status: string; method: string; marked_at: string | null; minutes_late: number }) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        r.status === 'present' ? 'bg-emerald-100' : r.status === 'absent' ? 'bg-red-100' : 'bg-amber-100'
                      }`}>
                        {r.status === 'present' ? <Check className="w-4 h-4 text-emerald-600" /> :
                          r.status === 'absent' ? <X className="w-4 h-4 text-red-600" /> :
                          <Clock className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{r.student_name ?? 'Étudiant'}</p>
                        <p className="text-xs text-gray-400">
                          {r.method} {r.marked_at && `· ${new Date(r.marked_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                          {r.minutes_late > 0 && ` · ${r.minutes_late} min retard`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {['present', 'absent', 'retard', 'excuse'].map(s => (
                        <button key={s} onClick={() => updateRecordMut.mutate({ id: r.id, status: s })}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition ${r.status === s ? statusColor(s) + ' opacity-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 opacity-60'}`}>
                          {s === 'present' ? '✓' : s === 'absent' ? '✗' : s === 'retard' ? '⏱' : 'E'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center text-gray-400 text-sm">
            ← Sélectionnez une feuille pour gérer les présences
          </div>
        )}
      </div>

      {/* Modal créer feuille */}
      <Modal open={showCreateSheet} onClose={() => setShowCreateSheet(false)} title="Créer une feuille de présence" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Séance *</label>
            <select className="input" value={sessionId} onChange={e => setSessionId(e.target.value)}>
              <option value="">— Sélectionner une séance —</option>
              {(sessions?.results ?? []).map((s: { id: string; ec_code?: string; start_datetime: string }) => (
                <option key={s.id} value={s.id}>
                  {s.ec_code ?? 'Séance'} — {formatDate(s.start_datetime)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCreateSheet(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">Annuler</button>
            <button onClick={() => createSheetMut.mutate({ session: sessionId })}
              disabled={!sessionId || createSheetMut.isPending}
              className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
              {createSheetMut.isPending ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

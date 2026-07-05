import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Award, Save, BarChart2, Download, Upload } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Alert } from '../../components/ui'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

interface GradeEntry { id?: string; student_id: string; student_name: string; cc_grade: string; exam_grade: string; is_absent: boolean }

export default function TeacherGradesPage() {
  const qc = useQueryClient()
  const [selectedEc, setSelectedEc] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [entries, setEntries] = useState<Record<string, GradeEntry>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const { data: ecs } = useQuery({
    queryKey: ['teacher-ecs'],
    queryFn: () => api.get('/ecs/').then(r => r.data),
  })

  const { data: sessions } = useQuery({
    queryKey: ['exam-sessions'],
    queryFn: () => api.get('/exam-sessions/').then(r => r.data),
  })

  const { data: students } = useQuery({
    queryKey: ['ec-students', selectedEc],
    queryFn: () => api.get('/students/', { params: { enrolled_in_ec: selectedEc } }).then(r => r.data),
    enabled: !!selectedEc,
  })

  const { data: gradesData } = useQuery({
    queryKey: ['teacher-grades', selectedEc, selectedSession],
    queryFn: () => api.get('/evaluation/teacher/grades/', { params: { ec: selectedEc, exam_session: selectedSession } }).then(r => r.data),
    enabled: !!selectedEc && !!selectedSession,
    onSuccess: (data: { id: string; student: string; student_name: string; cc_grade: number | null; exam_grade: number | null; is_absent: boolean }[]) => {
      const map: Record<string, GradeEntry> = {}
      ;(data ?? []).forEach(g => {
        map[g.student] = { id: g.id, student_id: g.student, student_name: g.student_name, cc_grade: g.cc_grade?.toString() ?? '', exam_grade: g.exam_grade?.toString() ?? '', is_absent: g.is_absent }
      })
      setEntries(map)
    },
  } as Parameters<typeof useQuery>[0])

  const { data: stats } = useQuery({
    queryKey: ['class-stats', selectedEc, selectedSession],
    queryFn: () => api.get('/evaluation/teacher/statistics/', { params: { ec: selectedEc, exam_session: selectedSession } }).then(r => r.data),
    enabled: !!selectedEc && !!selectedSession,
  })

  const saveGradeMut = useMutation({
    mutationFn: (entry: GradeEntry) => api.post('/evaluation/teacher/enter-grade/', {
      student_id: entry.student_id, ec_id: selectedEc, exam_session_id: selectedSession,
      cc_grade: entry.cc_grade !== '' ? parseFloat(entry.cc_grade) : null,
      exam_grade: entry.exam_grade !== '' ? parseFloat(entry.exam_grade) : null,
      is_absent: entry.is_absent,
    }),
    onSuccess: () => { toast.success('Note enregistrée'); qc.invalidateQueries({ queryKey: ['teacher-grades', selectedEc, selectedSession] }) },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })

  const studentList = students?.results ?? []
  const ecList = ecs?.results ?? []
  const sessionList = sessions?.results ?? []

  const updateEntry = (studentId: string, field: string, value: string | boolean) => {
    setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }))
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Saisie des Notes</h1>
        <p className="text-gray-400 text-sm mt-0.5">Saisissez et publiez les notes de vos étudiants</p>
      </div>

      {/* Sélection EC + Session */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Élément Constitutif (EC)</label>
            <select className="input" value={selectedEc} onChange={e => { setSelectedEc(e.target.value); setEntries({}) }}>
              <option value="">— Choisir un EC —</option>
              {ecList.map((ec: { id: string; code: string; name: string }) => (
                <option key={ec.id} value={ec.id}>{ec.code} — {ec.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Session d'examen</label>
            <select className="input" value={selectedSession} onChange={e => setSelectedSession(e.target.value)}>
              <option value="">— Choisir une session —</option>
              {sessionList.map((s: { id: string; session_type_display: string; academic_year_label?: string }) => (
                <option key={s.id} value={s.id}>{s.session_type_display} — {s.academic_year_label ?? ''}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Moyenne', value: `${parseFloat(stats.average ?? 0).toFixed(2)}/20` },
            { label: 'Taux réussite', value: `${stats.success_rate ?? 0}%` },
            { label: 'Min/Max', value: `${stats.min ?? '—'} / ${stats.max ?? '—'}` },
            { label: 'Absents', value: stats.absent_count ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="font-black text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tableau de saisie */}
      {selectedEc && selectedSession ? (
        !studentList.length ? (
          <Alert type="info">Aucun étudiant inscrit à cet EC pour cette session.</Alert>
        ) : (
          <Card noPadding>
            <div className="p-4 flex items-center justify-between">
              <p className="font-semibold text-sm text-gray-700">{studentList.length} étudiant(s)</p>
              <div className="flex gap-2">
                {/* La validation en masse est réservée aux responsables pédagogiques */}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Étudiant</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">CC (40%)</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Examen (60%)</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Note finale</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Absent</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {studentList.map((s: { id: string; student_id: string; user: { first_name: string; last_name: string } }) => {
                    const entry = entries[s.id] ?? { student_id: s.id, student_name: `${s.user.first_name} ${s.user.last_name}`, cc_grade: '', exam_grade: '', is_absent: false }
                    const ccVal = parseFloat(entry.cc_grade) || 0
                    const examVal = parseFloat(entry.exam_grade) || 0
                    const finalGrade = entry.is_absent ? 0 : !entry.cc_grade && !entry.exam_grade ? null : Math.min(20, Math.max(0, ccVal * 0.4 + examVal * 0.6))
                    const gradeColor = finalGrade === null ? 'text-gray-400' : finalGrade >= 10 ? 'text-emerald-600 font-black' : 'text-red-600 font-black'
                    return (
                      <tr key={s.id} className={`hover:bg-gray-50 transition ${entry.is_absent ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{s.user.first_name} {s.user.last_name}</p>
                          <p className="text-xs text-gray-400">{s.student_id}</p>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input type="number" min={0} max={20} step={0.25} disabled={entry.is_absent}
                            value={entry.cc_grade}
                            onChange={e => updateEntry(s.id, 'cc_grade', e.target.value)}
                            className="w-20 text-center border border-gray-200 rounded-lg py-1 text-sm focus:ring-1 focus:ring-primary-400 focus:border-primary-400 disabled:bg-gray-50 disabled:text-gray-400" />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input type="number" min={0} max={20} step={0.25} disabled={entry.is_absent}
                            value={entry.exam_grade}
                            onChange={e => updateEntry(s.id, 'exam_grade', e.target.value)}
                            className="w-20 text-center border border-gray-200 rounded-lg py-1 text-sm focus:ring-1 focus:ring-primary-400 focus:border-primary-400 disabled:bg-gray-50 disabled:text-gray-400" />
                        </td>
                        <td className={`px-3 py-3 text-center text-base ${gradeColor}`}>
                          {finalGrade !== null ? finalGrade.toFixed(2) : '—'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input type="checkbox" checked={entry.is_absent}
                            onChange={e => updateEntry(s.id, 'is_absent', e.target.checked)}
                            className="w-4 h-4 rounded accent-red-500" />
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => saveGradeMut.mutate({ ...entry, student_id: s.id })}
                            disabled={saveGradeMut.isPending}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-xs font-semibold hover:bg-primary-200 transition disabled:opacity-50">
                            <Save className="w-3.5 h-3.5" /> Enreg.
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        <Alert type="info">Sélectionnez un EC et une session d'examen pour commencer la saisie.</Alert>
      )}
    </div>
  )
}

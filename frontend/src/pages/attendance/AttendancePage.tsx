import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, QrCode, Users, CheckCircle, XCircle, Clock, AlertTriangle, Plus, Eye } from 'lucide-react'
import { attendanceApi } from '../../api'
import { Button, Input, Badge, Spinner, Empty, Pagination, Modal, Card, StatsCard, Alert, Tabs, Progress } from '../../components/ui'
import { formatDate, statusColor } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import type { AttendanceSheet, AbsenceSummary } from '../../types'

type Tab = 'sheets' | 'records' | 'summaries'

const alertLevelColor: Record<string, string> = {
  none: 'badge-gray',
  warning: 'badge-yellow',
  critical: 'badge-red',
  exclusion_risk: 'badge-red',
}

export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>('sheets')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AttendanceSheet | null>(null)
  const [markOpen, setMarkOpen] = useState(false)
  const [markSheetId, setMarkSheetId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: sheets, isLoading: sheetsLoading } = useQuery({
    queryKey: ['attendance-sheets', page, search],
    queryFn: () => attendanceApi.getSheets({ page, search }).then(r => r.data),
    enabled: tab === 'sheets',
  })

  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['attendance-records', page],
    queryFn: () => attendanceApi.getRecords({ page }).then(r => r.data),
    enabled: tab === 'records',
  })

  const { data: summaries, isLoading: summariesLoading } = useQuery({
    queryKey: ['absence-summaries', page],
    queryFn: () => attendanceApi.getAbsenceSummaries({ page }).then(r => r.data),
    enabled: tab === 'summaries',
  })

  const openSheet = useMutation({
    mutationFn: (id: string) => attendanceApi.openSheet(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance-sheets'] }); toast.success('Feuille ouverte') },
  })

  const closeSheet = useMutation({
    mutationFn: (id: string) => attendanceApi.closeSheet(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance-sheets'] }); toast.success('Feuille fermée') },
  })

  const openSheets = sheets?.results?.filter((s: AttendanceSheet) => s.is_open).length ?? 0
  const atRisk = (summaries?.results as AbsenceSummary[] | undefined)?.filter(
    s => (s as AbsenceSummary & { alert_level?: string }).alert_level !== 'none'
  ).length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Présences & Assiduité</h1>
          <p className="text-gray-400 text-sm mt-0.5">Feuilles de présence, émargement et suivi des absences</p>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />}>Nouvelle feuille</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Feuilles actives" value={openSheets}
          icon={<QrCode className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Total feuilles" value={sheets?.count ?? 0}
          icon={<Users className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Étudiants suivis" value={summaries?.count ?? 0}
          icon={<Users className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
        <StatsCard title="Alertes assiduité" value={atRisk}
          icon={<AlertTriangle className="w-5 h-5" />} color="bg-gradient-to-br from-red-500 to-red-600" />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'sheets', label: 'Feuilles de présence', icon: <QrCode className="w-4 h-4" /> },
          { key: 'records', label: 'Enregistrements', icon: <CheckCircle className="w-4 h-4" /> },
          { key: 'summaries', label: 'Résumés assiduité', icon: <AlertTriangle className="w-4 h-4" />, count: atRisk },
        ]}
        active={tab} onChange={k => { setTab(k as Tab); setPage(1) }} variant="underline"
      />

      {/* Sheets */}
      {tab === 'sheets' && (
        <>
          <Card noPadding>
            <div className="p-4">
              <Input placeholder="Rechercher une feuille..." leftIcon={<Search className="w-4 h-4" />}
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </Card>
          <Card noPadding>
            {sheetsLoading ? <Spinner text="Chargement des feuilles..." /> : !sheets?.results?.length ? (
              <Empty message="Aucune feuille de présence" icon={<QrCode className="w-8 h-8" />}
                description="Les feuilles sont créées automatiquement lors de la planification des séances" />
            ) : (
              <>
                <div className="divide-y divide-gray-50">
                  {sheets.results.map((sheet: AttendanceSheet) => (
                    <div key={sheet.id}
                      className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          sheet.is_open ? 'bg-emerald-100' : 'bg-gray-100'
                        }`}>
                          <QrCode className={`w-5 h-5 ${sheet.is_open ? 'text-emerald-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 text-sm">{sheet.session}</p>
                            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                              {sheet.session_code}
                            </span>
                            {sheet.is_open && <Badge label="Ouverte" className="badge-green" dot />}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                            {sheet.opened_at && <span>Ouverte: {formatDate(sheet.opened_at)}</span>}
                            {sheet.closed_at && <span>Fermée: {formatDate(sheet.closed_at)}</span>}
                            {sheet.present_count !== undefined && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                {sheet.present_count}/{sheet.total_count} présents
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => setSelected(sheet)}>Voir</Button>
                        {!sheet.is_open ? (
                          <Button variant="secondary" size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />}
                            loading={openSheet.isPending}
                            onClick={() => openSheet.mutate(sheet.id)}>Ouvrir</Button>
                        ) : (
                          <Button variant="danger" size="sm"
                            loading={closeSheet.isPending}
                            onClick={() => closeSheet.mutate(sheet.id)}>Fermer</Button>
                        )}
                        {sheet.is_open && (
                          <Button size="sm" icon={<QrCode className="w-3.5 h-3.5" />}
                            onClick={() => { setMarkSheetId(sheet.id); setMarkOpen(true) }}>
                            Marquer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination page={page} total={sheets.count} pageSize={20} onChange={setPage} />
              </>
            )}
          </Card>
        </>
      )}

      {/* Records */}
      {tab === 'records' && (
        <Card noPadding>
          {recordsLoading ? <Spinner text="Chargement..." /> : !records?.results?.length ? (
            <Empty message="Aucun enregistrement de présence" icon={<CheckCircle className="w-8 h-8" />} />
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Étudiant</th>
                      <th>Statut</th>
                      <th>Méthode</th>
                      <th>Marqué le</th>
                      <th>Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.results.map((record: { id: string; student: string; status: string; method: string; marked_at: string | null; is_justified: boolean; justification: string }) => (
                      <tr key={record.id}>
                        <td className="font-semibold text-gray-900 text-sm">{record.student}</td>
                        <td>
                          <Badge label={record.status}
                            className={
                              record.status === 'present' ? 'badge-green' :
                              record.status === 'absent' ? 'badge-red' :
                              record.status === 'retard' ? 'badge-yellow' : 'badge-blue'
                            } dot />
                        </td>
                        <td>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {record.method}
                          </span>
                        </td>
                        <td className="text-xs text-gray-400">
                          {record.marked_at ? formatDate(record.marked_at) : '—'}
                        </td>
                        <td>
                          {record.is_justified ? (
                            <Badge label="Justifiée" className="badge-blue" />
                          ) : record.status === 'absent' ? (
                            <Badge label="Non justifiée" className="badge-gray" />
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={records.count} pageSize={20} onChange={setPage} />
            </>
          )}
        </Card>
      )}

      {/* Summaries */}
      {tab === 'summaries' && (
        <Card noPadding>
          {summariesLoading ? <Spinner text="Chargement des résumés..." /> : !summaries?.results?.length ? (
            <Empty message="Aucun résumé d'assiduité" icon={<Users className="w-8 h-8" />} />
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {(summaries.results as AbsenceSummary[]).map((summary) => {
                  const alertLevel = (summary as AbsenceSummary & { alert_level?: string }).alert_level ?? 'none'
                  return (
                    <div key={summary.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 text-sm">{summary.student_name}</p>
                            {alertLevel !== 'none' && (
                              <Badge label={alertLevel} className={alertLevelColor[alertLevel] ?? 'badge-gray'} />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-3">{summary.course_space_title}</p>
                          <div className="grid grid-cols-4 gap-3 text-center">
                            <div className="bg-gray-50 rounded-lg p-2">
                              <p className="text-[10px] text-gray-400">Séances</p>
                              <p className="text-sm font-bold text-gray-800">{summary.total_sessions}</p>
                            </div>
                            <div className="bg-emerald-50 rounded-lg p-2">
                              <p className="text-[10px] text-emerald-600">Présent</p>
                              <p className="text-sm font-bold text-emerald-700">{summary.present_count}</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-2">
                              <p className="text-[10px] text-red-500">Absent</p>
                              <p className="text-sm font-bold text-red-600">{summary.absent_count}</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-2">
                              <p className="text-[10px] text-blue-500">Taux</p>
                              <p className="text-sm font-bold text-blue-700">{Number(summary.attendance_rate).toFixed(0)}%</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <Progress
                              value={Number(summary.attendance_rate)}
                              color={Number(summary.attendance_rate) >= 75 ? 'bg-emerald-500' :
                                Number(summary.attendance_rate) >= 50 ? 'bg-amber-500' : 'bg-red-500'}
                              size="sm"
                            />
                          </div>
                        </div>
                        {summary.alert_sent && (
                          <div className="flex-shrink-0">
                            <Badge label="Alerte envoyée" className="badge-red" dot />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <Pagination page={page} total={summaries.count} pageSize={20} onChange={setPage} />
            </>
          )}
        </Card>
      )}

      {/* Sheet Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title="Feuille de présence" subtitle={selected?.session_code} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ['Total', selected.total_count ?? '—', 'text-gray-900'],
                ['Présents', selected.present_count ?? '—', 'text-emerald-600'],
                ['Absents', ((selected.total_count ?? 0) - (selected.present_count ?? 0)), 'text-red-500'],
              ].map(([label, value, color]) => (
                <div key={label as string} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            {selected.is_open ? (
              <>
                <Alert type="warning">Cette feuille est actuellement ouverte pour l'émargement.</Alert>
                {selected.qr_code && (
                  <div className="text-center bg-gray-50 rounded-2xl p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Code à scanner ou saisir</p>
                    <img src={selected.qr_code} alt="QR code de la séance" className="w-40 h-40 mx-auto rounded-xl border border-gray-200 bg-white p-2" />
                    <p className="font-mono text-lg font-bold text-gray-800 tracking-widest mt-3">{selected.session_code}</p>
                  </div>
                )}
              </>
            ) : (
              <Alert type="info">Cette feuille est fermée.</Alert>
            )}
          </div>
        )}
      </Modal>

      {/* Mark by code Modal */}
      <Modal open={markOpen} onClose={() => { setMarkOpen(false); setMarkSheetId(null) }}
        title="Émargement par code" size="sm">
        <MarkByCodeForm sheetId={markSheetId ?? ''} onClose={() => { setMarkOpen(false); setMarkSheetId(null) }} />
      </Modal>
    </div>
  )
}

function MarkByCodeForm({ sheetId, onClose }: { sheetId: string; onClose: () => void }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const toast = useToast()

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    try {
      await attendanceApi.markByCode(sheetId, code.trim())
      setResult({ success: true, message: 'Présence enregistrée !' })
      setCode('')
      toast.success('Présence enregistrée')
    } catch {
      setResult({ success: false, message: 'Code invalide ou étudiant non inscrit.' })
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Code de séance ou matricule étudiant</label>
        <Input placeholder="Entrez le code..." value={code}
          onChange={e => { setCode(e.target.value); setResult(null) }}
          rightIcon={<QrCode className="w-4 h-4" />} autoFocus />
      </div>
      {result && (
        <Alert type={result.success ? 'success' : 'error'}>{result.message}</Alert>
      )}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" type="button" onClick={onClose}>Fermer</Button>
        <Button className="flex-1" type="submit" loading={loading} icon={<CheckCircle className="w-4 h-4" />}>
          Marquer présent
        </Button>
      </div>
    </form>
  )
}

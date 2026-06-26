import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookMarked, Users, UserCheck, BarChart3, Layers, TrendingUp } from 'lucide-react'
import { Card, Spinner, Badge, Empty, StatsCard, Alert, Tabs } from '../../components/ui'
import { programsApi, studentsApi, teachersApi } from '../../api'
import { statusColor, formatCurrency } from '../../lib/utils'
import api from '../../lib/axios'

export default function ResponsableProgramPage() {
  const [tab, setTab] = useState('overview')
  const [selectedProg, setSelectedProg] = useState<string | null>(null)

  const { data: programs } = useQuery({
    queryKey: ['resp-programs'],
    queryFn: () => programsApi.getPrograms().then(r => r.data),
  })

  const { data: students } = useQuery({
    queryKey: ['resp-students'],
    queryFn: () => studentsApi.getStudents({ page_size: 5 }).then(r => r.data),
  })

  const { data: teachers } = useQuery({
    queryKey: ['resp-teachers'],
    queryFn: () => teachersApi.getTeachers({ page_size: 5 }).then(r => r.data),
  })

  const { data: maquette } = useQuery({
    queryKey: ['resp-maquette', selectedProg],
    queryFn: () => programsApi.getMaquette(selectedProg!).then(r => r.data),
    enabled: !!selectedProg,
  })

  const { data: results } = useQuery({
    queryKey: ['resp-results'],
    queryFn: () => api.get('/semester-results/', { params: { page_size: 10 } }).then(r => r.data),
  })

  const activeProgs = programs?.results?.filter((p: { status: string }) => p.status === 'active').length ?? 0
  const avgResult = results?.results?.length
    ? (results.results.reduce((s: number, r: { average: number | null }) => s + (r.average ?? 0), 0) / results.results.length).toFixed(2)
    : null

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Pilotage Pédagogique</h1>
        <p className="text-gray-400 text-sm mt-0.5">Vue d'ensemble des programmes et performances académiques</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Programmes" value={programs?.count ?? 0}
          icon={<BookMarked className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Actifs" value={activeProgs}
          icon={<Layers className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Étudiants" value={students?.count ?? 0}
          icon={<Users className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
        <StatsCard title="Moyenne générale" value={avgResult ? `${avgResult}/20` : '—'}
          icon={<TrendingUp className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
      </div>

      <Tabs
        tabs={[
          { key: 'overview', label: 'Vue d\'ensemble' },
          { key: 'maquette', label: 'Maquettes' },
          { key: 'results', label: 'Résultats' },
        ]}
        active={tab} onChange={setTab} variant="underline"
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card title="Programmes actifs">
            {!programs?.results?.length ? (
              <Alert type="info">Aucun programme.</Alert>
            ) : (
              <div className="space-y-2">
                {programs.results.map((p: { id: string; code: string; name: string; type_display: string; mode_display: string; status: string; capacity: number }) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-primary-50 transition-colors"
                    onClick={() => { setSelectedProg(p.id); setTab('maquette') }}>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                      <p className="text-xs font-mono text-primary-600">{p.code} · {p.type_display}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge label={p.status} className={statusColor(p.status)} dot />
                      <span className="text-xs text-gray-400">{p.capacity} places</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Corps enseignant">
            {!teachers?.results?.length ? (
              <Alert type="info">Aucun enseignant.</Alert>
            ) : (
              <div className="space-y-2">
                {teachers.results.map((t: { id: string; user: { full_name: string; email: string }; grade_display: string; status: string; department_name: string | null }) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{t.user.full_name}</p>
                      <p className="text-xs text-gray-400">{t.grade_display} · {t.department_name ?? '—'}</p>
                    </div>
                    <Badge label={t.status} className={statusColor(t.status)} dot />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'maquette' && (
        <div className="space-y-4">
          <div>
            <label className="label">Sélectionner un programme</label>
            <select className="input bg-white max-w-sm" value={selectedProg ?? ''}
              onChange={e => setSelectedProg(e.target.value)}>
              <option value="">— Choisir un programme —</option>
              {programs?.results?.map((p: { id: string; code: string; name: string }) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>

          {selectedProg && (
            !maquette ? <Spinner text="Chargement de la maquette..." /> :
              Array.isArray(maquette) && maquette.length > 0 ? maquette.map((sem: {
                id: string; label: string; total_credits: number
                ues: { id: string; code: string; name: string; credits: number; coefficient: number
                  ecs: { id: string; code: string; name: string; activity_type_display: string; volume_hours: number }[] }[]
              }) => (
                <div key={sem.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-primary-50 to-violet-50 px-5 py-3 flex justify-between items-center border-b border-primary-100">
                    <h4 className="font-bold text-primary-800">{sem.label}</h4>
                    <span className="text-xs font-semibold text-primary-600">{sem.total_credits} crédits</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {sem.ues?.map(ue => (
                      <div key={ue.id} className="px-5 py-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">{ue.code}</span>
                            <span className="font-semibold text-gray-900 text-sm">{ue.name}</span>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{ue.credits} cr.</span>
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Coef. {ue.coefficient}</span>
                          </div>
                        </div>
                        {ue.ecs?.length > 0 && (
                          <div className="ml-4 space-y-1">
                            {ue.ecs.map(ec => (
                              <div key={ec.id} className="flex justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                                <span><span className="font-mono font-semibold text-gray-700">{ec.code}</span> — {ec.name}</span>
                                <span className="text-gray-400">{ec.activity_type_display} · {ec.volume_hours}h</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )) : <Alert type="info">Aucune maquette définie pour ce programme.</Alert>
          )}
        </div>
      )}

      {tab === 'results' && (
        <Card title="Résultats semestriels récents" noPadding>
          {!results?.results?.length ? (
            <Empty message="Aucun résultat disponible" icon={<BarChart3 className="w-8 h-8" />} />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Étudiant</th><th>Semestre</th><th>Moyenne</th>
                    <th>Crédits</th><th>Décision</th><th>Publié</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((r: { id: string; student: string; semester_label: string; average: number | null; credits_obtained: number; decision_display: string; decision: string; published: boolean }) => (
                    <tr key={r.id}>
                      <td className="font-semibold text-sm">{r.student}</td>
                      <td className="text-sm text-gray-600">{r.semester_label}</td>
                      <td>
                        <span className={`font-bold text-sm ${(r.average ?? 0) >= 10 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {r.average ? `${Number(r.average).toFixed(2)}/20` : '—'}
                        </span>
                      </td>
                      <td className="text-sm">{r.credits_obtained} cr.</td>
                      <td><Badge label={r.decision_display} className={statusColor(r.decision)} /></td>
                      <td>
                        {r.published
                          ? <Badge label="Publié" className="badge-green" dot />
                          : <Badge label="Non publié" className="badge-gray" dot />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

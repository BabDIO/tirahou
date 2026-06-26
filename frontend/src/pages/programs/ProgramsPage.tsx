import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Eye, BookMarked, Layers, Users, Clock, GraduationCap } from 'lucide-react'
import { programsApi } from '../../api'
import { Button, Input, Badge, Spinner, Empty, Pagination, Modal, Card, StatsCard, Alert, Tabs } from '../../components/ui'
import { statusColor, formatCurrency } from '../../lib/utils'
import { useDebounce } from '../../hooks/useDebounce'
import ProgramCreateForm from '../../components/forms/ProgramCreateForm'
import type { Program } from '../../types'

const modeColor: Record<string, string> = {
  presentiel: 'badge-blue', distanciel: 'badge-yellow', hybride: 'badge-green',
}
const modeIcon: Record<string, string> = {
  presentiel: '🏫', distanciel: '💻', hybride: '🔀',
}
const typeColor: Record<string, string> = {
  licence: 'badge-blue', licence_pro: 'badge-purple', master: 'badge-green',
  doctorat: 'badge-yellow', du: 'badge-gray', certificat: 'badge-gray', micro_cert: 'badge-gray',
}

export default function ProgramsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 400)
  const [typeFilter, setTypeFilter] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  const [selected, setSelected] = useState<Program | null>(null)
  const [showMaquette, setShowMaquette] = useState(false)
  const [tab, setTab] = useState('table')

  const { data, isLoading } = useQuery({
    queryKey: ['programs', page, search, typeFilter, modeFilter],
    queryFn: () => programsApi.getPrograms({
      page, search,
      type: typeFilter || undefined,
      mode: modeFilter || undefined,
    }).then(r => r.data),
  })

  const { data: maquette, isLoading: maquetteLoading } = useQuery({
    queryKey: ['maquette', selected?.id],
    queryFn: () => programsApi.getMaquette(selected!.id).then(r => r.data),
    enabled: !!selected && showMaquette,
  })

  const actifs = data?.results?.filter(p => p.status === 'active').length ?? 0
  const hybrides = data?.results?.filter(p => p.mode === 'hybride').length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Programmes & Maquettes LMD</h1>
          <p className="text-gray-400 text-sm mt-0.5">{data?.count ?? 0} programme(s) enregistré(s)</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={() => setCreateOpen(true)}>Nouveau programme</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total programmes" value={data?.count ?? 0}
          icon={<BookMarked className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Programmes actifs" value={actifs}
          icon={<GraduationCap className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          subtitle="Ouverts aux inscriptions" />
        <StatsCard title="Mode hybride" value={hybrides}
          icon={<Layers className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600"
          subtitle="Présentiel + distanciel" />
      </div>

      {/* Filters + view toggle */}
      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par code, nom, département..." leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} className="input w-full sm:w-44">
            <option value="">Tous les types</option>
            <option value="licence">Licence</option>
            <option value="licence_pro">Licence Pro</option>
            <option value="master">Master</option>
            <option value="doctorat">Doctorat</option>
          </select>
          <select value={modeFilter} onChange={e => { setModeFilter(e.target.value); setPage(1) }} className="input w-full sm:w-40">
            <option value="">Tous les modes</option>
            <option value="presentiel">Présentiel</option>
            <option value="distanciel">Distanciel</option>
            <option value="hybride">Hybride</option>
          </select>
        </div>
        <div className="px-4 pb-3 border-t border-gray-50 pt-3">
          <Tabs tabs={[{ key: 'table', label: 'Tableau' }, { key: 'cards', label: 'Cartes' }]}
            active={tab} onChange={setTab} />
        </div>
      </Card>

      {/* Table view */}
      {tab === 'table' && (
        <Card noPadding>
          {isLoading ? <Spinner text="Chargement des programmes..." /> : !data?.results?.length ? (
            <Empty message="Aucun programme trouvé" icon={<BookMarked className="w-8 h-8" />} />
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Code</th><th>Programme</th><th>Type</th><th>Mode</th>
                      <th>Durée</th><th>Capacité</th><th>Frais</th><th>Statut</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.results?.map(prog => (
                      <tr key={prog.id}>
                        <td>
                          <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                            {prog.code}
                          </span>
                        </td>
                        <td>
                          <p className="font-semibold text-gray-900 text-sm">{prog.name}</p>
                          <p className="text-xs text-gray-400">{prog.department_name}</p>
                        </td>
                        <td><Badge label={prog.type_display} className={typeColor[prog.type] ?? 'badge-gray'} /></td>
                        <td>
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            {modeIcon[prog.mode]} {prog.mode_display}
                          </span>
                        </td>
                        <td className="text-sm text-gray-600">{prog.duration_semesters} sem.</td>
                        <td className="text-sm text-gray-600">{prog.capacity} pl.</td>
                        <td className="text-sm font-medium text-gray-800">{formatCurrency(prog.fees)}</td>
                        <td><Badge label={prog.status} className={statusColor(prog.status)} dot /></td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => { setSelected(prog); setShowMaquette(false) }} />
                            <Button variant="ghost" size="sm" icon={<Layers className="w-3.5 h-3.5" />}
                              onClick={() => { setSelected(prog); setShowMaquette(true) }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={data.count} pageSize={20} onChange={setPage} />
            </>
          )}
        </Card>
      )}

      {/* Cards view */}
      {tab === 'cards' && (
        isLoading ? <Spinner /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.results?.map(prog => (
              <div key={prog.id} className="card p-5 hover:shadow-md transition-all duration-200 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                    <BookMarked className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex gap-1.5">
                    <Badge label={prog.type_display} className={typeColor[prog.type] ?? 'badge-gray'} />
                    <Badge label={prog.status} className={statusColor(prog.status)} dot />
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-0.5">{prog.name}</h3>
                <p className="text-xs font-mono text-primary-600 mb-3">{prog.code}</p>
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-400">Durée</p>
                    <p className="text-xs font-bold text-gray-700">{prog.duration_semesters}S</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-400">Places</p>
                    <p className="text-xs font-bold text-gray-700">{prog.capacity}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-400">Mode</p>
                    <p className="text-xs">{modeIcon[prog.mode]}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" icon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => { setSelected(prog); setShowMaquette(false) }}>Détail</Button>
                  <Button variant="secondary" size="sm" className="flex-1" icon={<Layers className="w-3.5 h-3.5" />}
                    onClick={() => { setSelected(prog); setShowMaquette(true) }}>Maquette</Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Detail Modal */}
      <Modal open={!!selected && !showMaquette} onClose={() => setSelected(null)}
        title="Détail du programme" subtitle={selected?.code} size="md">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary-50 to-violet-50 rounded-2xl border border-primary-100">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookMarked className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{selected.name}</h3>
                <p className="text-xs font-mono text-primary-600">{selected.code}</p>
                <div className="flex gap-2 mt-1.5">
                  <Badge label={selected.type_display} className={typeColor[selected.type] ?? 'badge-gray'} />
                  <Badge label={selected.status} className={statusColor(selected.status)} dot />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Mode', `${modeIcon[selected.mode]} ${selected.mode_display}`],
                ['Durée', `${selected.duration_semesters} semestres`],
                ['Capacité', `${selected.capacity} places`],
                ['Frais', formatCurrency(selected.fees)],
                ['Département', selected.department_name],
                ['Candidature', selected.candidature_open ? '✅ Ouverte' : '🔒 Fermée'],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">{label}</p>
                  <p className="font-semibold text-gray-800 text-sm">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau programme" size="lg">
        <ProgramCreateForm onSuccess={() => setCreateOpen(false)} onCancel={() => setCreateOpen(false)} />
      </Modal>

      {/* Maquette Modal */}
      <Modal open={!!selected && showMaquette}
        onClose={() => { setSelected(null); setShowMaquette(false) }}
        title={`Maquette pédagogique`} subtitle={selected?.name} size="xl">
        {maquetteLoading ? <Spinner text="Chargement de la maquette..." /> : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {Array.isArray(maquette) && maquette.length > 0 ? maquette.map((sem: {
              id: string; label: string; total_credits: number
              ues: { id: string; code: string; name: string; credits: number; coefficient: number
                ecs: { id: string; code: string; name: string; activity_type_display: string; volume_hours: number }[] }[]
            }) => (
              <div key={sem.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-primary-50 to-violet-50 px-5 py-3 flex justify-between items-center border-b border-primary-100">
                  <h4 className="font-bold text-primary-800 text-sm">{sem.label}</h4>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-primary-400" />
                    <span className="text-xs font-semibold text-primary-600">{sem.total_credits} crédits</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {sem.ues?.map(ue => (
                    <div key={ue.id} className="px-5 py-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">{ue.code}</span>
                          <span className="font-semibold text-gray-900 text-sm">{ue.name}</span>
                        </div>
                        <div className="flex gap-2 text-xs text-gray-400 flex-shrink-0">
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{ue.credits} cr.</span>
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Coef. {ue.coefficient}</span>
                        </div>
                      </div>
                      {ue.ecs?.length > 0 && (
                        <div className="ml-4 space-y-1">
                          {ue.ecs.map(ec => (
                            <div key={ec.id} className="flex justify-between items-center text-xs bg-gray-50 rounded-lg px-3 py-2">
                              <span>
                                <span className="font-mono font-semibold text-gray-700">{ec.code}</span>
                                <span className="text-gray-500 ml-2">{ec.name}</span>
                              </span>
                              <span className="text-gray-400 flex-shrink-0 ml-4">
                                {ec.activity_type_display} · <span className="font-medium">{ec.volume_hours}h</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <Alert type="info">Aucune maquette définie pour ce programme.</Alert>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

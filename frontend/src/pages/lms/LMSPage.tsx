import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, BookOpen, Plus, Eye, Globe, Lock, Users, Clock } from 'lucide-react'
import { lmsApi } from '../../api'
import { Button, Input, Badge, Spinner, Empty, Pagination, Card, StatsCard, Modal, Progress, Alert } from '../../components/ui'
import { useToast } from '../../hooks/useToast'
import type { CourseSpace } from '../../types'

const modeColor: Record<string, string> = {
  presentiel: 'badge-blue', distanciel_sync: 'badge-yellow',
  distanciel_async: 'badge-gray', hybride: 'badge-green', comodal: 'badge-purple',
}
const modeIcon: Record<string, string> = {
  presentiel: '🏫', distanciel_sync: '📡', distanciel_async: '⏱', hybride: '🔀', comodal: '🎯',
}

export default function LMSPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  const [selected, setSelected] = useState<CourseSpace | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['course-spaces', page, search, modeFilter],
    queryFn: () => lmsApi.getCourseSpaces({ page, search, mode: modeFilter || undefined }).then(r => r.data),
  })

  const publish = useMutation({
    mutationFn: (id: string) => lmsApi.publishCourseSpace(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course-spaces'] }),
  })

  const { data: detail } = useQuery({
    queryKey: ['course-space-detail', selected?.id],
    queryFn: () => lmsApi.getCourseSpace(selected!.id).then(r => r.data),
    enabled: !!selected,
  })

  const published = data?.results?.filter(c => c.is_published).length ?? 0
  const hybrides = data?.results?.filter(c => c.mode === 'hybride').length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Campus Virtuel — LMS</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">{data?.count ?? 0} espace(s) de cours</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={() => setCreateOpen(true)}>Nouvel espace</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total espaces" value={data?.count ?? 0}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Publiés" value={published}
          icon={<Globe className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          subtitle="Accessibles aux étudiants" />
        <StatsCard title="Mode hybride" value={hybrides}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600"
          subtitle="Présentiel + distanciel" />
      </div>

      {/* Filters */}
      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par titre, code UE, enseignant..." leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
          <select value={modeFilter} onChange={e => { setModeFilter(e.target.value); setPage(1) }} className="input w-full sm:w-48">
            <option value="">Tous les modes</option>
            <option value="presentiel">Présentiel</option>
            <option value="distanciel_sync">Distanciel synchrone</option>
            <option value="distanciel_async">Distanciel asynchrone</option>
            <option value="hybride">Hybride</option>
            <option value="comodal">Comodal</option>
          </select>
        </div>
      </Card>

      {/* Cards grid */}
      {isLoading ? <Spinner text="Chargement des espaces de cours..." /> :
        !data?.results?.length ? (
          <Empty message="Aucun espace de cours" icon={<BookOpen className="w-8 h-8" />}
            description="Créez votre premier espace de cours" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.results?.map(space => (
                <CourseCard
                  key={space.id}
                  space={space}
                  onView={() => setSelected(space)}
                  onPublish={() => publish.mutate(space.id)}
                  publishing={publish.isPending}
                />
              ))}
            </div>
            {data.count > 20 && (
              <Pagination page={page} total={data.count} pageSize={20} onChange={setPage} />
            )}
          </>
        )
      }

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={selected?.title ?? ''} subtitle={`${selected?.ue_code} — ${selected?.ue_name}`} size="xl">
        {detail ? <CourseDetail detail={detail} /> : <Spinner />}
      </Modal>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvel espace de cours" size="lg">
        <CourseSpaceCreateForm onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['course-spaces'] }) }} onCancel={() => setCreateOpen(false)} />
      </Modal>
    </div>
  )
}

function CourseCard({ space, onView, onPublish, publishing }: {
  space: CourseSpace; onView: () => void; onPublish: () => void; publishing: boolean
}) {
  const { data: progressData } = useQuery({
    queryKey: ['space-progress', space.id],
    queryFn: () => import('../../api').then(({ lmsApi }) => lmsApi.getMyProgress(space.id).then(r => r.data)),
    retry: false,
  })
  const completionRate = progressData?.completion_rate ?? 0

  return (
    <div className="card p-5 hover:shadow-md transition-all duration-200 group flex flex-col">
      {/* Top */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
          space.is_published ? 'bg-emerald-50' : 'bg-gray-100'
        }`}>
          {modeIcon[space.mode] ?? '📚'}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge label={space.mode_display} className={modeColor[space.mode] ?? 'badge-gray'} />
          {space.is_published
            ? <Badge label="Publié" className="badge-green" dot />
            : <Badge label="Brouillon" className="badge-gray" dot />
          }
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="font-bold text-gray-900 dark:text-gray-50 text-sm line-clamp-2 mb-1">{space.title}</h3>
        <p className="text-xs font-mono text-primary-600 mb-3">{space.ue_code} — {space.ue_name}</p>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Complétion</span>
            <span className="font-medium text-gray-600 dark:text-gray-400">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${completionRate >= 70 ? 'bg-emerald-500' : completionRate >= 40 ? 'bg-amber-500' : 'bg-primary-500'}`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <Button variant="secondary" size="sm" className="flex-1" icon={<Eye className="w-3.5 h-3.5" />}
          onClick={onView}>Détail</Button>
        {!space.is_published ? (
          <Button size="sm" className="flex-1" loading={publishing}
            icon={<Globe className="w-3.5 h-3.5" />} onClick={onPublish}>Publier</Button>
        ) : (
          <Button variant="ghost" size="sm" className="flex-1" icon={<Lock className="w-3.5 h-3.5" />}>
            Dépublier
          </Button>
        )}
      </div>
    </div>
  )
}

function CourseDetail({ detail }: { detail: CourseSpace & { modules?: { id: string; title: string; order: number; is_published: boolean; resources?: { id: string; title: string; type: string }[] }[] } }) {
  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      {/* Header info */}
      <div className="flex gap-2 flex-wrap">
        <Badge label={detail.mode_display} className={modeColor[detail.mode] ?? 'badge-gray'} />
        <Badge label={detail.is_published ? 'Publié' : 'Brouillon'}
          className={detail.is_published ? 'badge-green' : 'badge-gray'} dot />
      </div>

      {/* Modules */}
      {detail.modules?.length ? detail.modules.map(mod => (
        <div key={mod.id} className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-5 py-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center text-xs font-bold">
                {mod.order}
              </span>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{mod.title}</h4>
            </div>
            <Badge label={mod.is_published ? 'Publié' : 'Brouillon'}
              className={mod.is_published ? 'badge-green' : 'badge-gray'} />
          </div>
          {mod.resources && mod.resources.length > 0 && (
            <div className="divide-y divide-gray-50">
              {mod.resources.map(res => (
                <div key={res.id} className="px-5 py-2.5 flex justify-between items-center text-sm hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{
                      res.type === 'pdf' ? '📄' : res.type === 'video' ? '🎬' :
                      res.type === 'ppt' ? '📊' : res.type === 'link' ? '🔗' : '📁'
                    }</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{res.title}</span>
                  </div>
                  <Badge label={res.type.toUpperCase()} className="badge-blue" />
                </div>
              ))}
            </div>
          )}
          {(!mod.resources || mod.resources.length === 0) && (
            <p className="px-5 py-3 text-xs text-gray-400 dark:text-gray-500 italic">Aucune ressource dans ce module</p>
          )}
        </div>
      )) : (
        <Alert type="info">Aucun module dans cet espace de cours.</Alert>
      )}
    </div>
  )
}

function CourseSpaceCreateForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ ue: '', academic_year: '', title: '', mode: 'hybride', description: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const { data: ues } = useQuery({
    queryKey: ['ues-list'],
    queryFn: () => import('../../api').then(({ programsApi }) => programsApi.getUEs({ page_size: 200 }).then(r => r.data)),
  })
  const { data: years } = useQuery({
    queryKey: ['academic-years-list'],
    queryFn: () => import('../../api').then(({ academicApi }) => academicApi.getAcademicYears().then(r => r.data)),
  })

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.ue) errs.ue = 'UE requise'
    if (!form.academic_year) errs.academic_year = 'Année académique requise'
    if (!form.title.trim()) errs.title = 'Titre requis'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await import('../../api').then(({ lmsApi }) => lmsApi.createCourseSpace(form))
      toast.success('Espace de cours créé')
      onSuccess()
    } catch {
      toast.error('Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Unité d'Enseignement (UE) *</label>
        <select className={`input bg-white dark:bg-slate-900 ${errors.ue ? 'border-red-400' : ''}`}
          value={form.ue} onChange={e => set('ue', e.target.value)}>
          <option value="">— Sélectionner une UE —</option>
          {ues?.results.map((u: { id: string; code: string; name: string }) => (
            <option key={u.id} value={u.id}>{u.code} — {u.name}</option>
          ))}
        </select>
        {errors.ue && <p className="mt-1 text-xs text-red-600">{errors.ue}</p>}
      </div>
      <div>
        <label className="label">Année académique *</label>
        <select className={`input bg-white dark:bg-slate-900 ${errors.academic_year ? 'border-red-400' : ''}`}
          value={form.academic_year} onChange={e => set('academic_year', e.target.value)}>
          <option value="">— Sélectionner —</option>
          {years?.results.map((y: { id: string; label: string; is_current: boolean }) => (
            <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' (en cours)' : ''}</option>
          ))}
        </select>
        {errors.academic_year && <p className="mt-1 text-xs text-red-600">{errors.academic_year}</p>}
      </div>
      <div>
        <label className="label">Titre de l'espace *</label>
        <input className={`input ${errors.title ? 'border-red-400' : ''}`}
          placeholder="Ex: Algorithmique — L2 Info 2024-2025"
          value={form.title} onChange={e => set('title', e.target.value)} />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
      </div>
      <div>
        <label className="label">Mode d'enseignement</label>
        <select className="input bg-white dark:bg-slate-900" value={form.mode} onChange={e => set('mode', e.target.value)}>
          <option value="presentiel">Présentiel</option>
          <option value="distanciel_sync">Distanciel Synchrone</option>
          <option value="distanciel_async">Distanciel Asynchrone</option>
          <option value="hybride">Hybride</option>
          <option value="comodal">Comodal</option>
        </select>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input min-h-[70px] resize-none" placeholder="Description du cours..."
          value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={loading} icon={<BookOpen className="w-4 h-4" />}>
          Créer l'espace
        </Button>
      </div>
    </form>
  )
}

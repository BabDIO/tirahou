import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, BookOpen, Upload, Download, Eye, Filter } from 'lucide-react'
import { Button, Input, Badge, Spinner, Empty, Card, StatsCard, Modal, Alert } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import api from '../../lib/axios'

const docTypeColor: Record<string, string> = {
  livre: 'badge-blue', memoire: 'badge-purple', these: 'badge-yellow',
  article: 'badge-green', guide: 'badge-gray', rapport: 'badge-gray',
}
const docTypeIcon: Record<string, string> = {
  livre: '📚', memoire: '📝', these: '🎓', article: '📄', guide: '📋', rapport: '📊',
}

export default function LibraryPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selected, setSelected] = useState<null | {
    id: string; title: string; author: string; type: string; type_display: string;
    domain: string; year: number; file_url: string; abstract: string;
    download_count: number; created_at: string
  }>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['library', search, typeFilter, domainFilter],
    queryFn: () => api.get('/library/', { params: { search, type: typeFilter || undefined, domain: domainFilter || undefined } }).then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['library-stats'],
    queryFn: () => api.get('/library/stats/').then(r => r.data),
  })

  const docs = data?.results ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Bibliothèque Numérique</h1>
          <p className="text-gray-400 text-sm mt-0.5">{data?.count ?? 0} ressource(s) disponible(s)</p>
        </div>
        <Button icon={<Upload className="w-4 h-4" />} size="sm" onClick={() => setUploadOpen(true)}>
          Déposer une ressource
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Total ressources" value={data?.count ?? 0}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Livres" value={stats?.livres ?? 0}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatsCard title="Mémoires / Thèses" value={(stats?.memoires ?? 0) + (stats?.theses ?? 0)}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
        <StatsCard title="Téléchargements" value={stats?.total_downloads ?? 0}
          icon={<Download className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
      </div>

      {/* Filters */}
      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par titre, auteur, mots-clés..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input w-full sm:w-44">
            <option value="">Tous les types</option>
            <option value="livre">Livre</option>
            <option value="memoire">Mémoire</option>
            <option value="these">Thèse</option>
            <option value="article">Article</option>
            <option value="guide">Guide</option>
            <option value="rapport">Rapport</option>
          </select>
          <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)} className="input w-full sm:w-44">
            <option value="">Tous les domaines</option>
            <option value="informatique">Informatique</option>
            <option value="mathematiques">Mathématiques</option>
            <option value="physique">Physique</option>
            <option value="gestion">Gestion</option>
            <option value="droit">Droit</option>
            <option value="medecine">Médecine</option>
          </select>
        </div>
      </Card>

      {/* Grid */}
      {isLoading ? <Spinner text="Chargement de la bibliothèque..." /> :
        !docs.length ? (
          <Empty message="Aucune ressource trouvée" icon={<BookOpen className="w-8 h-8" />}
            description="Déposez la première ressource de la bibliothèque"
            action={<Button size="sm" icon={<Upload className="w-4 h-4" />} onClick={() => setUploadOpen(true)}>Déposer</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {docs.map((doc: {
              id: string; title: string; author: string; type: string; type_display: string;
              domain: string; year: number; file_url: string; abstract: string;
              download_count: number; created_at: string
            }) => (
              <div key={doc.id} className="card p-4 hover:shadow-md transition-all duration-200 group flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{docTypeIcon[doc.type] ?? '📄'}</span>
                  <Badge label={doc.type_display} className={docTypeColor[doc.type] ?? 'badge-gray'} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1 flex-1">{doc.title}</h3>
                <p className="text-xs text-gray-500 mb-1">{doc.author}</p>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>{doc.domain}</span>
                  <span>{doc.year}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                  <Download className="w-3 h-3" />
                  <span>{doc.download_count} téléchargement(s)</span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Button variant="secondary" size="sm" className="flex-1" icon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => setSelected(doc)}>Détail</Button>
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noreferrer">
                      <Button size="sm" icon={<Download className="w-3.5 h-3.5" />} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={selected?.title ?? ''} subtitle={selected?.author} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge label={selected.type_display} className={docTypeColor[selected.type] ?? 'badge-gray'} />
              <Badge label={selected.domain} className="badge-blue" />
              <Badge label={String(selected.year)} className="badge-gray" />
            </div>
            {selected.abstract && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Résumé</p>
                <p className="text-sm text-gray-700 leading-relaxed">{selected.abstract}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Auteur', selected.author],
                ['Domaine', selected.domain],
                ['Année', String(selected.year)],
                ['Téléchargements', String(selected.download_count)],
                ['Ajouté le', formatDate(selected.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">{label}</p>
                  <p className="font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
            {selected.file_url && (
              <a href={selected.file_url} target="_blank" rel="noreferrer">
                <Button className="w-full" icon={<Download className="w-4 h-4" />}>
                  Télécharger / Consulter
                </Button>
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)}
        title="Déposer une ressource" subtitle="Bibliothèque numérique" size="md">
        <LibraryUploadForm onSuccess={() => setUploadOpen(false)} />
      </Modal>
    </div>
  )
}

function LibraryUploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ title: '', author: '', type: 'livre', domain: '', year: new Date().getFullYear(), abstract: '' })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title || !form.author) { setError('Titre et auteur requis'); return }
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
      if (file) fd.append('file', file)
      await api.post('/library/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onSuccess()
    } catch { setError('Erreur lors du dépôt.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Titre</label>
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Titre complet" />
        </div>
        <div>
          <label className="label">Auteur(s)</label>
          <input className="input" value={form.author} onChange={e => set('author', e.target.value)} placeholder="Nom Prénom" />
        </div>
        <div>
          <label className="label">Année</label>
          <input type="number" className="input" value={form.year} onChange={e => set('year', Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input bg-white" value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="livre">Livre</option>
            <option value="memoire">Mémoire</option>
            <option value="these">Thèse</option>
            <option value="article">Article</option>
            <option value="guide">Guide</option>
            <option value="rapport">Rapport</option>
          </select>
        </div>
        <div>
          <label className="label">Domaine</label>
          <input className="input" value={form.domain} onChange={e => set('domain', e.target.value)} placeholder="Ex: Informatique" />
        </div>
        <div className="col-span-2">
          <label className="label">Résumé (optionnel)</label>
          <textarea className="input min-h-[70px] resize-none" value={form.abstract}
            onChange={e => set('abstract', e.target.value)} placeholder="Résumé du document..." />
        </div>
        <div className="col-span-2">
          <label className="label">Fichier PDF</label>
          <input type="file" className="input py-1.5" accept=".pdf,.epub,.doc,.docx"
            onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Upload className="w-4 h-4" />}>
        Déposer dans la bibliothèque
      </Button>
    </div>
  )
}

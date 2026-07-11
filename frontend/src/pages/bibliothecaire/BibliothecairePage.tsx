import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, BookOpen, Upload, Download, Edit, Star, BarChart3, Trash2 } from 'lucide-react'
import { Button, Input, Badge, Spinner, Empty, Pagination, Card, StatsCard, Modal, Alert } from '../../components/ui'
import { libraryApi } from '../../api'
import { formatDate } from '../../lib/utils'
import type { LibraryDocument } from '../../types'
import api from '../../lib/axios'

const typeColor: Record<string, string> = {
  livre: 'badge-blue', memoire: 'badge-purple', these: 'badge-yellow',
  article: 'badge-green', guide: 'badge-gray', rapport: 'badge-gray',
}

export default function BibliothecairePage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<LibraryDocument | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['biblio-docs', page, search, typeFilter],
    queryFn: () => libraryApi.getDocuments({ page, search, type: typeFilter || undefined }).then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['biblio-stats'],
    queryFn: () => libraryApi.getStats().then(r => r.data),
  })

  const toggleFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      libraryApi.updateDocument(id, { is_featured: featured }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['biblio-docs'] }),
  })

  const deleteDoc = useMutation({
    mutationFn: (id: string) => libraryApi.deleteDocument(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['biblio-docs'] }),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Gestion de la Bibliothèque</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Administration du fonds documentaire numérique</p>
        </div>
        <Button icon={<Upload className="w-4 h-4" />} size="sm" onClick={() => setUploadOpen(true)}>
          Ajouter un document
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Total documents" value={stats?.total ?? 0}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Livres" value={stats?.livres ?? 0}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatsCard title="Mémoires & Thèses" value={(stats?.memoires ?? 0) + (stats?.theses ?? 0)}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
        <StatsCard title="Téléchargements" value={stats?.total_downloads ?? 0}
          icon={<Download className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
      </div>

      {/* Stats by domain */}
      {stats?.by_domain?.length > 0 && (
        <Card title="Répartition par domaine" subtitle="Top 10 domaines">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {stats.by_domain.map((d: { domain: string; count: number }) => (
              <div key={d.domain} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{d.count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{d.domain || 'Non classé'}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par titre, auteur, mots-clés..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} className="input w-full sm:w-44">
            <option value="">Tous les types</option>
            <option value="livre">Livre</option>
            <option value="memoire">Mémoire</option>
            <option value="these">Thèse</option>
            <option value="article">Article</option>
            <option value="guide">Guide</option>
            <option value="rapport">Rapport</option>
          </select>
        </div>

        {isLoading ? <Spinner text="Chargement..." /> : !data?.results?.length ? (
          <Empty message="Aucun document" icon={<BookOpen className="w-8 h-8" />} />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Document</th><th>Auteur</th><th>Type</th><th>Domaine</th>
                    <th>Année</th><th>Téléch.</th><th>Mis en avant</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results?.map((doc: LibraryDocument) => (
                    <tr key={doc.id}>
                      <td className="font-semibold text-sm max-w-xs truncate">{doc.title}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{doc.author}</td>
                      <td><Badge label={doc.type_display} className={typeColor[doc.type] ?? 'badge-gray'} /></td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{doc.domain || '—'}</td>
                      <td className="text-sm">{doc.year}</td>
                      <td className="text-sm font-medium">{doc.download_count}</td>
                      <td>
                        <button onClick={() => toggleFeatured.mutate({ id: doc.id, featured: !doc.is_featured })}
                          className={`p-1.5 rounded-lg transition-colors ${doc.is_featured ? 'text-amber-500 bg-amber-50' : 'text-gray-300 hover:text-amber-400'}`}>
                          <Star className="w-4 h-4" fill={doc.is_featured ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" icon={<Edit className="w-3.5 h-3.5" />}
                            onClick={() => setEditDoc(doc)} />
                          {doc.file_url && (
                            <a href={doc.file_url} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="sm" icon={<Download className="w-3.5 h-3.5" />} />
                            </a>
                          )}
                          <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                            loading={deleteDoc.isPending}
                            onClick={() => { if (confirm('Supprimer ce document ?')) deleteDoc.mutate(doc.id) }} />
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

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Ajouter un document" size="md">
        <LibraryDocForm
          onSuccess={() => { setUploadOpen(false); queryClient.invalidateQueries({ queryKey: ['biblio-docs', 'biblio-stats'] }) }}
        />
      </Modal>

      <Modal open={!!editDoc} onClose={() => setEditDoc(null)} title="Modifier le document" subtitle={editDoc?.title} size="md">
        {editDoc && (
          <LibraryDocForm
            doc={editDoc}
            onSuccess={() => { setEditDoc(null); queryClient.invalidateQueries({ queryKey: ['biblio-docs'] }) }}
          />
        )}
      </Modal>
    </div>
  )
}

function LibraryDocForm({ doc, onSuccess }: { doc?: LibraryDocument; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: doc?.title ?? '',
    author: doc?.author ?? '',
    type: doc?.type ?? 'livre',
    domain: doc?.domain ?? '',
    year: doc?.year ?? new Date().getFullYear(),
    abstract: doc?.abstract ?? '',
    keywords: doc?.keywords ?? '',
    access_level: doc?.access_level ?? 'authenticated',
  })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title || !form.author) { setError('Titre et auteur requis'); return }
    setLoading(true); setError('')
    try {
      if (doc) {
        await libraryApi.updateDocument(doc.id, form)
      } else {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
        if (file) fd.append('file', file)
        await libraryApi.uploadDocument(fd)
      }
      onSuccess()
    } catch { setError('Erreur lors de l\'enregistrement.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Titre *</label>
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label className="label">Auteur(s) *</label>
          <input className="input" value={form.author} onChange={e => set('author', e.target.value)} />
        </div>
        <div>
          <label className="label">Année</label>
          <input type="number" className="input" value={form.year} onChange={e => set('year', Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input bg-white dark:bg-slate-900" value={form.type} onChange={e => set('type', e.target.value)}>
            {['livre','memoire','these','article','guide','rapport'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Domaine</label>
          <input className="input" value={form.domain} onChange={e => set('domain', e.target.value)} placeholder="Ex: Informatique" />
        </div>
        <div>
          <label className="label">Accès</label>
          <select className="input bg-white dark:bg-slate-900" value={form.access_level} onChange={e => set('access_level', e.target.value)}>
            <option value="public">Public</option>
            <option value="authenticated">Authentifié</option>
            <option value="restricted">Restreint</option>
          </select>
        </div>
        <div>
          <label className="label">Mots-clés</label>
          <input className="input" value={form.keywords} onChange={e => set('keywords', e.target.value)} placeholder="mot1, mot2..." />
        </div>
        <div className="col-span-2">
          <label className="label">Résumé</label>
          <textarea className="input min-h-[60px] resize-none" value={form.abstract}
            onChange={e => set('abstract', e.target.value)} />
        </div>
        {!doc && (
          <div className="col-span-2">
            <label className="label">Fichier PDF</label>
            <input type="file" className="input py-1.5" accept=".pdf,.epub,.doc,.docx"
              onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
        )}
      </div>
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<Upload className="w-4 h-4" />}>
        {doc ? 'Mettre à jour' : 'Ajouter à la bibliothèque'}
      </Button>
    </div>
  )
}

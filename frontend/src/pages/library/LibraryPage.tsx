import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, BookOpen, Upload, Download, Eye, Star, BookmarkPlus, Clock,
  CheckCircle, Bell, X, ListPlus,
} from 'lucide-react'
import { Button, Input, Badge, Spinner, Empty, Card, StatsCard, Modal, Alert, Tabs } from '../../components/ui'
import { formatDate, cn } from '../../lib/utils'
import { libraryApi } from '../../api'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

const docTypeColor: Record<string, string> = {
  livre: 'badge-blue', memoire: 'badge-purple', these: 'badge-yellow',
  article: 'badge-green', guide: 'badge-gray', rapport: 'badge-gray',
}
const docTypeIcon: Record<string, string> = {
  livre: '📚', memoire: '📝', these: '🎓', article: '📄', guide: '📋', rapport: '📊',
}

interface LibraryDoc {
  id: string; title: string; author: string; type: string; type_display: string;
  domain: string; year: number; file_url: string; abstract: string;
  download_count: number; created_at: string; status: string;
  available_quantity: number; quantity: number; rating: string; rating_count: number;
}

export default function LibraryPage() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<'catalog' | 'borrowings' | 'reservations' | 'lists'>('catalog')
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [typeFilter, setTypeFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selected, setSelected] = useState<LibraryDoc | null>(null)
  const [addToListDoc, setAddToListDoc] = useState<LibraryDoc | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['library', search, typeFilter, domainFilter],
    queryFn: () => api.get('/library/', { params: { search, type: typeFilter || undefined, domain: domainFilter || undefined } }).then(r => r.data),
    enabled: tab === 'catalog',
  })

  const { data: stats } = useQuery({
    queryKey: ['library-stats'],
    queryFn: () => api.get('/library/stats/').then(r => r.data),
  })

  const { data: myBorrowings, isLoading: loadingBorrowings } = useQuery({
    queryKey: ['my-borrowings'],
    queryFn: () => libraryApi.getMyBorrowings().then(r => r.data),
    enabled: tab === 'borrowings',
  })

  const { data: myReservations, isLoading: loadingReservations } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => libraryApi.getMyReservations().then(r => r.data),
    enabled: tab === 'reservations',
  })

  const { data: myLists, isLoading: loadingLists } = useQuery({
    queryKey: ['my-reading-lists'],
    queryFn: () => libraryApi.getReadingLists().then(r => r.data.results ?? r.data),
    enabled: tab === 'lists',
  })

  const borrowMut = useMutation({
    mutationFn: (id: string) => libraryApi.borrowDocument(id),
    onSuccess: () => {
      toast.success('Emprunt enregistré — bonne lecture !')
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['my-borrowings'] })
      setSelected(null)
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(message ?? 'Erreur lors de l\'emprunt')
    },
  })

  const reserveMut = useMutation({
    mutationFn: (id: string) => libraryApi.reserveDocument(id),
    onSuccess: (res) => {
      toast.success(`Réservation confirmée — position ${res.data.position} dans la file`)
      qc.invalidateQueries({ queryKey: ['my-reservations'] })
      setSelected(null)
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(message ?? 'Erreur lors de la réservation')
    },
  })

  const cancelReservationMut = useMutation({
    mutationFn: (id: string) => libraryApi.cancelReservation(id),
    onSuccess: () => {
      toast.success('Réservation annulée')
      qc.invalidateQueries({ queryKey: ['my-reservations'] })
    },
  })

  const createListMut = useMutation({
    mutationFn: (name: string) => libraryApi.createReadingList({ name }),
    onSuccess: () => {
      toast.success('Liste créée')
      qc.invalidateQueries({ queryKey: ['my-reading-lists'] })
    },
  })

  const addToListMut = useMutation({
    mutationFn: ({ listId, docId }: { listId: string; docId: string }) => libraryApi.addToReadingList(listId, docId),
    onSuccess: () => {
      toast.success('Ajouté à la liste')
      qc.invalidateQueries({ queryKey: ['my-reading-lists'] })
      setAddToListDoc(null)
    },
  })

  const docs = data?.results ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Bibliothèque Numérique</h1>
          <p className="text-gray-400 text-sm mt-0.5">{data?.count ?? 0} ressource(s) disponible(s)</p>
        </div>
        {tab === 'catalog' && (
          <Button icon={<Upload className="w-4 h-4" />} size="sm" onClick={() => setUploadOpen(true)}>
            Déposer une ressource
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Total ressources" value={data?.count ?? stats?.total ?? 0}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Livres" value={stats?.livres ?? 0}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatsCard title="Mémoires / Thèses" value={(stats?.memoires ?? 0) + (stats?.theses ?? 0)}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
        <StatsCard title="Téléchargements" value={stats?.total_downloads ?? 0}
          icon={<Download className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
      </div>

      <Tabs
        tabs={[
          { key: 'catalog', label: 'Catalogue', icon: <BookOpen className="w-4 h-4" /> },
          { key: 'borrowings', label: 'Mes emprunts', icon: <Clock className="w-4 h-4" /> },
          { key: 'reservations', label: 'Mes réservations', icon: <Bell className="w-4 h-4" /> },
          { key: 'lists', label: 'Mes listes de lecture', icon: <ListPlus className="w-4 h-4" /> },
        ]}
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
        variant="underline"
      />

      {tab === 'catalog' && (
        <>
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
                {docs.map((doc: LibraryDoc) => {
                  const isAvailable = doc.available_quantity > 0
                  return (
                    <div key={doc.id} className="card p-4 hover:shadow-md transition-all duration-200 group flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-3xl">{docTypeIcon[doc.type] ?? '📄'}</span>
                        <Badge label={doc.type_display} className={docTypeColor[doc.type] ?? 'badge-gray'} />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1 flex-1">{doc.title}</h3>
                      <p className="text-xs text-gray-500 mb-1">{doc.author}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>{doc.domain}</span>
                        <span>{doc.year}</span>
                      </div>
                      {Number(doc.rating_count) > 0 && (
                        <div className="flex items-center gap-1 text-xs text-amber-500 mb-2">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{Number(doc.rating).toFixed(1)} ({doc.rating_count})</span>
                        </div>
                      )}
                      <div className="mb-3">
                        {isAvailable ? (
                          <Badge label="Disponible" className="badge-green" dot />
                        ) : (
                          <Badge label="Emprunté" className="badge-red" dot />
                        )}
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <Button variant="secondary" size="sm" className="flex-1" icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => setSelected(doc)}>Détail</Button>
                        <Button size="sm" icon={<BookmarkPlus className="w-3.5 h-3.5" />} onClick={() => setAddToListDoc(doc)} />
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noreferrer">
                            <Button size="sm" icon={<Download className="w-3.5 h-3.5" />} />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </>
      )}

      {tab === 'borrowings' && (
        loadingBorrowings ? <Spinner text="Chargement de vos emprunts..." /> : (
          <Card>
            {!myBorrowings || myBorrowings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Vous n'avez aucun emprunt en cours.</p>
            ) : (
              <div className="space-y-3">
                {myBorrowings.map((b: { id: string; document: { title: string; author: string; cover: string | null }; borrowed_at: string; due_date: string; late_days: number; penalty_amount: number; status: string }) => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{b.document.title}</p>
                      <p className="text-xs text-gray-500">{b.document.author} • Retour prévu le {formatDate(b.due_date)}</p>
                      {b.penalty_amount > 0 && (
                        <p className="text-xs text-red-600 mt-1">Pénalité : {b.penalty_amount} FCFA ({b.late_days}j de retard)</p>
                      )}
                    </div>
                    <Badge label={b.late_days > 0 ? 'En retard' : 'En cours'} className={b.late_days > 0 ? 'badge-red' : 'badge-blue'} dot />
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      )}

      {tab === 'reservations' && (
        loadingReservations ? <Spinner text="Chargement de vos réservations..." /> : (
          <Card>
            {!myReservations || myReservations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Vous n'avez aucune réservation en attente.</p>
            ) : (
              <div className="space-y-3">
                {myReservations.map((r: { id: string; document: { title: string; author: string }; position: number; status: string }) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.document.title}</p>
                      <p className="text-xs text-gray-500">{r.document.author} • Position {r.position} dans la file</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge label={r.status === 'disponible' ? 'Disponible' : 'En attente'} className={r.status === 'disponible' ? 'badge-green' : 'badge-amber'} dot />
                      <button onClick={() => cancelReservationMut.mutate(r.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Annuler">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      )}

      {tab === 'lists' && (
        loadingLists ? <Spinner text="Chargement de vos listes..." /> : (
          <div className="space-y-4">
            <Button size="sm" icon={<ListPlus className="w-4 h-4" />}
              onClick={() => {
                const name = window.prompt('Nom de la nouvelle liste de lecture')
                if (name) createListMut.mutate(name)
              }}>
              Nouvelle liste
            </Button>
            {(!myLists || myLists.length === 0) ? (
              <Card><p className="text-sm text-gray-400 text-center py-8">Aucune liste de lecture pour le moment.</p></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myLists.map((list: { id: string; name: string; description: string; documents_count: number }) => (
                  <Card key={list.id} title={list.name} subtitle={`${list.documents_count} document(s)`}>
                    <p className="text-sm text-gray-500">{list.description || 'Aucune description'}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={selected?.title ?? ''} subtitle={selected?.author} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap items-center">
              <Badge label={selected.type_display} className={docTypeColor[selected.type] ?? 'badge-gray'} />
              <Badge label={selected.domain} className="badge-blue" />
              <Badge label={String(selected.year)} className="badge-gray" />
              {selected.available_quantity > 0 ? (
                <Badge label="Disponible" className="badge-green" dot />
              ) : (
                <Badge label="Emprunté" className="badge-red" dot />
              )}
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
            <RatingWidget documentId={selected.id} />
            <div className="flex gap-2">
              {selected.available_quantity > 0 ? (
                <Button className="flex-1" icon={<CheckCircle className="w-4 h-4" />}
                  loading={borrowMut.isPending} onClick={() => borrowMut.mutate(selected.id)}>
                  Emprunter
                </Button>
              ) : (
                <Button className="flex-1" variant="secondary" icon={<Bell className="w-4 h-4" />}
                  loading={reserveMut.isPending} onClick={() => reserveMut.mutate(selected.id)}>
                  Réserver
                </Button>
              )}
              {selected.file_url && (
                <a href={selected.file_url} target="_blank" rel="noreferrer" className="flex-1">
                  <Button className="w-full" variant="secondary" icon={<Download className="w-4 h-4" />}>
                    Consulter
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add to reading list modal */}
      <Modal open={!!addToListDoc} onClose={() => setAddToListDoc(null)} title="Ajouter à une liste de lecture" size="sm">
        {addToListDoc && (
          <AddToListForm
            document={addToListDoc}
            onAdd={(listId) => addToListMut.mutate({ listId, docId: addToListDoc.id })}
            loading={addToListMut.isPending}
          />
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

function RatingWidget({ documentId }: { documentId: string }) {
  const [rating, setRating] = useState(0)
  const qc = useQueryClient()
  const rateMut = useMutation({
    mutationFn: () => libraryApi.rateDocument(documentId, { rating }),
    onSuccess: () => {
      toast.success('Merci pour votre évaluation !')
      qc.invalidateQueries({ queryKey: ['library'] })
    },
    onError: () => toast.error('Erreur lors de l\'évaluation'),
  })
  return (
    <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-3">
      <span className="text-sm text-amber-800 font-medium">Noter ce document :</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)}>
            <Star className={cn('w-5 h-5', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <Button size="xs" loading={rateMut.isPending} onClick={() => rateMut.mutate()}>Envoyer</Button>
      )}
    </div>
  )
}

function AddToListForm({ document, onAdd, loading }: { document: LibraryDoc; onAdd: (listId: string) => void; loading: boolean }) {
  const { data: lists, isLoading } = useQuery({
    queryKey: ['my-reading-lists'],
    queryFn: () => libraryApi.getReadingLists().then(r => r.data.results ?? r.data),
  })
  if (isLoading) return <Spinner />
  if (!lists || lists.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Créez d'abord une liste depuis l'onglet "Mes listes de lecture".</p>
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-3">Ajouter « {document.title} » à :</p>
      {lists.map((list: { id: string; name: string }) => (
        <button
          key={list.id}
          disabled={loading}
          onClick={() => onAdd(list.id)}
          className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {list.name}
        </button>
      ))}
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

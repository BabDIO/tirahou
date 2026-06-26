import { useQuery } from '@tanstack/react-query'
import { BookOpen, Download, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { libraryApi } from '../../api'
import { Card, StatsCard, Badge, Alert } from '../../components/ui'
import type { LibraryDocument } from '../../types'

const typeColor: Record<string, string> = {
  livre: 'badge-blue', memoire: 'badge-purple', these: 'badge-yellow',
  article: 'badge-green', guide: 'badge-gray', rapport: 'badge-gray',
}

export default function BibliothecaireDashboard() {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['biblio-stats'],
    queryFn: () => libraryApi.getStats().then(r => r.data),
  })

  const { data: recent } = useQuery({
    queryKey: ['biblio-recent'],
    queryFn: () => libraryApi.getDocuments({ page_size: 6, ordering: '-created_at' }).then(r => r.data),
  })

  const { data: popular } = useQuery({
    queryKey: ['biblio-popular'],
    queryFn: () => libraryApi.getDocuments({ page_size: 5, ordering: '-download_count' }).then(r => r.data),
  })

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-600 to-orange-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span className="text-amber-200 text-sm font-medium">Espace Bibliothèque</span>
          </div>
          <h1 className="text-2xl font-bold">{user?.full_name}</h1>
          <p className="text-amber-200 text-sm mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Total documents" value={stats?.total ?? 0}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
        <StatsCard title="Livres" value={stats?.livres ?? 0}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatsCard title="Mémoires & Thèses" value={(stats?.memoires ?? 0) + (stats?.theses ?? 0)}
          icon={<BookOpen className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
        <StatsCard title="Téléchargements" value={stats?.total_downloads ?? 0}
          icon={<Download className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Derniers ajouts">
          {!recent?.results?.length ? (
            <Alert type="info">Aucun document dans la bibliothèque.</Alert>
          ) : (
            <div className="space-y-2">
              {recent.results.map((doc: LibraryDocument) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-xl flex-shrink-0">
                    {doc.type === 'livre' ? '📚' : doc.type === 'memoire' ? '📝' : doc.type === 'these' ? '🎓' : '📄'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-400">{doc.author} · {doc.year}</p>
                  </div>
                  <Badge label={doc.type_display} className={typeColor[doc.type] ?? 'badge-gray'} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Plus téléchargés">
          {!popular?.results?.length ? (
            <Alert type="info">Aucune statistique disponible.</Alert>
          ) : (
            <div className="space-y-2">
              {popular.results.map((doc: LibraryDocument, idx: number) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                    idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-gray-300 text-gray-700' : 'bg-gray-100 text-gray-500'
                  }`}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-400">{doc.author}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Download className="w-3 h-3" />{doc.download_count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {stats?.by_domain?.length > 0 && (
          <Card title="Répartition par domaine" className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {stats.by_domain.map((d: { domain: string; count: number }) => (
                <div key={d.domain} className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                  <p className="text-2xl font-black text-amber-700">{d.count}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{d.domain || 'Non classé'}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

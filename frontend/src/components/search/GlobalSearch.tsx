import { useState, useEffect, useRef } from 'react'
import { Search, FileText, Users, BookOpen, GraduationCap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/axios'
import { cn } from '../../lib/utils'
import useDebounce from '../../hooks/useDebounce'

interface SearchResult {
  id: string
  name: string
  description: string
  url: string
}

interface SearchResponse {
  students: SearchResult[]
  teachers: SearchResult[]
  programs: SearchResult[]
  documents: SearchResult[]
}

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()
  const debouncedSearch = useDebounce(search, 300)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(true)
      }
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onOpenChange])

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', debouncedSearch],
    queryFn: () => api.get<SearchResponse>('/search/', { params: { q: debouncedSearch } }).then(r => r.data),
    enabled: open && debouncedSearch.length >= 2,
  })

  const allResults = [
    ...(results?.students ?? []).map((r) => ({ ...r, type: 'student' as const })),
    ...(results?.teachers ?? []).map((r) => ({ ...r, type: 'teacher' as const })),
    ...(results?.programs ?? []).map((r) => ({ ...r, type: 'program' as const })),
    ...(results?.documents ?? []).map((r) => ({ ...r, type: 'document' as const })),
  ]

  const handleSelect = (item: SearchResult) => {
    navigate(item.url)
    onOpenChange(false)
    setSearch('')
  }

  useEffect(() => {
    if (open) inputRef.current?.focus()
    else { setSearch(''); setSelected(0) }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && allResults[selected]) {
      handleSelect(allResults[selected])
    }
  }

  const icons = {
    student: GraduationCap,
    teacher: Users,
    program: BookOpen,
    document: FileText,
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-[20vh]" onClick={() => onOpenChange(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher étudiants, enseignants, programmes, documents..."
            className="flex-1 outline-none text-sm bg-transparent text-gray-900 dark:text-gray-100"
          />
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-500 dark:text-gray-400">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">Recherche...</div>
          ) : allResults.length === 0 && debouncedSearch.length >= 2 ? (
            <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">Aucun résultat</div>
          ) : allResults.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">
              Commencez à taper pour rechercher (2 caractères minimum)
            </div>
          ) : (
            <div className="py-2">
              {allResults.map((item, idx) => {
                const Icon = icons[item.type]
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:bg-gray-700 transition text-left',
                      selected === idx && 'bg-blue-50 dark:bg-blue-900/30'
                    )}
                  >
                    <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

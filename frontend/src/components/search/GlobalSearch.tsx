import { useState, useEffect, useRef } from 'react'
import { Search, FileText, Users, BookOpen, Calendar, Award } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/axios'
import { cn } from '../../lib/utils'
import useDebounce from '../../hooks/useDebounce'

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()
  const debouncedSearch = useDebounce(search, 300)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', debouncedSearch],
    queryFn: () => api.get('/search/', { params: { q: debouncedSearch } }).then(r => r.data),
    enabled: debouncedSearch.length >= 2
  })

  const allResults = [
    ...(results?.courses || []).map((r: any) => ({ ...r, type: 'course' })),
    ...(results?.students || []).map((r: any) => ({ ...r, type: 'student' })),
    ...(results?.documents || []).map((r: any) => ({ ...r, type: 'document' })),
    ...(results?.events || []).map((r: any) => ({ ...r, type: 'event' }))
  ]

  const handleSelect = (item: any) => {
    const routes: Record<string, string> = {
      course: `/courses/${item.id}`,
      student: `/students/${item.id}`,
      document: `/documents/${item.id}`,
      event: `/events/${item.id}`
    }
    navigate(routes[item.type] || '/')
    setOpen(false)
    setSearch('')
  }

  useEffect(() => {
    if (open) inputRef.current?.focus()
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

  const icons: Record<string, any> = {
    course: BookOpen,
    student: Users,
    document: FileText,
    event: Calendar
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-[20vh]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher cours, étudiants, documents..."
            className="flex-1 outline-none text-sm"
          />
          <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Recherche...</div>
          ) : allResults.length === 0 && debouncedSearch.length >= 2 ? (
            <div className="p-8 text-center text-sm text-gray-400">Aucun résultat</div>
          ) : allResults.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Commencez à taper pour rechercher
            </div>
          ) : (
            <div className="py-2">
              {allResults.map((item, idx) => {
                const Icon = icons[item.type]
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left',
                      selected === idx && 'bg-blue-50'
                    )}
                  >
                    <Icon className="w-4 h-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name || item.title}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 truncate">{item.description}</p>
                      )}
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

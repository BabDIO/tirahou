/**
 * DataTable Component - Table de données avancée
 * =============================================
 * 
 * Table réutilisable avec tri, recherche, pagination et actions.
 * Optimisée pour grandes quantités de données.
 * 
 * @module components/ui/DataTable
 */

import { useState, useMemo } from 'react'
import { Search, ArrowUpDown, ChevronDown, Filter } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Input, Pagination, Skeleton } from './index'
import useDebounce from '../../hooks/useDebounce'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  className?: string
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  isLoading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  onRowClick?: (row: T) => void
  emptyMessage?: string
  pageSize?: number
  className?: string
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading,
  searchable = true,
  searchPlaceholder = 'Rechercher...',
  onRowClick,
  emptyMessage = 'Aucune donnée disponible',
  pageSize = 10,
  className
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  // Filtrage par recherche
  const filteredData = useMemo(() => {
    if (!debouncedSearch) return data

    const searchLower = debouncedSearch.toLowerCase()
    return data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchLower)
      )
    )
  }, [data, debouncedSearch])

  // Tri
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      if (aVal === bVal) return 0

      const comparison = aVal > bVal ? 1 : -1
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortKey, sortOrder])

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 overflow-hidden', className)}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 overflow-hidden', className)}>
      {/* Header avec recherche */}
      {searchable && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="max-w-md"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider',
                    column.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none',
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <ArrowUpDown
                        className={cn(
                          'w-3.5 h-3.5 transition-colors',
                          sortKey === column.key ? 'text-primary-600' : 'text-gray-400 dark:text-gray-500'
                        )}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('px-4 py-3 text-sm text-gray-900 dark:text-gray-50', column.className)}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sortedData.length > pageSize && (
        <Pagination
          page={currentPage}
          total={sortedData.length}
          pageSize={pageSize}
          onChange={setCurrentPage}
        />
      )}
    </div>
  )
}

/**
 * Composants Skeleton pour les états de chargement
 */

interface SkeletonProps {
  className?: string
  width?: string
  height?: string
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  animate?: boolean
}

export function Skeleton({
  className = '',
  width = 'w-full',
  height = 'h-4',
  rounded = 'md',
  animate = true,
}: SkeletonProps) {
  const roundedClass = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  }[rounded]

  return (
    <div
      className={`bg-gray-200 ${roundedClass} ${width} ${height} ${animate ? 'animate-pulse' : ''} ${className}`}
    />
  )
}

// Skeleton pour un avatar circulaire
export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[size]

  return <Skeleton className={sizeClass} rounded="full" />
}

// Skeleton pour une carte
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <Skeleton width="w-1/2" height="h-4" />
          <Skeleton width="w-1/3" height="h-3" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton width="w-full" height="h-3" />
        <Skeleton width="w-5/6" height="h-3" />
        <Skeleton width="w-4/6" height="h-3" />
      </div>
    </div>
  )
}

// Skeleton pour une ligne de tableau
export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton width={i === 0 ? 'w-full' : 'w-3/4'} height="h-3" />
        </td>
      ))}
    </tr>
  )
}

// Skeleton pour un tableau complet
export function SkeletonTable({
  rows = 5,
  columns = 5,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton width="w-20" height="h-3" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Skeleton pour une liste
export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-100">
          <SkeletonAvatar size="sm" />
          <div className="flex-1 space-y-2">
            <Skeleton width="w-1/3" height="h-3" />
            <Skeleton width="w-1/2" height="h-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Skeleton pour un formulaire
export function SkeletonForm({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="w-24" height="h-3" />
          <Skeleton width="w-full" height="h-10" rounded="lg" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton width="w-32" height="h-10" rounded="lg" />
        <Skeleton width="w-32" height="h-10" rounded="lg" />
      </div>
    </div>
  )
}

// Skeleton pour des statistiques
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
          <Skeleton width="w-10" height="h-10" rounded="lg" />
          <Skeleton width="w-3/4" height="h-4" />
          <Skeleton width="w-1/2" height="h-6" />
        </div>
      ))}
    </div>
  )
}

// Skeleton pour un graphique
export function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton width="w-32" height="h-5" />
        <Skeleton width="w-24" height="h-8" rounded="lg" />
      </div>
      <div className="space-y-2">
        <div className="flex items-end justify-between h-48 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              width="flex-1"
              height={`h-${Math.floor(Math.random() * 40) + 16}`}
              rounded="sm"
            />
          ))}
        </div>
      </div>
      <div className="flex justify-center gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} width="w-20" height="h-3" />
        ))}
      </div>
    </div>
  )
}

// Skeleton pour un profil
export function SkeletonProfile() {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Banner */}
      <Skeleton width="w-full" height="h-32" rounded="sm" animate={false} className="bg-gradient-to-r from-gray-200 to-gray-300" />
      
      {/* Content */}
      <div className="p-6 -mt-16 relative">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
          {/* Avatar */}
          <div className="relative">
            <Skeleton className="w-32 h-32 border-4 border-white" rounded="full" />
          </div>
          
          {/* Info */}
          <div className="flex-1 text-center sm:text-left space-y-2 mt-4">
            <Skeleton width="w-48" height="h-6" />
            <Skeleton width="w-32" height="h-4" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton width="w-16" height="h-6" className="mx-auto" />
              <Skeleton width="w-20" height="h-3" className="mx-auto" />
            </div>
          ))}
        </div>

        {/* Bio */}
        <div className="mt-6 space-y-2">
          <Skeleton width="w-full" height="h-3" />
          <Skeleton width="w-5/6" height="h-3" />
          <Skeleton width="w-4/6" height="h-3" />
        </div>
      </div>
    </div>
  )
}

export default Skeleton

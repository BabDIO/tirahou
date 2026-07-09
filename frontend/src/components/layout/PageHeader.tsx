/**
 * PageHeader Component - En-tête de page standard
 * ==============================================
 * 
 * Header réutilisable avec titre, description, breadcrumb et actions.
 * 
 * @module components/layout/PageHeader
 */

import { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Breadcrumb, { BreadcrumbItem } from '../ui/Breadcrumb'
import { cn } from '../../lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  backButton?: boolean
  backTo?: string
  className?: string
}

/**
 * Header standardisé pour toutes les pages
 */
export default function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  backButton,
  backTo,
  className
}: PageHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (backTo) {
      navigate(backTo)
    } else {
      navigate(-1)
    }
  }

  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumb */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-4">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}

      {/* Header principal */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Bouton retour */}
          {backButton && (
            <button
              onClick={handleBack}
              className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Titre et description */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

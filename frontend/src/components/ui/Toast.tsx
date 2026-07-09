/**
 * Toast Component - Système de notifications moderne
 * ==================================================
 * 
 * Notifications élégantes avec animations, icônes et auto-dismiss.
 * Support pour 4 types : success, error, warning, info
 * 
 * @module components/ui/Toast
 */

import { useEffect } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '../../lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  id: string
  type: ToastType
  message: string
  title?: string
  duration?: number
  onClose: (id: string) => void
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-800 dark:text-emerald-200',
    iconColor: 'text-emerald-600 dark:text-emerald-400'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-500',
    textColor: 'text-red-800 dark:text-red-200',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-800 dark:text-amber-200',
    iconColor: 'text-amber-600 dark:text-amber-400'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-800 dark:text-blue-200',
    iconColor: 'text-blue-600 dark:text-blue-400'
  }
}

export default function Toast({ id, type, message, title, duration = 5000, onClose }: ToastProps) {
  const config = toastConfig[type]
  const Icon = config.icon

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration)
      return () => clearTimeout(timer)
    }
  }, [duration, id, onClose])

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-md rounded-lg border-l-4 shadow-lg',
        'animate-in slide-in-from-right duration-300',
        config.bgColor,
        config.borderColor
      )}
      role="alert"
    >
      <div className="flex w-full items-start gap-3 p-4">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconColor)} />
        
        <div className="flex-1">
          {title && (
            <p className={cn('font-semibold text-sm mb-1', config.textColor)}>
              {title}
            </p>
          )}
          <p className={cn('text-sm', config.textColor)}>
            {message}
          </p>
        </div>

        <button
          onClick={() => onClose(id)}
          className={cn(
            'flex-shrink-0 rounded-md p-1 transition-colors',
            'hover:bg-black/5 dark:hover:bg-white/10',
            config.textColor
          )}
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

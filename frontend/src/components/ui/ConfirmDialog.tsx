import { AlertTriangle, Info, X } from 'lucide-react'
import { Button } from './index'
import { useConfirmDialog } from '../../hooks/useConfirm'
import { cn } from '../../lib/utils'

export default function ConfirmDialog() {
  const { state, handleConfirm, handleCancel } = useConfirmDialog()

  if (!state.open) return null

  const variant = state.variant ?? 'danger'
  const icons = {
    danger: <AlertTriangle className="w-6 h-6 text-red-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
  }
  const confirmStyles = {
    danger: 'bg-red-600 text-white hover:bg-red-700',
    warning: 'bg-amber-600 text-white hover:bg-amber-700',
    info: 'bg-primary-600 text-white hover:bg-primary-700',
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={handleCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        style={{ animation: 'slideUp 0.2s ease-out' }}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5">{icons[variant]}</div>
          <div className="flex-1">
            {state.title && (
              <h3 className="font-semibold text-gray-900 mb-1">{state.title}</h3>
            )}
            <p className="text-sm text-gray-600">{state.message}</p>
          </div>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={handleCancel}>
            {state.cancelLabel ?? 'Annuler'}
          </Button>
          <button
            onClick={handleConfirm}
            className={cn('flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors', confirmStyles[variant])}
          >
            {state.confirmLabel ?? 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

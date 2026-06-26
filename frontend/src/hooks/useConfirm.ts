import { useState, useCallback } from 'react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve: ((value: boolean) => void) | null
}

let globalSetState: ((state: ConfirmState) => void) | null = null

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>({
    open: false, message: '', resolve: null,
  })

  globalSetState = setState

  const handleConfirm = useCallback(() => {
    state.resolve?.(true)
    setState(s => ({ ...s, open: false, resolve: null }))
  }, [state])

  const handleCancel = useCallback(() => {
    state.resolve?.(false)
    setState(s => ({ ...s, open: false, resolve: null }))
  }, [state])

  return { state, handleConfirm, handleCancel }
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    globalSetState?.({ ...options, open: true, resolve })
  })
}

import toast from 'react-hot-toast'

export const useToast = () => ({
  success: (msg: string) => toast.success(msg, { duration: 3000 }),
  error: (msg: string) => toast.error(msg, { duration: 4000 }),
  loading: (msg: string) => toast.loading(msg),
  dismiss: (id?: string) => toast.dismiss(id),
  promise: <T,>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ) => toast.promise(promise, msgs),
  /** Alias utilisé par certaines pages (message + variante). */
  showToast: (msg: string, variant: 'success' | 'error' | 'info' = 'success') => {
    if (variant === 'error') return toast.error(msg, { duration: 4000 })
    if (variant === 'info') return toast(msg, { duration: 3500, icon: 'ℹ️' })
    return toast.success(msg, { duration: 3000 })
  },
})

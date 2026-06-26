import { cn } from '../../lib/utils'
import { Loader2, X, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.98] shadow-sm hover:shadow focus:ring-primary-500',
      secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm focus:ring-gray-300',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm focus:ring-red-500',
      ghost: 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:ring-gray-300',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm focus:ring-emerald-500',
    }
    const sizes = {
      xs: 'px-2.5 py-1 text-xs rounded-md',
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-4 py-2 text-sm rounded-lg',
      lg: 'px-5 py-2.5 text-sm rounded-xl',
    }
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed select-none',
          variants[variant], sizes[size], className
        )}
        {...props}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  /** Alias de `leftIcon` (champ recherche, etc.) */
  icon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, icon, rightIcon, className, ...props }, ref) => {
    const li = leftIcon ?? icon
    return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <div className="relative">
        {li && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{li}</div>
        )}
        <input
          ref={ref}
          className={cn(
            'input',
            li && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-red-400 focus:ring-red-400/30 focus:border-red-400',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">{rightIcon}</div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">⚠ {error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
    </div>
    )
  }
)
Input.displayName = 'Input'

// ── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <textarea
        ref={ref}
        className={cn(
          'input resize-none',
          error && 'border-red-400 focus:ring-red-400/30 focus:border-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">⚠ {error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectOption { value: string; label: string }

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children?: ReactNode
  /** Rendu en `<option>` si fourni (sinon utiliser `children`). */
  options?: SelectOption[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, options, className, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <select
        ref={ref}
        className={cn('input bg-white cursor-pointer', error && 'border-red-400', className)}
        {...props}
      >
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))
          : children}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-600">⚠ {error}</p>}
    </div>
  )
)
Select.displayName = 'Select'

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps { label: string; className?: string; dot?: boolean }
export const Badge = ({ label, className, dot }: BadgeProps) => (
  <span className={cn('badge', className)}>
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
    {label}
  </span>
)

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: ReactNode
  noPadding?: boolean
  hover?: boolean
  onClick?: () => void
}
export const Card = ({ children, className, title, subtitle, action, noPadding, hover, onClick }: CardProps) => (
  <div
    className={cn('card', hover && 'card-hover', noPadding ? '' : 'p-6', onClick && 'cursor-pointer', className)}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onClick()
            }
          }
        : undefined
    }
  >
    {(title || action) && (
      <div className={cn('flex items-start justify-between gap-4', !noPadding && 'mb-5')}>
        <div>
          {title && <h3 className="section-title">{title}</h3>}
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    )}
    {children}
  </div>
)

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-10 h-10' }
  return (
    <div className="flex flex-col items-center justify-center p-10 gap-3">
      <Loader2 className={cn('animate-spin text-primary-500', sizes[size])} />
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  /** Visibilité (alias historique) */
  show?: boolean
  /** Visibilité — préféré, aligné avec l’usage du projet */
  open?: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  footer?: ReactNode
}
export const Modal = ({ show, open, onClose, title, subtitle, children, size = 'md', footer }: ModalProps) => {
  const visible = open ?? show ?? false
  if (!visible) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', '2xl': 'max-w-6xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.15s ease-out' }}
      />
      <div
        className={cn('relative bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh]', sizes[size])}
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-4 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
interface EmptyProps { message?: string; description?: string; icon?: ReactNode; action?: ReactNode }
export const Empty = ({ message = 'Aucune donnée', description, icon, action }: EmptyProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    {icon && (
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 text-gray-300">
        {icon}
      </div>
    )}
    <p className="text-sm font-medium text-gray-500">{message}</p>
    {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)

// ── Stats Card ────────────────────────────────────────────────────────────────
interface StatsCardProps {
  title: string
  value: string | number
  icon: ReactNode
  color?: string
  trend?: { value: number; label: string }
  subtitle?: string
}
export const StatsCard = ({ title, value, icon, color = 'bg-primary-500', trend, subtitle }: StatsCardProps) => (
  <div className="card p-5 flex items-start gap-4 group hover:shadow-md transition-all duration-200">
    <div className={cn('p-3 rounded-xl text-white flex-shrink-0 shadow-sm', color)}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums leading-none">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      {trend && (
        <div className={cn(
          'flex items-center gap-1 mt-1.5 text-xs font-medium',
          trend.value > 0 ? 'text-emerald-600' : trend.value < 0 ? 'text-red-500' : 'text-gray-400'
        )}>
          {trend.value > 0 ? <TrendingUp className="w-3 h-3" /> : trend.value < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {Math.abs(trend.value)}% {trend.label}
        </div>
      )}
    </div>
  </div>
)

// ── Pagination ────────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number
  total: number
  pageSize: number
  onChange: (page: number) => void
}
export const Pagination = ({ page, total, pageSize, onChange }: PaginationProps) => {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
      <p className="text-xs text-gray-500">
        <span className="font-medium text-gray-700">{from}–{to}</span> sur <span className="font-medium text-gray-700">{total}</span> résultats
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p = i + 1
          if (totalPages > 5) {
            if (page <= 3) p = i + 1
            else if (page >= totalPages - 2) p = totalPages - 4 + i
            else p = page - 2 + i
          }
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                p === page
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200'
              )}
            >
              {p}
            </button>
          )
        })}
        <button
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
interface ProgressProps { value: number; max?: number; color?: string; size?: 'sm' | 'md' | 'lg'; label?: string }
export const Progress = ({ value, max = 100, color = 'bg-primary-500', size = 'md', label }: ProgressProps) => {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const heights = { sm: 'h-1', md: 'h-2', lg: 'h-3' }
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{label}</span><span className="font-medium">{pct}%</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
interface AvatarProps { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; color?: string }
export const Avatar = ({ name, src, size = 'md', color = 'bg-primary-100 text-primary-700' }: AvatarProps) => {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' }
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  if (src) return <img src={src} alt={name} className={cn('rounded-full object-cover flex-shrink-0', sizes[size])} />
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold flex-shrink-0', sizes[size], color)}>
      {initials}
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
interface TabItem { key: string; label: string; icon?: ReactNode; count?: number }
interface TabsProps { tabs: TabItem[]; active: string; onChange: (key: string) => void; variant?: 'pills' | 'underline' }
export const Tabs = ({ tabs, active, onChange, variant = 'pills' }: TabsProps) => {
  if (variant === 'underline') {
    return (
      <div className="flex gap-0 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              active === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {tab.icon}{tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {tab.count > 9 ? '9+' : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
            active === tab.key
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {tab.icon}{tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {tab.count > 9 ? '9+' : tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────────
interface AlertProps { type?: 'info' | 'success' | 'warning' | 'error'; title?: string; children: ReactNode }
export const Alert = ({ type = 'info', title, children }: AlertProps) => {
  const styles = {
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error:   'bg-red-50 border-red-200 text-red-800',
  }
  const icons = { info: 'ℹ', success: '✓', warning: '⚠', error: '✕' }
  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-xl border text-sm', styles[type])}>
      <span className="font-bold flex-shrink-0 mt-0.5">{icons[type]}</span>
      <div>
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div className="opacity-90">{children}</div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('skeleton', className)} />
)

export const SkeletonTable = ({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="space-y-0">
    <div className="flex gap-4 px-5 py-3.5 bg-gray-50 border-b border-gray-100">
      {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3 flex-1" />)}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 px-5 py-4 border-b border-gray-50">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className={cn('h-4 flex-1', j === 0 && 'flex-[2]')} />
        ))}
      </div>
    ))}
  </div>
)

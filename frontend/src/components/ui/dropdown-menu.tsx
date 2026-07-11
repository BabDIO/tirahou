/**
 * DropdownMenu Component
 * ======================
 * Menu déroulant contextuel pour actions et sélections
 */

import { createContext, forwardRef, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | undefined>(undefined)

const useDropdownMenu = () => {
  const context = useContext(DropdownMenuContext)
  if (!context) throw new Error('useDropdownMenu must be used within DropdownMenu')
  return context
}

// ── DropdownMenu (Root) ───────────────────────────────────────────────────────
interface DropdownMenuProps {
  children: ReactNode
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

// ── DropdownMenuTrigger ───────────────────────────────────────────────────────
interface DropdownMenuTriggerProps {
  children: ReactNode
  asChild?: boolean
  className?: string
}

export const DropdownMenuTrigger = forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ children, asChild, className, ...props }, ref) => {
    const { open, setOpen } = useDropdownMenu()

    if (asChild) {
      // Clone l'élément enfant et ajoute les props
      const child = children as any
      return (
        <child.type
          {...child.props}
          {...props}
          ref={ref}
          onClick={() => setOpen(!open)}
          className={cn(child.props.className, className)}
        />
      )
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen(!open)}
        className={className}
        {...props}
      >
        {children}
      </button>
    )
  }
)
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

// ── DropdownMenuContent ───────────────────────────────────────────────────────
interface DropdownMenuContentProps {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
}

export function DropdownMenuContent({ children, align = 'start', className }: DropdownMenuContentProps) {
  const { open, setOpen } = useDropdownMenu()

  if (!open) return null

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }

  return (
    <>
      {/* Overlay invisible pour fermer au clic extérieur */}
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      
      {/* Menu content */}
      <div
        className={cn(
          'absolute z-50 mt-2 min-w-[12rem] rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl py-1',
          'animate-in fade-in-0 zoom-in-95 duration-100',
          alignClasses[align],
          className
        )}
      >
        {children}
      </div>
    </>
  )
}

// ── DropdownMenuItem ──────────────────────────────────────────────────────────
interface DropdownMenuItemProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export function DropdownMenuItem({ children, onClick, disabled, className }: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenu()

  const handleClick = () => {
    if (disabled) return
    onClick?.()
    setOpen(false)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-slate-300',
        'hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:bg-gray-100 dark:focus:bg-slate-800',
        className
      )}
    >
      {children}
    </button>
  )
}

// ── DropdownMenuSeparator ─────────────────────────────────────────────────────
export function DropdownMenuSeparator() {
  return <div className="h-px bg-gray-100 my-1" />
}

// ── DropdownMenuLabel ─────────────────────────────────────────────────────────
interface DropdownMenuLabelProps {
  children: ReactNode
  className?: string
}

export function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return (
    <div className={cn('px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide', className)}>
      {children}
    </div>
  )
}

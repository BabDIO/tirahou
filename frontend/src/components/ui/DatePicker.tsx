import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import {
  format, parseISO, isValid, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '../../lib/utils'

interface DatePickerProps {
  value: string // format ISO yyyy-MM-dd (ou '' si vide) — même contrat que <input type="date">
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  min?: string
  max?: string
  error?: string
  disabled?: boolean
  className?: string
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/**
 * Champ de date avec calendrier déroulant (navigation mois par mois, clic sur
 * un jour) en plus de la saisie manuelle au format jj/mm/aaaa — remplace
 * <input type="date"> dont l'icône native de calendrier est peu visible en
 * thème sombre (rendue en noir par le navigateur, sur fond sombre) et dont
 * l'apparence varie d'un navigateur à l'autre.
 */
export function DatePicker({ value, onChange, label, placeholder = 'jj/mm/aaaa', min, max, error, disabled, className }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = value && isValid(parseISO(value)) ? parseISO(value) : null
  const [viewMonth, setViewMonth] = useState(selectedDate ?? new Date())
  const [textValue, setTextValue] = useState(selectedDate ? format(selectedDate, 'dd/MM/yyyy') : '')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const d = value && isValid(parseISO(value)) ? parseISO(value) : null
    setTextValue(d ? format(d, 'dd/MM/yyyy') : '')
    if (d) setViewMonth(d)
  }, [value])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleTextChange = (raw: string) => {
    setTextValue(raw)
    if (raw === '') { onChange(''); return }
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (match) {
      const [, d, m, y] = match
      const iso = `${y}-${m}-${d}`
      const parsed = parseISO(iso)
      if (isValid(parsed)) {
        onChange(iso)
        setViewMonth(parsed)
      }
    }
  }

  const selectDay = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const minDate = min && isValid(parseISO(min)) ? parseISO(min) : null
  const maxDate = max && isValid(parseISO(max)) ? parseISO(max) : null

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days: Date[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d)

  return (
    <div className={cn('w-full relative', className)} ref={containerRef}>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <input
          className={cn('input pr-10', error && 'border-red-400 focus:ring-red-400/30 focus:border-red-400')}
          value={textValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={e => handleTextChange(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        <button type="button" tabIndex={-1} disabled={disabled} onClick={() => setOpen(o => !o)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-primary-500 transition-colors disabled:opacity-50">
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">⚠ {error}</p>}

      {open && !disabled && (
        <div className="absolute z-50 mt-1.5 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setViewMonth(m => subMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 capitalize">
              {format(viewMonth, 'MMMM yyyy', { locale: fr })}
            </p>
            <button type="button" onClick={() => setViewMonth(m => addMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const isDisabled = (minDate && day < minDate) || (maxDate && day > maxDate)
              const selected = selectedDate && isSameDay(day, selectedDate)
              const outside = !isSameMonth(day, viewMonth)
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={!!isDisabled}
                  onClick={() => selectDay(day)}
                  className={cn(
                    'aspect-square rounded-lg text-xs flex items-center justify-center transition-colors',
                    outside && 'text-gray-300 dark:text-gray-600',
                    !outside && !selected && 'text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/30',
                    selected && 'bg-primary-600 text-white font-bold hover:bg-primary-700',
                    isToday(day) && !selected && 'ring-1 ring-primary-400',
                    isDisabled && 'opacity-30 cursor-not-allowed hover:bg-transparent',
                  )}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
          <button type="button" onClick={() => selectDay(new Date())}
            className="w-full mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs font-medium text-primary-600 hover:text-primary-700">
            Aujourd'hui
          </button>
        </div>
      )}
    </div>
  )
}

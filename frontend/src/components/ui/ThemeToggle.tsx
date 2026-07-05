import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

export default function ThemeToggle() {
  const { theme, actualTheme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const themes = [
    { value: 'light' as const, icon: Sun, label: 'Clair' },
    { value: 'dark' as const, icon: Moon, label: 'Sombre' },
    { value: 'system' as const, icon: Monitor, label: 'Système' },
  ]

  const currentThemeConfig = themes.find(t => t.value === theme) || themes[0]
  const Icon = currentThemeConfig.icon

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          p-2.5 rounded-xl transition-all duration-200
          ${actualTheme === 'dark' 
            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
        `}
        title={`Thème: ${currentThemeConfig.label}`}
      >
        <Icon className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className={`
                absolute right-0 top-full mt-2 z-50
                rounded-xl shadow-xl border overflow-hidden
                ${actualTheme === 'dark'
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-white border-gray-200'
                }
              `}
            >
              <div className="py-1 min-w-[160px]">
                {themes.map(({ value, icon: ThemeIcon, label }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setTheme(value)
                      setIsOpen(false)
                    }}
                    className={`
                      w-full px-4 py-2.5 flex items-center gap-3 transition-colors
                      ${theme === value
                        ? actualTheme === 'dark'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 text-blue-700'
                        : actualTheme === 'dark'
                          ? 'text-slate-300 hover:bg-slate-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <ThemeIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                    {theme === value && (
                      <motion.div
                        layoutId="activeTheme"
                        className="ml-auto w-2 h-2 rounded-full bg-current"
                      />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

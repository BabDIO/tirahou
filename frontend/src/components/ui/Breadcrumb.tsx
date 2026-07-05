import { ChevronRight, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '@/contexts/ThemeContext'

interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  autoGenerate?: boolean
}

export default function Breadcrumb({ items, autoGenerate = true }: BreadcrumbProps) {
  const location = useLocation()
  const { actualTheme } = useTheme()

  // Génération automatique des breadcrumbs depuis l'URL
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = location.pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    // Mappings pour de meilleurs labels
    const labelMap: Record<string, string> = {
      'dashboard': 'Tableau de bord',
      'student': 'Étudiant',
      'teacher': 'Enseignant',
      'admin': 'Administration',
      'courses': 'Cours',
      'grades': 'Notes',
      'documents': 'Documents',
      'finance': 'Finance',
      'schedule': 'Emploi du temps',
      'virtual-classes': 'Classes virtuelles',
      'lms': 'LMS',
      'settings': 'Paramètres',
      'profile': 'Profil',
      'users': 'Utilisateurs',
      'academic': 'Structure académique',
      'programs': 'Programmes',
      'enrollment': 'Inscriptions',
      'evaluation': 'Évaluation',
      'internships': 'Stages',
      'library': 'Bibliothèque',
      'analytics': 'Analytics',
      'audit': 'Audit',
      'my-courses': 'Mes cours',
      'my-grades': 'Mes notes',
      'my-documents': 'Mes documents',
      'my-internship': 'Mon stage',
      'my-finance': 'Mes finances',
      'my-schedule': 'Mon emploi du temps',
    }

    paths.forEach((path, index) => {
      const fullPath = '/' + paths.slice(0, index + 1).join('/')
      const label = labelMap[path] || path.charAt(0).toUpperCase() + path.slice(1)
      
      breadcrumbs.push({
        label,
        path: fullPath,
      })
    })

    return breadcrumbs
  }

  const breadcrumbItems = items || (autoGenerate ? generateBreadcrumbs() : [])

  if (breadcrumbItems.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 flex-wrap">
        {/* Home */}
        <motion.li
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0 }}
        >
          <Link
            to="/"
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-colors duration-200
              ${actualTheme === 'dark'
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Accueil</span>
          </Link>
        </motion.li>

        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1

          return (
            <motion.li
              key={item.path || index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (index + 1) * 0.05 }}
              className="flex items-center gap-2"
            >
              <ChevronRight
                className={`w-4 h-4 ${
                  actualTheme === 'dark' ? 'text-slate-600' : 'text-gray-400'
                }`}
              />
              {isLast || !item.path ? (
                <span
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-semibold
                    ${actualTheme === 'dark'
                      ? 'text-white bg-slate-800'
                      : 'text-gray-900 bg-gray-100'
                    }
                  `}
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium
                    transition-colors duration-200
                    ${actualTheme === 'dark'
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  {item.label}
                </Link>
              )}
            </motion.li>
          )
        })}
      </ol>
    </nav>
  )
}

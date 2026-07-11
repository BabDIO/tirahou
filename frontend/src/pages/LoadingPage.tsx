import { Loader2 } from 'lucide-react'

interface LoadingPageProps {
  message?: string
  fullScreen?: boolean
}

export default function LoadingPage({ 
  message = 'Chargement en cours...', 
  fullScreen = true 
}: LoadingPageProps) {
  const containerClass = fullScreen 
    ? 'min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center'
    : 'flex items-center justify-center py-20'

  return (
    <div className={containerClass}>
      <div className="text-center">
        {/* Logo animé */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Cercle extérieur pulsant */}
          <div className="absolute inset-0 bg-primary-100 rounded-full animate-ping opacity-75" />
          
          {/* Cercle principal */}
          <div className="relative w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-2">
          {message}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Veuillez patienter quelques instants
        </p>

        {/* Barre de progression indéterminée */}
        <div className="w-64 h-1 bg-gray-200 rounded-full mx-auto mt-6 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full animate-progress" />
        </div>
      </div>
    </div>
  )
}

// Animation de la barre de progression
const style = document.createElement('style')
style.textContent = `
  @keyframes progress {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
  .animate-progress {
    animation: progress 1.5s ease-in-out infinite;
  }
`
document.head.appendChild(style)

import { useNavigate } from 'react-router-dom'
import { ServerCrash, RefreshCw, Home, AlertCircle } from 'lucide-react'
import { Button } from '../components/ui'

interface ServerErrorPageProps {
  errorCode?: number
  errorMessage?: string
}

export default function ServerErrorPage({ 
  errorCode = 500, 
  errorMessage = 'Le serveur a rencontré une erreur inattendue.' 
}: ServerErrorPageProps) {
  const navigate = useNavigate()

  const handleRefresh = () => {
    window.location.reload()
  }

  const getErrorDetails = (code: number) => {
    switch (code) {
      case 500:
        return {
          title: 'Erreur Serveur Interne',
          description: 'Le serveur a rencontré une erreur inattendue. Notre équipe technique a été notifiée.',
        }
      case 502:
        return {
          title: 'Passerelle Incorrecte',
          description: 'Le serveur ne répond pas correctement. Veuillez réessayer dans quelques instants.',
        }
      case 503:
        return {
          title: 'Service Indisponible',
          description: 'Le service est temporairement indisponible. Maintenance en cours.',
        }
      case 504:
        return {
          title: 'Délai d\'Attente Dépassé',
          description: 'Le serveur met trop de temps à répondre. Veuillez réessayer.',
        }
      default:
        return {
          title: 'Erreur Serveur',
          description: errorMessage,
        }
    }
  }

  const { title, description } = getErrorDetails(errorCode)

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icône d'erreur animée */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            {/* Cercle pulsant rouge */}
            <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse" />
            
            {/* Icône principale */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <ServerCrash className="w-16 h-16 text-white animate-bounce" />
            </div>
          </div>

          {/* Code d'erreur */}
          <div className="text-6xl font-black text-gray-200 mb-4">
            {errorCode}
          </div>

          {/* Titre */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-3">
            {title}
          </h1>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
            {description}
          </p>

          {/* Message d'erreur technique (si fourni) */}
          {errorMessage && errorCode !== 500 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">
                    Détails techniques
                  </p>
                  <p className="text-sm text-red-700 font-mono">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="secondary" 
              icon={<RefreshCw className="w-4 h-4" />} 
              onClick={handleRefresh}
              size="lg"
            >
              Actualiser la page
            </Button>
            <Button 
              icon={<Home className="w-4 h-4" />} 
              onClick={() => navigate('/dashboard')}
              size="lg"
            >
              Retour au tableau de bord
            </Button>
          </div>

          {/* Informations supplémentaires */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Si le problème persiste, contactez le support technique à{' '}
              <a 
                href="mailto:support@votre-universite.edu" 
                className="text-primary-600 hover:underline font-medium"
              >
                support@votre-universite.edu
              </a>
            </p>
          </div>
        </div>

        {/* Conseils */}
        <div className="mt-6 bg-white/50 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50 mb-3">
            💡 Que faire en attendant ?
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Actualisez la page dans quelques minutes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Vérifiez votre connexion Internet</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Essayez de vous déconnecter puis reconnecter</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Contactez le support si l'erreur persiste</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

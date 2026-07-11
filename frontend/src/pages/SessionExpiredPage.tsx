import { useNavigate } from 'react-router-dom'
import { Clock, LogIn, Shield } from 'lucide-react'
import { Button } from '../components/ui'

export default function SessionExpiredPage() {
  const navigate = useNavigate()

  const handleLogin = () => {
    // Nettoyer le localStorage
    localStorage.clear()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icône d'horloge animée */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            {/* Cercle pulsant bleu */}
            <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse" />
            
            {/* Icône principale */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <Clock className="w-16 h-16 text-white" />
            </div>

            {/* Badge de cadenas */}
            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center border-4 border-white">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-3">
            Session expirée
          </h1>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
            Votre session a expiré pour des raisons de sécurité. Veuillez vous reconnecter pour continuer.
          </p>

          {/* Raisons */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              Pourquoi ma session a-t-elle expiré ?
            </p>
            <ul className="space-y-1 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Inactivité prolongée (plus de 30 minutes)</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Connexion depuis un autre appareil</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Expiration du token de sécurité</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Déconnexion automatique pour votre sécurité</span>
              </li>
            </ul>
          </div>

          {/* Action de reconnexion */}
          <Button 
            className="w-full"
            icon={<LogIn className="w-4 h-4" />} 
            onClick={handleLogin}
            size="lg"
          >
            Se reconnecter
          </Button>

          {/* Note de sécurité */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-start gap-3 text-left">
              <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-1">
                  Protection de votre compte
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Cette mesure de sécurité protège vos données personnelles et académiques contre tout accès non autorisé.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Conseils de sécurité */}
        <div className="mt-6 bg-white/50 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50 mb-3">
            🔐 Conseils de sécurité
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Ne partagez jamais votre mot de passe</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Déconnectez-vous sur les ordinateurs publics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Utilisez un mot de passe fort et unique</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Activez l'authentification à deux facteurs si disponible</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Besoin d'aide ?{' '}
            <a 
              href="mailto:support@votre-universite.edu"
              className="text-primary-600 hover:underline font-medium"
            >
              Contactez le support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

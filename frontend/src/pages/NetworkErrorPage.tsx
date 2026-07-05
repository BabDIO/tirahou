import { WifiOff, RefreshCw, Settings } from 'lucide-react'
import { Button } from '../components/ui'

export default function NetworkErrorPage() {
  const handleRefresh = () => {
    window.location.reload()
  }

  const handleCheckConnection = () => {
    // Ouvrir les paramètres réseau du système
    if (navigator.onLine) {
      alert('Vous semblez être connecté à Internet. Le problème pourrait venir du serveur.')
    } else {
      alert('Vous êtes actuellement hors ligne. Vérifiez votre connexion Internet.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icône réseau animée */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            {/* Cercle pulsant gris */}
            <div className="absolute inset-0 bg-gray-100 rounded-full animate-pulse" />
            
            {/* Icône principale */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-gray-500 to-slate-600 rounded-full flex items-center justify-center shadow-lg">
              <WifiOff className="w-16 h-16 text-white" />
            </div>

            {/* Indicateur de signal */}
            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center border-4 border-white">
              <span className="text-white text-xl font-bold">✕</span>
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Pas de connexion Internet
          </h1>

          {/* Description */}
          <p className="text-gray-600 mb-8 text-lg">
            Impossible de se connecter au serveur. Vérifiez votre connexion Internet et réessayez.
          </p>

          {/* Statut de connexion */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${navigator.onLine ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <p className="text-sm font-medium text-gray-900">
                Statut : {navigator.onLine ? 'Connecté' : 'Hors ligne'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              icon={<RefreshCw className="w-4 h-4" />} 
              onClick={handleRefresh}
              size="lg"
            >
              Réessayer
            </Button>
            <Button 
              variant="secondary"
              icon={<Settings className="w-4 h-4" />} 
              onClick={handleCheckConnection}
              size="lg"
            >
              Vérifier la connexion
            </Button>
          </div>
        </div>

        {/* Guide de dépannage */}
        <div className="mt-6 bg-white/50 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">
            🔧 Guide de dépannage
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
                1
              </span>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Vérifiez votre WiFi ou données mobiles</p>
                <p className="text-xs">Assurez-vous que votre appareil est connecté à Internet</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
                2
              </span>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Désactivez le mode Avion</p>
                <p className="text-xs">Si activé, désactivez-le dans les paramètres</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
                3
              </span>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Redémarrez votre routeur</p>
                <p className="text-xs">Débranchez-le pendant 30 secondes puis rebranchez-le</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
                4
              </span>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Vérifiez les paramètres du pare-feu</p>
                <p className="text-xs">Assurez-vous que notre application n'est pas bloquée</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
                5
              </span>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Contactez votre fournisseur d'accès</p>
                <p className="text-xs">Si le problème persiste, il peut y avoir une panne</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Informations techniques */}
        <div className="mt-6 bg-white rounded-xl p-6">
          <details className="cursor-pointer">
            <summary className="text-sm font-bold text-gray-900 mb-3 hover:text-primary-600 transition">
              🔍 Informations techniques
            </summary>
            <div className="space-y-2 text-xs font-mono bg-slate-50 p-4 rounded-lg mt-3">
              <p><span className="text-gray-500">Status:</span> <span className="text-red-600 font-bold">{navigator.onLine ? 'ONLINE' : 'OFFLINE'}</span></p>
              <p><span className="text-gray-500">User Agent:</span> {navigator.userAgent}</p>
              <p><span className="text-gray-500">Language:</span> {navigator.language}</p>
              <p><span className="text-gray-500">Platform:</span> {navigator.platform}</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

import { Construction, Clock, Mail, RefreshCw } from 'lucide-react'
import { Button } from '../components/ui'

interface MaintenancePageProps {
  estimatedTime?: string
  reason?: string
  contactEmail?: string
}

export default function MaintenancePage({ 
  estimatedTime = '2 heures',
  reason = 'Maintenance planifiée pour améliorer nos services',
  contactEmail = 'support@votre-universite.edu'
}: MaintenancePageProps) {
  
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icône de maintenance animée */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            {/* Cercle pulsant orange */}
            <div className="absolute inset-0 bg-orange-100 rounded-full animate-pulse" />
            
            {/* Icône principale */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
              <Construction className="w-16 h-16 text-white animate-bounce" />
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-3">
            🔧 Maintenance en cours
          </h1>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
            Notre plateforme est temporairement indisponible pour maintenance.
          </p>

          {/* Raison */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-900">
              <strong>Raison :</strong> {reason}
            </p>
          </div>

          {/* Temps estimé */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Clock className="w-5 h-5 text-orange-600" />
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Temps estimé :</strong>{' '}
              <span className="text-orange-600 font-bold">{estimatedTime}</span>
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              className="w-full sm:w-auto"
              icon={<RefreshCw className="w-4 h-4" />} 
              onClick={handleRefresh}
              size="lg"
            >
              Vérifier la disponibilité
            </Button>
          </div>

          {/* Contact */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Mail className="w-4 h-4" />
              <span>
                Questions ? Contactez-nous à{' '}
                <a 
                  href={`mailto:${contactEmail}`}
                  className="text-primary-600 hover:underline font-medium"
                >
                  {contactEmail}
                </a>
              </span>
            </div>
          </div>
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-6 bg-white/50 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50 mb-3">
            📋 Ce que nous faisons
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span>Mise à jour des systèmes de sécurité</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span>Optimisation des performances</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span>Ajout de nouvelles fonctionnalités</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">✓</span>
              <span>Correction de bugs</span>
            </li>
          </ul>
        </div>

        {/* Timeline estimée */}
        <div className="mt-6 bg-white rounded-xl p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50 mb-4">
            ⏱️ Chronologie estimée
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">Début de maintenance</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sauvegarde des données</p>
              </div>
              <span className="text-xs text-green-600 font-medium">Terminé</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">Mise à jour en cours</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Installation des améliorations</p>
              </div>
              <span className="text-xs text-orange-600 font-medium">En cours</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">Tests de vérification</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Validation des changements</p>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">À venir</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">Retour en ligne</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Restauration du service</p>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">À venir</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Merci de votre patience et de votre compréhension 🙏
          </p>
        </div>
      </div>
    </div>
  )
}

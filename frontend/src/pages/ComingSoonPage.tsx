import { useNavigate } from 'react-router-dom'
import { Rocket, ArrowLeft, Bell, Calendar } from 'lucide-react'
import { Button } from '../components/ui'
import { useState } from 'react'

interface ComingSoonPageProps {
  featureName?: string
  estimatedDate?: string
  description?: string
}

export default function ComingSoonPage({
  featureName = 'Cette fonctionnalité',
  estimatedDate = 'Bientôt',
  description = 'Nous travaillons dur pour vous apporter cette nouvelle fonctionnalité.'
}: ComingSoonPageProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      // TODO: Implémenter l'inscription à la newsletter
      setSubscribed(true)
      setTimeout(() => setSubscribed(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icône de fusée animée */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            {/* Trainée de fumée */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-orange-100 to-transparent rounded-full blur-xl animate-pulse" />
            
            {/* Fusée */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Rocket className="w-16 h-16 text-white" style={{ transform: 'rotate(-45deg)' }} />
            </div>

            {/* Étoiles */}
            <div className="absolute top-0 right-0 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
            <div className="absolute top-8 right-2 w-2 h-2 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-4 left-0 w-2 h-2 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-sm font-semibold mb-4">
            <Calendar className="w-4 h-4" />
            {estimatedDate}
          </div>

          {/* Titre */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {featureName} arrive bientôt !
          </h1>

          {/* Description */}
          <p className="text-gray-600 mb-8 text-lg">
            {description}
          </p>

          {/* Barre de progression simulée */}
          <div className="mb-8">
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Progression du développement</span>
              <span>75%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full animate-pulse" style={{ width: '75%' }} />
            </div>
          </div>

          {/* Formulaire de notification */}
          {!subscribed ? (
            <form onSubmit={handleNotify} className="mb-6">
              <p className="text-sm text-gray-600 mb-3">
                Soyez notifié dès le lancement
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@exemple.com"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition"
                  required
                />
                <Button
                  type="submit"
                  icon={<Bell className="w-4 h-4" />}
                  className="whitespace-nowrap"
                >
                  Me notifier
                </Button>
              </div>
            </form>
          ) : (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-800 font-medium flex items-center justify-center gap-2">
                <span className="text-2xl">✓</span>
                Merci ! Vous serez notifié au lancement.
              </p>
            </div>
          )}

          {/* Bouton retour */}
          <Button
            variant="secondary"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto"
          >
            Retour
          </Button>
        </div>

        {/* Fonctionnalités à venir */}
        <div className="mt-6 bg-white/50 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">
            ✨ Ce qui vous attend
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold">1</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Interface intuitive</p>
                <p className="text-xs">Design moderne et facile à utiliser</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-pink-600 font-bold">2</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Performance optimale</p>
                <p className="text-xs">Rapidité et fluidité garanties</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-orange-600 font-bold">3</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Nouvelles possibilités</p>
                <p className="text-xs">Fonctionnalités innovantes et pratiques</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Timeline de développement */}
        <div className="mt-6 bg-white rounded-xl p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            📅 Feuille de route
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Phase 1 : Conception</p>
              </div>
              <span className="text-xs text-green-600 font-medium">✓ Terminé</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Phase 2 : Développement</p>
              </div>
              <span className="text-xs text-green-600 font-medium">✓ Terminé</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Phase 3 : Tests</p>
              </div>
              <span className="text-xs text-orange-600 font-medium">En cours</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Phase 4 : Lancement</p>
              </div>
              <span className="text-xs text-gray-400 font-medium">Bientôt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

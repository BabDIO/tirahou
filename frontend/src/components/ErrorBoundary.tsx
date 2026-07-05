import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from './ui'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log l'erreur dans un service de monitoring (ex: Sentry, LogRocket)
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
    })

    // TODO: Envoyer l'erreur à un service de monitoring
    // logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      // Si un fallback custom est fourni, l'utiliser
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Sinon, afficher la page d'erreur par défaut
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            {/* Carte principale */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              {/* Icône d'erreur */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* Titre */}
              <h1 className="text-3xl font-bold text-gray-900 mb-3 text-center">
                Une erreur est survenue
              </h1>

              {/* Description */}
              <p className="text-gray-600 mb-6 text-center">
                Désolé, quelque chose s'est mal passé. Notre équipe a été notifiée et travaille sur le problème.
              </p>

              {/* Message d'erreur (en mode développement) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-red-900 mb-2">
                    🐛 Détails techniques (développement)
                  </summary>
                  <div className="mt-3 space-y-3">
                    {/* Message d'erreur */}
                    <div>
                      <p className="text-xs font-semibold text-red-900 mb-1">Message:</p>
                      <pre className="text-xs bg-white p-3 rounded-lg overflow-auto border border-red-200">
                        {this.state.error.message}
                      </pre>
                    </div>

                    {/* Stack trace */}
                    {this.state.error.stack && (
                      <div>
                        <p className="text-xs font-semibold text-red-900 mb-1">Stack trace:</p>
                        <pre className="text-xs bg-white p-3 rounded-lg overflow-auto max-h-48 border border-red-200">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}

                    {/* Component stack */}
                    {this.state.errorInfo && (
                      <div>
                        <p className="text-xs font-semibold text-red-900 mb-1">Component stack:</p>
                        <pre className="text-xs bg-white p-3 rounded-lg overflow-auto max-h-48 border border-red-200">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="secondary"
                  icon={<RefreshCw className="w-4 h-4" />}
                  onClick={this.handleReset}
                  className="flex-1"
                >
                  Réessayer
                </Button>
                <Button
                  variant="secondary"
                  icon={<RefreshCw className="w-4 h-4" />}
                  onClick={this.handleReload}
                  className="flex-1"
                >
                  Recharger
                </Button>
                <Button
                  icon={<Home className="w-4 h-4" />}
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  Accueil
                </Button>
              </div>

              {/* Support */}
              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-600">
                  Si le problème persiste, contactez le support à{' '}
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
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Bug className="w-4 h-4 text-orange-600" />
                Que s'est-il passé ?
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Une erreur inattendue s'est produite dans l'application. Cela peut être dû à :
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">•</span>
                  <span>Un problème temporaire avec le serveur</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">•</span>
                  <span>Des données corrompues dans le cache du navigateur</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">•</span>
                  <span>Une incompatibilité avec votre navigateur</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">•</span>
                  <span>Un bug dans l'application (nous y travaillons !)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

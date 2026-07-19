/**
 * Export centralisé de toutes les pages de statut et d'erreur
 */

// Pages d'erreur
export { default as NotFoundPage } from './NotFoundPage'
export { default as UnauthorizedPage } from './UnauthorizedPage'
export { default as ServerErrorPage } from './ServerErrorPage'
export { default as NetworkErrorPage } from './NetworkErrorPage'
export { default as SessionExpiredPage } from './SessionExpiredPage'

// Pages de statut
export { default as LoadingPage } from './LoadingPage'
export { default as MaintenancePage } from './MaintenancePage'

// Page principale
export { default as LandingPage } from './LandingPage'

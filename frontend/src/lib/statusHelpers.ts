/**
 * Helpers pour gérer les statuts et badges de manière cohérente
 */

import {
  DOCUMENT_STATUS,
  INVOICE_STATUS,
  GRADE_STATUS,
  INTERNSHIP_STATUS,
  THESIS_STATUS,
} from './constants'

type StatusConfig = {
  label: string
  color: string
  badge: string
}

/**
 * Obtenir la configuration d'un statut de document
 */
export const getDocumentStatus = (status: string): StatusConfig => {
  return DOCUMENT_STATUS[status as keyof typeof DOCUMENT_STATUS] || {
    label: status,
    color: 'gray',
    badge: 'badge-gray',
  }
}

/**
 * Obtenir la configuration d'un statut de facture
 */
export const getInvoiceStatus = (status: string): StatusConfig => {
  return INVOICE_STATUS[status as keyof typeof INVOICE_STATUS] || {
    label: status,
    color: 'gray',
    badge: 'badge-gray',
  }
}

/**
 * Obtenir la configuration d'un statut de note
 */
export const getGradeStatus = (status: string): StatusConfig => {
  return GRADE_STATUS[status as keyof typeof GRADE_STATUS] || {
    label: status,
    color: 'gray',
    badge: 'badge-gray',
  }
}

/**
 * Obtenir la configuration d'un statut de stage
 */
export const getInternshipStatus = (status: string): StatusConfig => {
  return INTERNSHIP_STATUS[status as keyof typeof INTERNSHIP_STATUS] || {
    label: status,
    color: 'gray',
    badge: 'badge-gray',
  }
}

/**
 * Obtenir la configuration d'un statut de thèse
 */
export const getThesisStatus = (status: string): StatusConfig => {
  return THESIS_STATUS[status as keyof typeof THESIS_STATUS] || {
    label: status,
    color: 'gray',
    badge: 'badge-gray',
  }
}

/**
 * Obtenir la classe CSS du badge pour un statut générique
 */
export const getStatusBadgeClass = (status: string): string => {
  const statusMap: Record<string, string> = {
    // Documents
    genere: 'badge-blue',
    signe: 'badge-yellow',
    delivre: 'badge-green',
    annule: 'badge-red',
    depose: 'badge-blue',
    en_verification: 'badge-yellow',
    valide: 'badge-green',
    validee: 'badge-green',
    rejete: 'badge-red',
    // Factures
    emise: 'badge-gray',
    partiellement_payee: 'badge-yellow',
    payee: 'badge-green',
    en_retard: 'badge-red',
    // Notes
    en_attente: 'badge-yellow',
    contestee: 'badge-red',
    publiee: 'badge-blue',
    // Stages
    en_recherche: 'badge-gray',
    convention_signee: 'badge-blue',
    en_cours: 'badge-yellow',
    termine: 'badge-purple',
    abandonne: 'badge-red',
    // Thèses
    sujet_propose: 'badge-gray',
    sujet_valide: 'badge-blue',
    en_redaction: 'badge-yellow',
    soutenu: 'badge-emerald',
    // Candidatures
    brouillon: 'badge-gray',
    soumise: 'badge-blue',
    en_examen: 'badge-yellow',
    admise: 'badge-green',
    refusee: 'badge-red',
    liste_attente: 'badge-orange',
    // Inscriptions
    confirmee: 'badge-green',
    annulee: 'badge-red',
  }

  return statusMap[status] || 'badge-gray'
}

/**
 * Calculer la note finale à partir du CC et de l'examen
 */
export const calculateFinalGrade = (
  ccGrade: number,
  examGrade: number,
  ccWeight: number = 0.4
): number => {
  return Number((ccGrade * ccWeight + examGrade * (1 - ccWeight)).toFixed(2))
}

/**
 * Obtenir la mention en fonction de la note
 */
export const getMention = (grade: number): string => {
  if (grade < 10) return 'Insuffisant'
  if (grade < 12) return 'Passable'
  if (grade < 14) return 'Assez bien'
  if (grade < 16) return 'Bien'
  return 'Très bien'
}

/**
 * Obtenir la couleur en fonction de la note
 */
export const getGradeColor = (grade: number | null): string => {
  if (grade === null) return 'text-gray-400'
  if (grade < 10) return 'text-red-600'
  if (grade < 12) return 'text-orange-600'
  if (grade < 14) return 'text-yellow-600'
  if (grade < 16) return 'text-blue-600'
  return 'text-emerald-600'
}

/**
 * Formater une note pour l'affichage
 */
export const formatGrade = (grade: number | null): string => {
  if (grade === null) return '—'
  return `${grade.toFixed(2)}/20`
}

/**
 * Valider une note (entre 0 et 20)
 */
export const isValidGrade = (grade: number): boolean => {
  return grade >= 0 && grade <= 20
}

/**
 * Calculer le pourcentage de paiement
 */
export const calculatePaymentPercentage = (paid: number, total: number): number => {
  if (total === 0) return 0
  return Math.round((paid / total) * 100)
}

/**
 * Obtenir la couleur de progression du paiement
 */
export const getPaymentProgressColor = (percentage: number): string => {
  if (percentage >= 100) return 'bg-emerald-500'
  if (percentage >= 80) return 'bg-green-500'
  if (percentage >= 50) return 'bg-amber-500'
  if (percentage >= 25) return 'bg-orange-500'
  return 'bg-red-500'
}

/**
 * Vérifier si une date est passée
 */
export const isPastDate = (date: string): boolean => {
  return new Date(date) < new Date()
}

/**
 * Vérifier si une facture est en retard
 */
export const isInvoiceOverdue = (dueDate: string, status: string): boolean => {
  return status !== 'payee' && isPastDate(dueDate)
}

/**
 * Obtenir le label d'un type de document
 */
export const getDocumentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    certificat_scolarite: 'Certificat de scolarité',
    certificat_frequentation: 'Certificat de fréquentation',
    releve_notes: 'Relevé de notes',
    attestation_reussite: 'Attestation de réussite',
    carte_etudiant: 'Carte étudiant',
    attestation_fin_cycle: 'Attestation de fin de cycle',
  }
  return labels[type] || type
}

/**
 * Obtenir le label d'un mode de paiement
 */
export const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    caisse: 'Caisse',
    mobile_money: 'Mobile Money',
    virement: 'Virement bancaire',
    carte_bancaire: 'Carte bancaire',
    cheque: 'Chèque',
  }
  return labels[method] || method
}

/**
 * Obtenir l'icône d'un mode de paiement
 */
export const getPaymentMethodIcon = (method: string): string => {
  const icons: Record<string, string> = {
    caisse: '💵',
    mobile_money: '📱',
    virement: '🏦',
    carte_bancaire: '💳',
    cheque: '📄',
  }
  return icons[method] || '💰'
}

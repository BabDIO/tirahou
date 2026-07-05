/**
 * Constantes globales de l'application
 */

// ── Types de documents ────────────────────────────────────────────────────────
export const DOCUMENT_TYPES = [
  { value: 'certificat_scolarite', label: 'Certificat de scolarité', icon: '📋' },
  { value: 'certificat_frequentation', label: 'Certificat de fréquentation', icon: '✅' },
  { value: 'releve_notes', label: 'Relevé de notes', icon: '📊' },
  { value: 'attestation_reussite', label: 'Attestation de réussite', icon: '🏆' },
  { value: 'carte_etudiant', label: 'Carte étudiant', icon: '🎓' },
  { value: 'attestation_fin_cycle', label: 'Attestation de fin de cycle', icon: '🎯' },
] as const

// ── Statuts de documents ──────────────────────────────────────────────────────
export const DOCUMENT_STATUS = {
  // Documents générés
  genere: { label: 'Généré', color: 'blue', badge: 'badge-blue' },
  signe: { label: 'Signé', color: 'yellow', badge: 'badge-yellow' },
  delivre: { label: 'Délivré', color: 'green', badge: 'badge-green' },
  annule: { label: 'Annulé', color: 'red', badge: 'badge-red' },
  // Documents déposés
  depose: { label: 'Déposé', color: 'blue', badge: 'badge-blue' },
  en_verification: { label: 'En vérification', color: 'yellow', badge: 'badge-yellow' },
  valide: { label: 'Validé', color: 'green', badge: 'badge-green' },
  rejete: { label: 'Rejeté', color: 'red', badge: 'badge-red' },
} as const

// ── Statuts de factures ───────────────────────────────────────────────────────
export const INVOICE_STATUS = {
  emise: { label: 'Émise', color: 'gray', badge: 'badge-gray' },
  partiellement_payee: { label: 'Partiellement payée', color: 'yellow', badge: 'badge-yellow' },
  payee: { label: 'Payée', color: 'green', badge: 'badge-green' },
  annulee: { label: 'Annulée', color: 'red', badge: 'badge-red' },
  en_retard: { label: 'En retard', color: 'red', badge: 'badge-red' },
} as const

// ── Statuts de notes ──────────────────────────────────────────────────────────
export const GRADE_STATUS = {
  en_attente: { label: 'En attente', color: 'yellow', badge: 'badge-yellow' },
  validee: { label: 'Validée', color: 'green', badge: 'badge-green' },
  contestee: { label: 'Contestée', color: 'red', badge: 'badge-red' },
  publiee: { label: 'Publiée', color: 'blue', badge: 'badge-blue' },
} as const

// ── Statuts de stages ─────────────────────────────────────────────────────────
export const INTERNSHIP_STATUS = {
  en_recherche: { label: 'En recherche', color: 'gray', badge: 'badge-gray' },
  convention_signee: { label: 'Convention signée', color: 'blue', badge: 'badge-blue' },
  en_cours: { label: 'En cours', color: 'yellow', badge: 'badge-yellow' },
  termine: { label: 'Terminé', color: 'purple', badge: 'badge-purple' },
  valide: { label: 'Validé', color: 'green', badge: 'badge-green' },
  abandonne: { label: 'Abandonné', color: 'red', badge: 'badge-red' },
} as const

// ── Statuts de thèses ─────────────────────────────────────────────────────────
export const THESIS_STATUS = {
  sujet_propose: { label: 'Sujet proposé', color: 'gray', badge: 'badge-gray' },
  sujet_valide: { label: 'Sujet validé', color: 'blue', badge: 'badge-blue' },
  en_redaction: { label: 'En rédaction', color: 'yellow', badge: 'badge-yellow' },
  depose: { label: 'Déposé', color: 'purple', badge: 'badge-purple' },
  soutenu: { label: 'Soutenu', color: 'emerald', badge: 'badge-emerald' },
  rejete: { label: 'Rejeté', color: 'red', badge: 'badge-red' },
} as const

// ── Modes de paiement ─────────────────────────────────────────────────────────
export const PAYMENT_METHODS = [
  { value: 'caisse', label: 'Caisse', icon: '💵' },
  { value: 'mobile_money', label: 'Mobile Money', icon: '📱' },
  { value: 'virement', label: 'Virement', icon: '🏦' },
  { value: 'carte_bancaire', label: 'Carte Bancaire', icon: '💳' },
  { value: 'cheque', label: 'Chèque', icon: '📄' },
] as const

// ── Types de réduction ────────────────────────────────────────────────────────
export const DISCOUNT_TYPES = [
  { value: 'bourse', label: 'Bourse', icon: '🎓' },
  { value: 'exoneration', label: 'Exonération', icon: '✅' },
  { value: 'remise', label: 'Remise', icon: '💰' },
  { value: 'ristourne', label: 'Ristourne', icon: '🎁' },
] as const

// ── Mentions ──────────────────────────────────────────────────────────────────
export const MENTIONS = {
  passable: { label: 'Passable', minGrade: 10, maxGrade: 11.99, color: 'gray' },
  assez_bien: { label: 'Assez bien', minGrade: 12, maxGrade: 13.99, color: 'blue' },
  bien: { label: 'Bien', minGrade: 14, maxGrade: 15.99, color: 'green' },
  tres_bien: { label: 'Très bien', minGrade: 16, maxGrade: 20, color: 'emerald' },
} as const

// ── Seuils de notes ───────────────────────────────────────────────────────────
export const GRADE_THRESHOLDS = {
  min: 0,
  max: 20,
  pass: 10,
  step: 0.25,
  ccWeight: 0.4,
  examWeight: 0.6,
} as const

// ── Formats de date ───────────────────────────────────────────────────────────
export const DATE_FORMATS = {
  short: 'dd/MM/yyyy',
  medium: 'dd MMM yyyy',
  long: 'dd MMMM yyyy',
  full: 'EEEE dd MMMM yyyy',
  time: 'HH:mm',
  datetime: 'dd/MM/yyyy HH:mm',
} as const

// ── Pagination ────────────────────────────────────────────────────────────────
export const PAGINATION = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
} as const

// ── Validation ────────────────────────────────────────────────────────────────
export const VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+\d{1,3}[- ]?)?\d{8,}$/,
  studentNumber: /^[A-Z0-9]{6,12}$/,
  verificationCode: /^VER-[A-Z0-9]{12}$/,
} as const

// ── Tailles de fichiers ───────────────────────────────────────────────────────
export const FILE_SIZE_LIMITS = {
  avatar: 2 * 1024 * 1024, // 2 MB
  document: 10 * 1024 * 1024, // 10 MB
  resource: 50 * 1024 * 1024, // 50 MB
} as const

// ── Types de fichiers acceptés ────────────────────────────────────────────────
export const ACCEPTED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  spreadsheet: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  all: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const

// ── Messages d'erreur ─────────────────────────────────────────────────────────
export const ERROR_MESSAGES = {
  network: 'Erreur de connexion au serveur. Vérifiez votre connexion Internet.',
  unauthorized: 'Session expirée. Veuillez vous reconnecter.',
  forbidden: 'Vous n\'avez pas les permissions nécessaires pour cette action.',
  notFound: 'Ressource introuvable.',
  serverError: 'Erreur serveur. Veuillez réessayer plus tard.',
  validationError: 'Erreur de validation. Vérifiez les données saisies.',
  generic: 'Une erreur est survenue. Veuillez réessayer.',
} as const

// ── URLs ──────────────────────────────────────────────────────────────────────
export const URLS = {
  verify: (code: string) => `/verify/${code}`,
  studentProfile: (id: string) => `/students/${id}`,
  teacherProfile: (id: string) => `/teachers/${id}`,
  programDetails: (id: string) => `/programs/${id}`,
} as const

// ── Rôles utilisateurs ────────────────────────────────────────────────────────
export const USER_ROLES = {
  admin: 'Administrateur',
  scolarite: 'Scolarité',
  responsable_pedagogique: 'Responsable Pédagogique',
  enseignant: 'Enseignant',
  etudiant: 'Étudiant',
  parent: 'Parent',
} as const

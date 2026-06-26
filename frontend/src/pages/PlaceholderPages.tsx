import { Construction } from 'lucide-react'

interface PlaceholderProps { title: string; description?: string }

export function PlaceholderPage({ title, description }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-primary-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500 max-w-md">
        {description ?? 'Ce module est en cours de développement. Il sera disponible prochainement.'}
      </p>
    </div>
  )
}

// ── Pages Phase 4 (extensions stratégiques) ───────────────────────────────────
// Ces pages seront implémentées dans les phases ultérieures du projet

/** Marketplace de cours — Phase 4 */
export const MarketplacePage = () => (
  <PlaceholderPage
    title="Marketplace de cours"
    description="La marketplace permettra la publication et la vente de cours par les enseignants. Disponible en Phase 4."
  />
)

/** Micro-certifications & badges — Phase 4 */
export const MicroCertPage = () => (
  <PlaceholderPage
    title="Micro-certifications & Badges"
    description="Parcours modulaires et badges numériques pour valoriser les compétences. Disponible en Phase 4."
  />
)

/** Wallet interne / crédits académiques — Phase 4 */
export const WalletPage = () => (
  <PlaceholderPage
    title="Portefeuille numérique"
    description="Gestion des crédits académiques et récompenses. Disponible en Phase 4."
  />
)

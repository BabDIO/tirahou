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
// Micro-certifications et Wallet sont implémentées (voir pages/student/MyWalletPage.tsx,
// pages/student/MyCertificationsPage.tsx, pages/admin/GamificationPage.tsx).

/** Marketplace de cours — Phase 4 */
export const MarketplacePage = () => (
  <PlaceholderPage
    title="Marketplace de cours"
    description="La marketplace permettra la publication et la vente de cours par les enseignants. Disponible en Phase 4."
  />
)

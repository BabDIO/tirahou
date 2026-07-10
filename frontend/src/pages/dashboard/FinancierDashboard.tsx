import { useAuthStore } from '../../store/authStore'
import { CreditCard, TrendingUp, DollarSign, Sparkles } from 'lucide-react'
import { StatsCard, Card, Alert } from '../../components/ui'

export default function FinancierDashboard() {
  const { user } = useAuthStore()
  
  return (
    <div className="space-y-6 p-6">
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Espace Financier</h1>
            <p className="text-emerald-200">Bonjour, {user?.full_name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Revenus" value="10.85M XOF" icon={<CreditCard className="w-5 h-5" />} color="bg-green-500" />
        <StatsCard title="Factures" value="1,245" icon={<DollarSign className="w-5 h-5" />} color="bg-emerald-500" />
        <StatsCard title="Taux collecte" value="86.8%" icon={<TrendingUp className="w-5 h-5" />} color="bg-teal-500" />
        <StatsCard title="Bourses" value="42" icon={<Sparkles className="w-5 h-5" />} color="bg-lime-500" />
      </div>

      <Alert type="info">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-semibold text-green-900">Dashboard Financier</p>
            <p className="text-sm text-green-700">
              Interface simplifiée pour le rôle admin financier.
            </p>
          </div>
        </div>
      </Alert>
    </div>
  )
}
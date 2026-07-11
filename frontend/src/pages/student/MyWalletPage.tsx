import { useQuery } from '@tanstack/react-query'
import { Wallet, TrendingUp, TrendingDown, Award, Sparkles, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { analyticsApi } from '../../api'
import { Card, StatsCard, Badge, Spinner } from '../../components/ui'
import { cn } from '../../lib/utils'

interface WalletTransaction {
  id: string
  type: 'credit' | 'debit' | 'reward' | 'purchase'
  type_display: string
  amount: string
  description: string
  created_at: string
}

interface WalletData {
  balance: string
  total_earned: string
  total_spent: string
  transactions: WalletTransaction[]
}

interface StudentBadge {
  id: string
  awarded_at: string
  reason: string
  badge_detail: {
    id: string
    name: string
    description: string
    type: string
    type_display: string
    points: number
  }
}

export default function MyWalletPage() {
  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ['my-wallet'],
    queryFn: () => analyticsApi.getMyWallet().then(r => r.data as WalletData),
  })

  const { data: badges, isLoading: loadingBadges } = useQuery({
    queryKey: ['my-badges'],
    queryFn: () => analyticsApi.getStudentBadges().then(r => (r.data.results ?? r.data) as StudentBadge[]),
  })

  if (loadingWallet) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner text="Chargement de votre portefeuille..." />
      </div>
    )
  }

  const balance = Number(wallet?.balance ?? 0)
  const totalEarned = Number(wallet?.total_earned ?? 0)
  const totalSpent = Number(wallet?.total_spent ?? 0)
  const transactions = wallet?.transactions ?? []

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-violet-200" />
              <span className="text-violet-200 text-sm font-medium">Mon portefeuille</span>
            </div>
            <h1 className="text-3xl font-bold text-white">{balance.toFixed(0)} pts</h1>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Solde actuel" value={`${balance.toFixed(0)} pts`}
          icon={<Wallet className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
        <StatsCard title="Total gagné" value={`${totalEarned.toFixed(0)} pts`}
          icon={<TrendingUp className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Total dépensé" value={`${totalSpent.toFixed(0)} pts`}
          icon={<TrendingDown className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Transaction history */}
        <Card title="Historique des transactions" subtitle={`${transactions.length} transaction(s)`}>
          <div className="space-y-2">
            {transactions.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Aucune transaction pour le moment.</p>
            )}
            {transactions.map((tx) => {
              const isCredit = tx.type === 'credit' || tx.type === 'reward'
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    isCredit ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                  )}>
                    {isCredit ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {tx.type_display} • {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className={cn('text-sm font-bold flex-shrink-0', isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                    {isCredit ? '+' : '−'}{Number(tx.amount).toFixed(0)} pts
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Badges */}
        <Card title="Mes badges" subtitle={loadingBadges ? undefined : `${badges?.length ?? 0} badge(s) obtenu(s)`}>
          {loadingBadges ? (
            <Spinner text="Chargement des badges..." />
          ) : !badges || badges.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-400 dark:text-gray-500">
              <Award className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Aucun badge obtenu pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {badges.map((sb) => (
                <div key={sb.id} className="p-3 border border-gray-100 dark:border-gray-700 rounded-xl">
                  <div className="flex items-start gap-2 mb-1">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{sb.badge_detail.name}</p>
                      <Badge label={sb.badge_detail.type_display} className="badge-purple" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sb.badge_detail.description}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1.5">
                    +{sb.badge_detail.points} pts • {new Date(sb.awarded_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

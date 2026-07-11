import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Award, Wallet, Plus, Trophy, Sparkles, Coins, Gift } from 'lucide-react'
import { analyticsApi } from '../../api'
import { Card, Button, Input, Textarea, Select, Badge, Spinner, Tabs, Modal } from '../../components/ui'
import api from '../../lib/axios'
import useDebounce from '../../hooks/useDebounce'
import toast from 'react-hot-toast'

const BADGE_TYPES = [
  { value: 'completion', label: 'Complétion de cours' },
  { value: 'excellence', label: 'Excellence académique' },
  { value: 'participation', label: 'Participation active' },
  { value: 'certification', label: 'Certification' },
  { value: 'skill', label: 'Compétence validée' },
]

const TX_TYPES = [
  { value: 'reward', label: 'Récompense' },
  { value: 'credit', label: 'Crédit' },
  { value: 'debit', label: 'Débit' },
  { value: 'purchase', label: 'Achat' },
]

interface BadgeItem {
  id: string
  name: string
  description: string
  type: string
  type_display: string
  points: number
  is_published: boolean
}

interface WalletItem {
  id: string
  student_name: string
  balance: string
  total_earned: string
  total_spent: string
}

interface StudentOption {
  id: string
  student_id: string
  full_name?: string
  user?: { first_name: string; last_name: string }
}

function StudentPicker({ value, onSelect }: { value: string; onSelect: (id: string, label: string) => void }) {
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 300)
  const { data: options } = useQuery({
    queryKey: ['student-search', debounced],
    queryFn: async () => {
      const res = await api.get('/people/students/', { params: { search: debounced } })
      return (res.data.results || res.data) as StudentOption[]
    },
    enabled: debounced.length >= 2,
  })

  if (value) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
        <span className="text-gray-900 dark:text-gray-100">{value}</span>
        <button type="button" onClick={() => onSelect('', '')} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
          Changer
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input placeholder="Rechercher un étudiant..." value={query} onChange={(e) => setQuery(e.target.value)} />
      {options && options.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {options.map((s) => {
            const label = s.full_name || (s.user ? `${s.user.first_name} ${s.user.last_name}` : s.student_id)
            return (
              <button
                type="button" key={s.id}
                onClick={() => { onSelect(s.id, `${label} — ${s.student_id}`); setQuery('') }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
              >
                {label} <span className="text-gray-400 text-xs">— {s.student_id}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function GamificationPage() {
  const [tab, setTab] = useState<'badges' | 'award' | 'wallets'>('badges')
  const [createBadgeOpen, setCreateBadgeOpen] = useState(false)
  const [badgeForm, setBadgeForm] = useState({ name: '', description: '', type: 'completion', points: 10, criteria: '', is_published: true })
  const [awardStudentId, setAwardStudentId] = useState('')
  const [awardStudentLabel, setAwardStudentLabel] = useState('')
  const [awardBadgeId, setAwardBadgeId] = useState('')
  const [awardReason, setAwardReason] = useState('')
  const [creditStudentId, setCreditStudentId] = useState('')
  const [creditStudentLabel, setCreditStudentLabel] = useState('')
  const [creditType, setCreditType] = useState('reward')
  const [creditAmount, setCreditAmount] = useState('')
  const [creditDescription, setCreditDescription] = useState('')
  const queryClient = useQueryClient()

  const { data: badges, isLoading: loadingBadges } = useQuery({
    queryKey: ['badges'],
    queryFn: () => analyticsApi.getBadges().then(r => (r.data.results ?? r.data) as BadgeItem[]),
  })

  const { data: wallets, isLoading: loadingWallets } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => analyticsApi.getWallets({ ordering: '-balance' }).then(r => (r.data.results ?? r.data) as WalletItem[]),
    enabled: tab === 'wallets',
  })

  const createBadgeMutation = useMutation({
    mutationFn: () => analyticsApi.createBadge(badgeForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] })
      toast.success('Badge créé avec succès')
      setCreateBadgeOpen(false)
      setBadgeForm({ name: '', description: '', type: 'completion', points: 10, criteria: '', is_published: true })
    },
    onError: () => toast.error('Erreur lors de la création du badge'),
  })

  const awardBadgeMutation = useMutation({
    mutationFn: () => analyticsApi.awardBadge({ student: awardStudentId, badge: awardBadgeId, reason: awardReason }),
    onSuccess: () => {
      toast.success('Badge attribué avec succès')
      setAwardStudentId(''); setAwardStudentLabel(''); setAwardBadgeId(''); setAwardReason('')
    },
    onError: () => toast.error('Erreur lors de l\'attribution (badge déjà attribué à cet étudiant ?)'),
  })

  const creditMutation = useMutation({
    mutationFn: () => analyticsApi.creditWallet({
      student: creditStudentId, type: creditType, amount: Number(creditAmount), description: creditDescription,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      toast.success('Portefeuille mis à jour avec succès')
      setCreditStudentId(''); setCreditStudentLabel(''); setCreditAmount(''); setCreditDescription('')
    },
    onError: () => toast.error('Erreur lors de la mise à jour du portefeuille'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Badges & Récompenses</h1>
          <p className="text-gray-500 text-sm mt-1">Gamification pédagogique — badges numériques et portefeuille de points</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateBadgeOpen(true)}>Créer un badge</Button>
      </div>

      <Tabs
        tabs={[
          { key: 'badges', label: 'Catalogue de badges', icon: <Award className="w-4 h-4" /> },
          { key: 'award', label: 'Attribution', icon: <Gift className="w-4 h-4" /> },
          { key: 'wallets', label: 'Portefeuilles', icon: <Wallet className="w-4 h-4" /> },
        ]}
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
        variant="underline"
      />

      {/* Badge catalog */}
      {tab === 'badges' && (
        loadingBadges ? <Spinner text="Chargement des badges..." /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(!badges || badges.length === 0) && (
              <p className="text-sm text-gray-400 col-span-full text-center py-8">Aucun badge créé pour le moment.</p>
            )}
            {badges?.map((b) => (
              <Card key={b.id} noPadding className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
                    <Badge label={b.type_display} className="badge-purple" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{b.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs font-bold text-amber-600">{b.points} pts</span>
                  <Badge label={b.is_published ? 'Publié' : 'Brouillon'} className={b.is_published ? 'badge-green' : 'badge-gray'} dot />
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Award badge / credit points */}
      {tab === 'award' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card title="Attribuer un badge" subtitle="Récompenser un étudiant pour un accomplissement">
            <div className="space-y-4">
              <div>
                <label className="label">Étudiant</label>
                <StudentPicker value={awardStudentLabel} onSelect={(id, label) => { setAwardStudentId(id); setAwardStudentLabel(label) }} />
              </div>
              <Select label="Badge" value={awardBadgeId} onChange={(e) => setAwardBadgeId(e.target.value)}>
                <option value="">Sélectionner un badge...</option>
                {badges?.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.points} pts)</option>)}
              </Select>
              <Textarea label="Raison (optionnel)" value={awardReason} onChange={(e) => setAwardReason(e.target.value)} rows={3} />
              <Button
                className="w-full"
                icon={<Sparkles className="w-4 h-4" />}
                disabled={!awardStudentId || !awardBadgeId || awardBadgeMutation.isPending}
                onClick={() => awardBadgeMutation.mutate()}
              >
                {awardBadgeMutation.isPending ? 'Attribution...' : 'Attribuer le badge'}
              </Button>
            </div>
          </Card>

          <Card title="Créditer des points" subtitle="Ajouter ou retirer des points du portefeuille d'un étudiant">
            <div className="space-y-4">
              <div>
                <label className="label">Étudiant</label>
                <StudentPicker value={creditStudentLabel} onSelect={(id, label) => { setCreditStudentId(id); setCreditStudentLabel(label) }} />
              </div>
              <Select label="Type" value={creditType} onChange={(e) => setCreditType(e.target.value)} options={TX_TYPES} />
              <Input label="Montant (points)" type="number" min="0" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
              <Input label="Description" value={creditDescription} onChange={(e) => setCreditDescription(e.target.value)} placeholder="Ex: Participation exceptionnelle au projet X" />
              <Button
                className="w-full"
                icon={<Coins className="w-4 h-4" />}
                disabled={!creditStudentId || !creditAmount || creditMutation.isPending}
                onClick={() => creditMutation.mutate()}
              >
                {creditMutation.isPending ? 'Enregistrement...' : 'Valider la transaction'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Wallets overview */}
      {tab === 'wallets' && (
        loadingWallets ? <Spinner text="Chargement des portefeuilles..." /> : (
          <Card title="Portefeuilles des étudiants" subtitle={`${wallets?.length ?? 0} portefeuille(s)`}>
            <div className="space-y-2">
              {(!wallets || wallets.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-8">Aucun portefeuille actif pour le moment.</p>
              )}
              {wallets?.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-900">{w.student_name}</span>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Gagné: <strong className="text-emerald-600">{Number(w.total_earned).toFixed(0)}</strong></span>
                    <span>Dépensé: <strong className="text-red-600">{Number(w.total_spent).toFixed(0)}</strong></span>
                    <span className="text-sm font-bold text-violet-600">{Number(w.balance).toFixed(0)} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )
      )}

      {/* Create badge modal */}
      <Modal open={createBadgeOpen} onClose={() => setCreateBadgeOpen(false)} title="Créer un badge">
        <div className="space-y-4">
          <Input label="Nom du badge" value={badgeForm.name} onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })} />
          <Textarea label="Description" value={badgeForm.description} onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })} rows={2} />
          <Select label="Type" value={badgeForm.type} onChange={(e) => setBadgeForm({ ...badgeForm, type: e.target.value })} options={BADGE_TYPES} />
          <Input label="Points" type="number" min="0" value={badgeForm.points} onChange={(e) => setBadgeForm({ ...badgeForm, points: Number(e.target.value) })} />
          <Textarea label="Critères d'obtention" value={badgeForm.criteria} onChange={(e) => setBadgeForm({ ...badgeForm, criteria: e.target.value })} rows={2} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={badgeForm.is_published} onChange={(e) => setBadgeForm({ ...badgeForm, is_published: e.target.checked })} />
            Publié (visible immédiatement)
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateBadgeOpen(false)}>Annuler</Button>
            <Button
              disabled={!badgeForm.name || !badgeForm.criteria || createBadgeMutation.isPending}
              onClick={() => createBadgeMutation.mutate()}
            >
              {createBadgeMutation.isPending ? 'Création...' : 'Créer le badge'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

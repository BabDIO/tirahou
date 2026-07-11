import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Award, Wallet, Plus, Trophy, Sparkles, Coins, Gift, GraduationCap, CheckCircle } from 'lucide-react'
import { analyticsApi, programsApi } from '../../api'
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

interface CertificationItem {
  id: string
  title: string
  code: string
  duration_hours: number
  credits: number
  status: string
  status_display: string
  is_free: boolean
  enrolled_count: number
}

interface StudentCertificationItem {
  id: string
  student_name: string
  status: string
  status_display: string
  score: string | null
  enrolled_at: string
  certification_detail: CertificationItem
}

const CERT_STATUS_BADGE: Record<string, string> = {
  enrolled: 'badge-blue', in_progress: 'badge-amber', completed: 'badge-green',
  certified: 'badge-purple', failed: 'badge-red',
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
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
              >
                {label} <span className="text-gray-400 dark:text-gray-500 text-xs">— {s.student_id}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function GamificationPage() {
  const [tab, setTab] = useState<'badges' | 'award' | 'wallets' | 'certifications'>('badges')
  const [createBadgeOpen, setCreateBadgeOpen] = useState(false)
  const [badgeForm, setBadgeForm] = useState({ name: '', description: '', type: 'completion', points: 10, criteria: '', is_published: true })
  const [createCertOpen, setCreateCertOpen] = useState(false)
  const [certForm, setCertForm] = useState({ title: '', code: '', description: '', program: '', duration_hours: 20, credits: 3, badge: '', price: 0, is_free: true, status: 'published' })
  const [certifyingId, setCertifyingId] = useState<string | null>(null)
  const [certifyScore, setCertifyScore] = useState('')
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

  const { data: certifications, isLoading: loadingCerts } = useQuery({
    queryKey: ['micro-certifications'],
    queryFn: () => analyticsApi.getMicroCertifications().then(r => (r.data.results ?? r.data) as CertificationItem[]),
    enabled: tab === 'certifications',
  })

  const { data: enrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['student-certifications'],
    queryFn: () => analyticsApi.getMyCertifications().then(r => (r.data.results ?? r.data) as StudentCertificationItem[]),
    enabled: tab === 'certifications',
  })

  const { data: programs } = useQuery({
    queryKey: ['programs-list'],
    queryFn: () => programsApi.getPrograms({ page_size: 200 }).then(r => r.data.results ?? []),
    enabled: createCertOpen,
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

  const createCertMutation = useMutation({
    mutationFn: () => analyticsApi.createMicroCertification({ ...certForm, program: certForm.program || null, badge: certForm.badge || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['micro-certifications'] })
      toast.success('Micro-certification créée avec succès')
      setCreateCertOpen(false)
      setCertForm({ title: '', code: '', description: '', program: '', duration_hours: 20, credits: 3, badge: '', price: 0, is_free: true, status: 'published' })
    },
    onError: () => toast.error('Erreur lors de la création (code déjà utilisé ?)'),
  })

  const certifyMutation = useMutation({
    mutationFn: (id: string) => analyticsApi.certifyStudent(id, { status: 'certified', score: certifyScore ? Number(certifyScore) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-certifications'] })
      toast.success('Étudiant certifié — badge attribué automatiquement s\'il est lié')
      setCertifyingId(null); setCertifyScore('')
    },
    onError: () => toast.error('Erreur lors de la certification'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Badges & Récompenses</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gamification pédagogique — badges numériques et portefeuille de points</p>
        </div>
        <div className="flex gap-2">
          {tab === 'certifications' ? (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateCertOpen(true)}>Créer une certification</Button>
          ) : (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateBadgeOpen(true)}>Créer un badge</Button>
          )}
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'badges', label: 'Catalogue de badges', icon: <Award className="w-4 h-4" /> },
          { key: 'award', label: 'Attribution', icon: <Gift className="w-4 h-4" /> },
          { key: 'wallets', label: 'Portefeuilles', icon: <Wallet className="w-4 h-4" /> },
          { key: 'certifications', label: 'Micro-certifications', icon: <GraduationCap className="w-4 h-4" /> },
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
              <p className="text-sm text-gray-400 dark:text-gray-500 col-span-full text-center py-8">Aucun badge créé pour le moment.</p>
            )}
            {badges?.map((b) => (
              <Card key={b.id} noPadding className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{b.name}</p>
                    <Badge label={b.type_display} className="badge-purple" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{b.description}</p>
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
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Aucun portefeuille actif pour le moment.</p>
              )}
              {wallets?.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{w.student_name}</span>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
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

      {/* Micro-certifications */}
      {tab === 'certifications' && (
        loadingCerts || loadingEnrollments ? <Spinner text="Chargement des certifications..." /> : (
          <div className="space-y-5">
            <Card title="Catalogue" subtitle={`${certifications?.length ?? 0} certification(s)`}>
              {(!certifications || certifications.length === 0) ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Aucune micro-certification créée pour le moment.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {certifications.map((c) => (
                    <Card key={c.id} noPadding className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{c.title}</p>
                        <Badge label={c.status_display} className={c.status === 'published' ? 'badge-green' : 'badge-gray'} dot />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{c.code}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <span>{c.duration_hours}h</span>
                        <span>{c.credits} crédit(s)</span>
                        <span>{c.enrolled_count} inscrit(s)</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Inscriptions & certification" subtitle={`${enrollments?.length ?? 0} inscription(s)`}>
              {(!enrollments || enrollments.length === 0) ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Aucun étudiant inscrit pour le moment.</p>
              ) : (
                <div className="space-y-2">
                  {enrollments.map((e) => (
                    <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{e.student_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{e.certification_detail.title}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge label={e.status_display} className={CERT_STATUS_BADGE[e.status] ?? 'badge-gray'} dot />
                        {e.status !== 'certified' && (
                          certifyingId === e.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number" min="0" max="20" placeholder="Note/20"
                                className="w-24" value={certifyScore}
                                onChange={(ev) => setCertifyScore(ev.target.value)}
                              />
                              <Button size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />}
                                disabled={certifyMutation.isPending}
                                onClick={() => certifyMutation.mutate(e.id)}>
                                Certifier
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => setCertifyingId(e.id)}>Certifier</Button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )
      )}

      {/* Create certification modal */}
      <Modal open={createCertOpen} onClose={() => setCreateCertOpen(false)} title="Créer une micro-certification">
        <div className="space-y-4">
          <Input label="Titre" value={certForm.title} onChange={(e) => setCertForm({ ...certForm, title: e.target.value })} />
          <Input label="Code" value={certForm.code} onChange={(e) => setCertForm({ ...certForm, code: e.target.value.toUpperCase() })} placeholder="Ex: MC-DATA-01" />
          <Textarea label="Description" value={certForm.description} onChange={(e) => setCertForm({ ...certForm, description: e.target.value })} rows={2} />
          <Select label="Programme (optionnel)" value={certForm.program} onChange={(e) => setCertForm({ ...certForm, program: e.target.value })}>
            <option value="">Aucun programme spécifique</option>
            {programs?.map((p: { id: string; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Durée (heures)" type="number" min="1" value={certForm.duration_hours} onChange={(e) => setCertForm({ ...certForm, duration_hours: Number(e.target.value) })} />
            <Input label="Crédits ECTS" type="number" min="0" value={certForm.credits} onChange={(e) => setCertForm({ ...certForm, credits: Number(e.target.value) })} />
          </div>
          <Select label="Badge attribué à la certification (optionnel)" value={certForm.badge} onChange={(e) => setCertForm({ ...certForm, badge: e.target.value })}>
            <option value="">Aucun badge</option>
            {badges?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={certForm.is_free} onChange={(e) => setCertForm({ ...certForm, is_free: e.target.checked })} />
            Gratuit
          </label>
          {!certForm.is_free && (
            <Input label="Prix (FCFA)" type="number" min="0" value={certForm.price} onChange={(e) => setCertForm({ ...certForm, price: Number(e.target.value) })} />
          )}
          <Select label="Statut" value={certForm.status} onChange={(e) => setCertForm({ ...certForm, status: e.target.value })}
            options={[{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateCertOpen(false)}>Annuler</Button>
            <Button
              disabled={!certForm.title || !certForm.code || createCertMutation.isPending}
              onClick={() => createCertMutation.mutate()}
            >
              {createCertMutation.isPending ? 'Création...' : 'Créer la certification'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create badge modal */}
      <Modal open={createBadgeOpen} onClose={() => setCreateBadgeOpen(false)} title="Créer un badge">
        <div className="space-y-4">
          <Input label="Nom du badge" value={badgeForm.name} onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })} />
          <Textarea label="Description" value={badgeForm.description} onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })} rows={2} />
          <Select label="Type" value={badgeForm.type} onChange={(e) => setBadgeForm({ ...badgeForm, type: e.target.value })} options={BADGE_TYPES} />
          <Input label="Points" type="number" min="0" value={badgeForm.points} onChange={(e) => setBadgeForm({ ...badgeForm, points: Number(e.target.value) })} />
          <Textarea label="Critères d'obtention" value={badgeForm.criteria} onChange={(e) => setBadgeForm({ ...badgeForm, criteria: e.target.value })} rows={2} />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
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

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, Phone, Lock, Shield, Clock, IdCard, FileText, Download, ShieldCheck, ShieldOff, Award, Coins, Bell, BellOff } from 'lucide-react'
import { Card, Spinner, Badge, Alert, Button } from '../../components/ui'
import { authApi, documentsApi, analyticsApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import { useRole } from '../../hooks/useRole'
import type { User } from '../../types'
import api from '../../lib/axios'
import toast from 'react-hot-toast'
import { saveAs } from 'file-saver'
import { formatDate } from '../../lib/utils'
import { isPushSupported, getCurrentPushSubscription, subscribeToPush, unsubscribeFromPush } from '../../lib/push'

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const { isEtudiant } = useRole()
  const qc = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [pwdMode, setPwdMode] = useState(false)
  const [form, setForm] = useState({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '', phone: user?.phone ?? '' })
  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [downloading, setDownloading] = useState<'carte' | 'fiche' | null>(null)

  const { data: myStudent } = useQuery({
    queryKey: ['my-student-profile'],
    queryFn: () => api.get('/students/me/').then(r => r.data),
    enabled: isEtudiant,
    retry: false,
  })

  const { data: myWallet } = useQuery({
    queryKey: ['my-wallet'],
    queryFn: () => analyticsApi.getMyWallet().then(r => r.data),
    enabled: isEtudiant,
    retry: false,
  })

  interface StudentBadgeT {
    id: string; reason: string; awarded_at: string
    badge_detail: { name: string; description: string; type: string; points: number }
  }
  const { data: myBadges } = useQuery({
    queryKey: ['my-badges'],
    queryFn: () => analyticsApi.getStudentBadges().then(r => r.data),
    enabled: isEtudiant,
    retry: false,
  })

  const downloadOfficialDoc = async (kind: 'carte' | 'fiche') => {
    if (!myStudent?.id) { toast.error('Profil étudiant introuvable'); return }
    setDownloading(kind)
    try {
      const res = kind === 'carte'
        ? await documentsApi.generateCarteEtudiantPDF(myStudent.id)
        : await documentsApi.generateFicheInscriptionPDF(myStudent.id)
      saveAs(new Blob([res.data]), kind === 'carte' ? 'carte_etudiant.pdf' : 'fiche_inscription.pdf')
      toast.success('Document téléchargé')
    } catch {
      toast.error('Erreur lors de la génération du document')
    } finally {
      setDownloading(null)
    }
  }

  const { data: me, isLoading } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => authApi.me().then(r => r.data),
  })

  const { data: auditLogs } = useQuery({
    queryKey: ['my-audit-logs'],
    queryFn: () => authApi.getAuditLogs({ user: user?.id, limit: 10 }).then(r => r.data),
  })

  const updateMut = useMutation({
    mutationFn: (d: object) => api.patch(`/users/${user?.id}/`, d),
    onSuccess: (res) => { toast.success('Profil mis à jour'); updateUser(res.data); setEditMode(false); qc.invalidateQueries({ queryKey: ['me'] }) },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const pwdMut = useMutation({
    mutationFn: (d: { old_password: string; new_password: string }) => authApi.changePassword(d),
    onSuccess: () => { toast.success('Mot de passe modifié'); setPwdMode(false); setPwdForm({ old_password: '', new_password: '', confirm: '' }) },
    onError: () => toast.error('Mot de passe actuel incorrect'),
  })

  const [mfaStep, setMfaStep] = useState<'idle' | 'setup'>('idle')
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; qr_code: string } | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [showMfaDisable, setShowMfaDisable] = useState(false)
  const [mfaDisablePwd, setMfaDisablePwd] = useState('')

  const mfaSetupMut = useMutation({
    mutationFn: () => authApi.mfaSetup(),
    onSuccess: (res) => { setMfaSetupData(res.data); setMfaStep('setup') },
    onError: () => toast.error('Erreur lors de la génération du QR code'),
  })
  const mfaVerifyMut = useMutation({
    mutationFn: () => authApi.mfaVerifySetup(mfaCode.trim()),
    onSuccess: () => {
      toast.success('Double authentification activée')
      setMfaStep('idle'); setMfaSetupData(null); setMfaCode('')
      qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => toast.error('Code invalide — réessayez'),
  })
  const mfaDisableMut = useMutation({
    mutationFn: () => authApi.mfaDisable(mfaDisablePwd),
    onSuccess: () => {
      toast.success('Double authentification désactivée')
      setShowMfaDisable(false); setMfaDisablePwd('')
      qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => toast.error('Mot de passe incorrect'),
  })

  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) return
    getCurrentPushSubscription().then(sub => setPushEnabled(!!sub))
  }, [])

  const togglePush = async () => {
    setPushLoading(true)
    try {
      if (pushEnabled) {
        await unsubscribeFromPush()
        setPushEnabled(false)
        toast.success('Notifications push désactivées')
      } else {
        const ok = await subscribeToPush()
        setPushEnabled(ok)
        if (ok) toast.success('Notifications push activées')
        else toast.error('Autorisation refusée par le navigateur')
      }
    } catch {
      toast.error('Erreur lors de la configuration des notifications push')
    } finally {
      setPushLoading(false)
    }
  }

  const profile: User | null = me ?? user
  if (isLoading) return <Spinner text="Chargement du profil..." />

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="page-title">Mon Profil</h1>
        <p className="text-gray-400 text-sm mt-0.5">Gérez vos informations personnelles et votre sécurité</p>
      </div>

      {/* Avatar + info principale */}
      <Card>
        <div className="flex items-start gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-2xl font-black">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{profile?.full_name ?? `${profile?.first_name} ${profile?.last_name}`}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{profile?.email}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile?.roles?.map((r: { id: string; name: string }) => (
                <Badge key={r.id} label={r.name} className="badge-blue" />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              {profile?.is_verified && <span className="flex items-center gap-1 text-emerald-600"><Shield className="w-3.5 h-3.5" /> Compte vérifié</span>}
              {profile?.created_at && <span>Membre depuis {formatDate(profile.created_at)}</span>}
            </div>
          </div>
          <button onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">
            {editMode ? 'Annuler' : 'Modifier'}
          </button>
        </div>

        {editMode && (
          <div className="mt-5 pt-5 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Prénom</label>
                <input className="input" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Nom</label>
                <input className="input" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Téléphone</label>
                <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+225 07 00 00 00 00" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditMode(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">Annuler</button>
              <button onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
                {updateMut.isPending ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Informations de contact */}
      <Card title="Informations de contact">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Mail className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-sm font-semibold text-gray-900">{profile?.email}</p>
            </div>
          </div>
          {profile?.phone && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Phone className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Téléphone</p>
                <p className="text-sm font-semibold text-gray-900">{profile.phone}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Documents officiels — étudiant uniquement */}
      {isEtudiant && (
        <Card title="Mes documents officiels" subtitle="Générés automatiquement avec QR code de vérification">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="secondary" icon={<IdCard className="w-4 h-4" />}
              loading={downloading === 'carte'} onClick={() => downloadOfficialDoc('carte')}>
              Ma carte étudiant
            </Button>
            <Button variant="secondary" icon={<FileText className="w-4 h-4" />}
              loading={downloading === 'fiche'} onClick={() => downloadOfficialDoc('fiche')}>
              Ma fiche d'inscription
            </Button>
          </div>
          {!myStudent?.id && (
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
              <Download className="w-3 h-3" /> Disponible une fois votre inscription validée par la scolarité.
            </p>
          )}
        </Card>
      )}

      {/* Récompenses — badges & portefeuille */}
      {isEtudiant && (myWallet || (myBadges?.results?.length ?? 0) > 0) && (
        <Card title="Mes récompenses" subtitle="Badges obtenus et points de portefeuille">
          <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl mb-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-black text-amber-800">{myWallet?.balance ?? 0} pts</p>
              <p className="text-xs text-amber-600">Solde du portefeuille</p>
            </div>
          </div>
          {!myBadges?.results?.length ? (
            <p className="text-sm text-gray-400">Aucun badge obtenu pour le moment.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myBadges.results.map((sb: StudentBadgeT) => (
                <div key={sb.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{sb.badge_detail.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{sb.reason || sb.badge_detail.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(sb.awarded_at)} · +{sb.badge_detail.points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Sécurité */}
      <Card title="Sécurité">
        {!pwdMode ? (
          <button onClick={() => setPwdMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">
            <Lock className="w-4 h-4" /> Changer le mot de passe
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Mot de passe actuel</label>
              <input type="password" className="input" value={pwdForm.old_password}
                onChange={e => setPwdForm(f => ({ ...f, old_password: e.target.value }))} />
            </div>
            <div>
              <label className="label">Nouveau mot de passe</label>
              <input type="password" className="input" value={pwdForm.new_password}
                onChange={e => setPwdForm(f => ({ ...f, new_password: e.target.value }))} placeholder="Minimum 8 caractères" />
            </div>
            <div>
              <label className="label">Confirmer le nouveau mot de passe</label>
              <input type="password" className="input" value={pwdForm.confirm}
                onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
            {pwdForm.new_password && pwdForm.confirm && pwdForm.new_password !== pwdForm.confirm && (
              <Alert type="error">Les mots de passe ne correspondent pas.</Alert>
            )}
            <div className="flex gap-3">
              <button onClick={() => setPwdMode(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">Annuler</button>
              <button onClick={() => pwdMut.mutate({ old_password: pwdForm.old_password, new_password: pwdForm.new_password })}
                disabled={!pwdForm.old_password || !pwdForm.new_password || pwdForm.new_password !== pwdForm.confirm || pwdForm.new_password.length < 8 || pwdMut.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
                {pwdMut.isPending ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Double authentification (MFA) */}
      <Card title="Double authentification" subtitle="Protège votre compte avec un code temporaire en plus du mot de passe">
        {profile?.mfa_enabled ? (
          !showMfaDisable ? (
            <div className="flex items-center justify-between">
              <Badge label="Activée" className="badge-green" dot />
              <button onClick={() => setShowMfaDisable(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">
                <ShieldOff className="w-4 h-4" /> Désactiver
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert type="warning">Confirmez votre mot de passe pour désactiver la double authentification.</Alert>
              <input type="password" className="input" placeholder="Mot de passe actuel"
                value={mfaDisablePwd} onChange={e => setMfaDisablePwd(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={() => { setShowMfaDisable(false); setMfaDisablePwd('') }}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">Annuler</button>
                <button onClick={() => mfaDisableMut.mutate()} disabled={!mfaDisablePwd || mfaDisableMut.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50">
                  {mfaDisableMut.isPending ? 'Désactivation...' : 'Confirmer la désactivation'}
                </button>
              </div>
            </div>
          )
        ) : mfaStep === 'idle' ? (
          <div className="flex items-center justify-between">
            <Badge label="Désactivée" className="badge-gray" dot />
            <button onClick={() => mfaSetupMut.mutate()} disabled={mfaSetupMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
              <ShieldCheck className="w-4 h-4" /> {mfaSetupMut.isPending ? 'Génération...' : 'Activer'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Scannez ce QR code avec Google Authenticator, Authy ou une application équivalente, puis saisissez le code à 6 chiffres généré.
            </p>
            {mfaSetupData?.qr_code && (
              <img src={mfaSetupData.qr_code} alt="QR code MFA" className="w-44 h-44 mx-auto rounded-xl border border-gray-200" />
            )}
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Ou saisissez manuellement</p>
              <p className="font-mono text-sm text-gray-700 tracking-wider">{mfaSetupData?.secret}</p>
            </div>
            <input type="text" inputMode="numeric" maxLength={6} className="input text-center tracking-[0.3em] font-semibold"
              placeholder="123456" value={mfaCode} onChange={e => setMfaCode(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => { setMfaStep('idle'); setMfaSetupData(null); setMfaCode('') }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">Annuler</button>
              <button onClick={() => mfaVerifyMut.mutate()} disabled={mfaCode.trim().length < 6 || mfaVerifyMut.isPending}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
                {mfaVerifyMut.isPending ? 'Vérification...' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Notifications push web */}
      {isPushSupported() && (
        <Card title="Notifications push" subtitle="Recevez une alerte sur cet appareil même hors de l'application">
          <div className="flex items-center justify-between">
            <Badge label={pushEnabled ? 'Activées' : 'Désactivées'} className={pushEnabled ? 'badge-green' : 'badge-gray'} dot />
            <button onClick={togglePush} disabled={pushLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
                pushEnabled ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}>
              {pushEnabled ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              {pushLoading ? 'Veuillez patienter...' : pushEnabled ? 'Désactiver' : 'Activer sur cet appareil'}
            </button>
          </div>
        </Card>
      )}

      {/* Activité récente */}
      {auditLogs?.results?.length > 0 && (
        <Card title="Activité récente">
          <div className="space-y-2">
            {auditLogs.results.slice(0, 8).map((log: { id: string; action: string; module: string; description: string; timestamp: string; ip_address: string | null }) => (
              <div key={log.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-xl transition">
                <Clock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{log.action}</span>
                    {log.module && <span className="text-gray-400"> sur {log.module}</span>}
                    {log.description && <span className="text-gray-400"> — {log.description}</span>}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(log.timestamp)} {log.ip_address ? `· IP: ${log.ip_address}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

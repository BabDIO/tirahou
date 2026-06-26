import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, Phone, Lock, Shield, Clock } from 'lucide-react'
import { Card, Spinner, Badge, Alert } from '../../components/ui'
import { authApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import type { User } from '../../types'
import api from '../../lib/axios'
import toast from 'react-hot-toast'
import { formatDate } from '../../lib/utils'

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const qc = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [pwdMode, setPwdMode] = useState(false)
  const [form, setForm] = useState({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '', phone: user?.phone ?? '' })
  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '', confirm: '' })

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

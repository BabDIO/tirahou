import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Building2, Calendar, Shield, Save, Globe, Bell, Database, Webhook, Trash2, Send, CheckCircle2, XCircle } from 'lucide-react'
import { Card, Spinner, Alert, Badge, Button } from '../../components/ui'
import { academicApi } from '../../api'
import api from '../../lib/axios'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'

const WEBHOOK_EVENTS = [
  { value: 'grade.published', label: 'Note publiée' },
  { value: 'semester_result.published', label: 'Résultat semestriel publié' },
  { value: 'payment.received', label: 'Paiement reçu' },
  { value: 'enrollment.validated', label: 'Inscription validée' },
  { value: 'admission.decided', label: "Décision d'admission" },
  { value: 'document.generated', label: 'Document généré' },
]

export default function AdminSettingsPage() {
  const qc = useQueryClient()
  const [activeSection, setActiveSection] = useState('university')

  const { data: universities } = useQuery({
    queryKey: ['universities'],
    queryFn: () => api.get('/universities/').then(r => r.data),
  })

  const { data: academicYears, isLoading: loadYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => academicApi.getAcademicYears().then(r => r.data),
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles/').then(r => r.data),
  })

  const [uniForm, setUniForm] = useState({ name: '', acronym: '', address: '', website: '', email: '', phone: '' })
  const [yearForm, setYearForm] = useState({ label: '', start_date: '', end_date: '', is_current: false })

  const createUniMut = useMutation({
    mutationFn: (d: object) => api.post('/universities/', d),
    onSuccess: () => { toast.success('Université créée'); qc.invalidateQueries({ queryKey: ['universities'] }) },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const createYearMut = useMutation({
    mutationFn: (d: object) => api.post('/academic-years/', d),
    onSuccess: () => { toast.success('Année académique créée'); qc.invalidateQueries({ queryKey: ['academic-years'] }); setYearForm({ label: '', start_date: '', end_date: '', is_current: false }) },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const setCurrentYearMut = useMutation({
    mutationFn: (id: string) => api.patch(`/academic-years/${id}/`, { is_current: true }),
    onSuccess: () => { toast.success('Année courante mise à jour'); qc.invalidateQueries({ queryKey: ['academic-years'] }) },
  })

  const sections = [
    { key: 'university', label: 'Université', icon: Building2 },
    { key: 'academic', label: 'Années académiques', icon: Calendar },
    { key: 'roles', label: 'Rôles & Permissions', icon: Shield },
    { key: 'webhooks', label: 'Webhooks', icon: Webhook },
    { key: 'system', label: 'Système', icon: Settings },
  ]

  const [webhookForm, setWebhookForm] = useState({ url: '', event_type: 'grade.published', secret: '', description: '' })

  const { data: webhooks, isLoading: loadWebhooks } = useQuery({
    queryKey: ['webhook-subscriptions'],
    queryFn: () => api.get('/webhook-subscriptions/').then(r => r.data),
    enabled: activeSection === 'webhooks',
  })

  const { data: webhookDeliveries } = useQuery({
    queryKey: ['webhook-deliveries'],
    queryFn: () => api.get('/webhook-deliveries/').then(r => r.data),
    enabled: activeSection === 'webhooks',
  })

  const createWebhookMut = useMutation({
    mutationFn: (d: object) => api.post('/webhook-subscriptions/', d),
    onSuccess: () => {
      toast.success('Abonnement webhook créé')
      setWebhookForm({ url: '', event_type: 'grade.published', secret: '', description: '' })
      qc.invalidateQueries({ queryKey: ['webhook-subscriptions'] })
    },
    onError: () => toast.error('Erreur — vérifiez que l\'URL est valide'),
  })

  const deleteWebhookMut = useMutation({
    mutationFn: (id: string) => api.delete(`/webhook-subscriptions/${id}/`),
    onSuccess: () => { toast.success('Abonnement supprimé'); qc.invalidateQueries({ queryKey: ['webhook-subscriptions'] }) },
  })

  const testWebhookMut = useMutation({
    mutationFn: (id: string) => api.post(`/webhook-subscriptions/${id}/test/`),
    onSuccess: () => { toast.success('Événement de test envoyé'); qc.invalidateQueries({ queryKey: ['webhook-deliveries'] }) },
  })

  const years = academicYears?.results ?? []
  const unis = universities?.results ?? []
  const roleList = roles?.results ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Paramètres Système</h1>
        <p className="text-gray-400 text-sm mt-0.5">Configuration globale de la plateforme TIRAHOU</p>
      </div>

      <div className="flex gap-5">
        {/* Sidebar navigation */}
        <div className="w-56 flex-shrink-0 space-y-1">
          {sections.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveSection(key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition text-left ${activeSection === key ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5">

          {/* === UNIVERSITÉ === */}
          {activeSection === 'university' && (
            <div className="space-y-4">
              <Card title="Établissements enregistrés">
                {unis.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun établissement configuré.</p>
                ) : unis.map((u: { id: string; name: string; acronym: string; website: string; email: string }) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{u.acronym}</p>
                      <p className="text-sm text-gray-500">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    {u.website && <a href={u.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> Site web</a>}
                  </div>
                ))}
              </Card>

              <Card title="Ajouter un établissement">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nom complet *</label>
                    <input className="input" value={uniForm.name} onChange={e => setUniForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Acronyme *</label>
                    <input className="input" value={uniForm.acronym} onChange={e => setUniForm(f => ({ ...f, acronym: e.target.value }))} placeholder="Ex: UVHCI" />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" className="input" value={uniForm.email} onChange={e => setUniForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Téléphone</label>
                    <input className="input" value={uniForm.phone} onChange={e => setUniForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Site web</label>
                    <input type="url" className="input" value={uniForm.website} onChange={e => setUniForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div>
                    <label className="label">Adresse</label>
                    <input className="input" value={uniForm.address} onChange={e => setUniForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                </div>
                <button onClick={() => createUniMut.mutate(uniForm)}
                  disabled={!uniForm.name || !uniForm.acronym || createUniMut.isPending}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
                  <Save className="w-4 h-4" /> {createUniMut.isPending ? 'Création...' : 'Créer l\'établissement'}
                </button>
              </Card>
            </div>
          )}

          {/* === ANNÉES ACADÉMIQUES === */}
          {activeSection === 'academic' && (
            <div className="space-y-4">
              <Card title="Années académiques" noPadding>
                {loadYears ? <Spinner /> : (
                  <div>
                    {years.map((y: { id: string; label: string; start_date: string; end_date: string; is_current: boolean }) => (
                      <div key={y.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          {y.is_current && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
                          <div>
                            <p className="font-bold text-gray-900">{y.label}</p>
                            <p className="text-xs text-gray-400">{y.start_date} → {y.end_date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {y.is_current
                            ? <Badge label="Année courante" className="badge-green" />
                            : <button onClick={() => setCurrentYearMut.mutate(y.id)}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition">
                                Définir comme courante
                              </button>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Ajouter une année académique">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Label *</label>
                    <input className="input" value={yearForm.label} onChange={e => setYearForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: 2025-2026" />
                  </div>
                  <div>
                    <label className="label">Date de début *</label>
                    <input type="date" className="input" value={yearForm.start_date} onChange={e => setYearForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Date de fin *</label>
                    <input type="date" className="input" value={yearForm.end_date} onChange={e => setYearForm(f => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
                  <input type="checkbox" checked={yearForm.is_current}
                    onChange={e => setYearForm(f => ({ ...f, is_current: e.target.checked }))} />
                  Définir comme année courante
                </label>
                <button onClick={() => createYearMut.mutate(yearForm)}
                  disabled={!yearForm.label || !yearForm.start_date || !yearForm.end_date || createYearMut.isPending}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
                  <Save className="w-4 h-4" /> {createYearMut.isPending ? 'Création...' : 'Créer l\'année'}
                </button>
              </Card>
            </div>
          )}

          {/* === RÔLES === */}
          {activeSection === 'roles' && (
            <Card title="Rôles système" subtitle="Les 13 rôles prédéfinis de TIRAHOU">
              <div className="space-y-2">
                {roleList.map((r: { id: string; name: string; description: string }) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{r.name}</p>
                      {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                    </div>
                    <Shield className="w-4 h-4 text-gray-300" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* === WEBHOOKS === */}
          {activeSection === 'webhooks' && (
            <div className="space-y-4">
              <Alert type="info">
                Les webhooks permettent à un système tiers de recevoir automatiquement un événement TIRAHOU (note publiée, paiement reçu...) via une requête HTTP signée.
              </Alert>

              <Card title="Abonnements actifs" noPadding>
                {loadWebhooks ? <Spinner /> : !webhooks?.results?.length ? (
                  <p className="text-sm text-gray-400 p-4">Aucun abonnement configuré.</p>
                ) : (
                  <div>
                    {webhooks.results.map((w: { id: string; url: string; event_type_display: string; description: string; is_active: boolean }) => (
                      <div key={w.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm">{w.event_type_display}</p>
                          <p className="text-xs text-gray-500 truncate">{w.url}</p>
                          {w.description && <p className="text-xs text-gray-400">{w.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge label={w.is_active ? 'Actif' : 'Inactif'} className={w.is_active ? 'badge-green' : 'badge-gray'} dot />
                          <Button variant="ghost" size="sm" icon={<Send className="w-3.5 h-3.5" />}
                            loading={testWebhookMut.isPending} onClick={() => testWebhookMut.mutate(w.id)}>Tester</Button>
                          <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />}
                            onClick={() => deleteWebhookMut.mutate(w.id)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Nouvel abonnement">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">URL de destination *</label>
                    <input className="input" type="url" placeholder="https://mon-systeme.example.com/webhooks/tirahou"
                      value={webhookForm.url} onChange={e => setWebhookForm(f => ({ ...f, url: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Événement *</label>
                    <select className="input bg-white" value={webhookForm.event_type}
                      onChange={e => setWebhookForm(f => ({ ...f, event_type: e.target.value }))}>
                      {WEBHOOK_EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Clé secrète (optionnel)</label>
                    <input className="input font-mono text-xs" placeholder="Pour signer le payload (HMAC-SHA256)"
                      value={webhookForm.secret} onChange={e => setWebhookForm(f => ({ ...f, secret: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Description</label>
                    <input className="input" value={webhookForm.description}
                      onChange={e => setWebhookForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Synchronisation ENT partenaire" />
                  </div>
                </div>
                <button onClick={() => createWebhookMut.mutate(webhookForm)}
                  disabled={!webhookForm.url || createWebhookMut.isPending}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
                  <Save className="w-4 h-4" /> {createWebhookMut.isPending ? 'Création...' : 'Créer l\'abonnement'}
                </button>
              </Card>

              {(webhookDeliveries?.results?.length ?? 0) > 0 && (
                <Card title="Historique des livraisons" subtitle="20 dernières tentatives">
                  <div className="space-y-2">
                    {webhookDeliveries.results.slice(0, 20).map((d: { id: string; event_type: string; success: boolean; status_code: number | null; created_at: string }) => (
                      <div key={d.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          {d.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                          <span className="font-medium text-gray-700">{d.event_type}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {d.status_code && <span>HTTP {d.status_code}</span>}
                          <span>{formatDate(d.created_at, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* === SYSTÈME === */}
          {activeSection === 'system' && (
            <div className="space-y-4">
              <Card title="Informations système">
                <div className="space-y-3">
                  {[
                    { label: 'Version', value: 'TIRAHOU v1.0.0' },
                    { label: 'Backend', value: 'Django 5.2 + DRF' },
                    { label: 'Frontend', value: 'React 19 + TypeScript' },
                    { label: 'Base de données', value: 'PostgreSQL 16' },
                    { label: 'Fuseau horaire', value: 'Africa/Abidjan (GMT+0)' },
                    { label: 'Langue', value: 'Français (fr-FR)' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm text-gray-600">{label}</span>
                      <span className="text-sm font-semibold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="API REST">
                <Alert type="info">
                  La documentation interactive de l'API est disponible sur{' '}
                  <a href="/api/docs" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline font-medium">/api/docs/</a>
                  {' '}(Swagger UI) et{' '}
                  <a href="/api/redoc" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline font-medium">/api/redoc/</a>
                  {' '}(ReDoc).
                </Alert>
                <div className="flex gap-3 mt-3">
                  <a href="http://localhost:8000/api/docs/" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition">
                    <Database className="w-4 h-4" /> Swagger UI
                  </a>
                  <a href="http://localhost:8000/admin/" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition">
                    <Settings className="w-4 h-4" /> Django Admin
                  </a>
                </div>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

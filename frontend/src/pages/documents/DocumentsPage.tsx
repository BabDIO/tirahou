import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, FileText, Upload, CheckCircle, XCircle, Eye, Download, Plus, QrCode, Shield, Archive } from 'lucide-react'
import { documentsApi } from '../../api'
import { Button, Input, Badge, Spinner, Empty, Pagination, Modal, Card, StatsCard, Alert, Tabs } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import { saveAs } from 'file-saver'
import type { StudentDocument, GeneratedDocument } from '../../types'

type Tab = 'student-docs' | 'generated'

const statusDoc: Record<string, string> = {
  depose: 'badge-yellow',
  en_verification: 'badge-blue',
  valide: 'badge-green',
  rejete: 'badge-red',
  archive: 'badge-gray',
  genere: 'badge-blue',
  signe: 'badge-violet',
  delivre: 'badge-green',
  annule: 'badge-red',
}

const docTypeIcons: Record<string, string> = {
  fiche_inscription: '📋', certificat_scolarite: '🎓', certificat_frequentation: '📄',
  attestation_reussite: '🏆', releve_notes: '📊', bulletin: '📑',
  convocation: '📩', carte_etudiant: '🪪', diplome: '🎓',
  attestation_fin_cycle: '🏅', pv_deliberation: '⚖️',
}

export default function DocumentsPage() {
  const [tab, setTab] = useState<Tab>('student-docs')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<StudentDocument | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: studentDocs, isLoading: docsLoading } = useQuery({
    queryKey: ['student-documents', page, search, statusFilter],
    queryFn: () => documentsApi.getStudentDocuments({ page, search, status: statusFilter || undefined }).then(r => r.data),
    enabled: tab === 'student-docs',
  })

  const { data: generatedDocs, isLoading: generatedLoading } = useQuery({
    queryKey: ['generated-documents', page],
    queryFn: () => documentsApi.getGeneratedDocuments({ page }).then(r => r.data),
    enabled: tab === 'generated',
  })

  const validateMutation = useMutation({
    mutationFn: (id: string) => documentsApi.validateDocument(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['student-documents'] }); toast.success('Document validé') },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => documentsApi.rejectDocument(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['student-documents'] }); toast.success('Document rejeté'); setRejectOpen(false) },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => documentsApi.archiveDocument(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['student-documents'] }); toast.success('Document archivé') },
  })

  const deposes = studentDocs?.results?.filter((d: StudentDocument) => d.status === 'depose').length ?? 0
  const valides = studentDocs?.results?.filter((d: StudentDocument) => d.status === 'valide').length ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">GED & Documents</h1>
          <p className="text-gray-400 text-sm mt-0.5">Gestion électronique des documents académiques</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setGenerateOpen(true)}>
            Générer un document
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Documents déposés" value={studentDocs?.count ?? 0}
          icon={<FileText className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="En attente" value={deposes}
          icon={<Upload className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
        <StatsCard title="Validés" value={valides}
          icon={<CheckCircle className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="Générés" value={generatedDocs?.count ?? 0}
          icon={<Shield className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'student-docs', label: 'Documents étudiants', icon: <Upload className="w-4 h-4" />, count: deposes },
          { key: 'generated', label: 'Documents générés', icon: <Shield className="w-4 h-4" /> },
        ]}
        active={tab} onChange={k => { setTab(k as Tab); setPage(1) }} variant="underline"
      />

      {/* Filters */}
      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par étudiant, titre..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
          {tab === 'student-docs' && (
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="input w-full sm:w-44">
              <option value="">Tous les statuts</option>
              <option value="depose">Déposé</option>
              <option value="en_verification">En vérification</option>
              <option value="valide">Validé</option>
              <option value="rejete">Rejeté</option>
            </select>
          )}
        </div>
      </Card>

      {/* Student Docs Table */}
      {tab === 'student-docs' && (
        <Card noPadding>
          {docsLoading ? <Spinner text="Chargement des documents..." /> : !studentDocs?.results?.length ? (
            <Empty message="Aucun document déposé" icon={<FileText className="w-8 h-8" />} />
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Étudiant</th>
                      <th>Document</th>
                      <th>Catégorie</th>
                      <th>Version</th>
                      <th>Statut</th>
                      <th>Déposé le</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentDocs.results.map((doc: StudentDocument) => (
                      <tr key={doc.id}>
                        <td className="font-semibold text-gray-900 text-sm">{doc.student}</td>
                        <td>
                          <p className="font-medium text-gray-900 text-sm">{doc.title}</p>
                          <p className="text-xs text-gray-400">
                            {doc.file_size > 0 ? `${(doc.file_size / 1024).toFixed(1)} Ko` : ''}
                          </p>
                        </td>
                        <td className="text-sm text-gray-600">{doc.category}</td>
                        <td>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                            v{doc.version}
                          </span>
                        </td>
                        <td>
                          <Badge label={doc.status} className={statusDoc[doc.status] ?? 'badge-gray'} dot />
                        </td>
                        <td className="text-xs text-gray-400">{formatDate(doc.created_at)}</td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => setSelected(doc)} />
                            {doc.status === 'depose' && (
                              <>
                                <Button variant="success" size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />}
                                  loading={validateMutation.isPending}
                                  onClick={() => validateMutation.mutate(doc.id)}>
                                  Valider
                                </Button>
                                <Button variant="danger" size="sm" icon={<XCircle className="w-3.5 h-3.5" />}
                                  onClick={() => { setRejectId(doc.id); setRejectOpen(true) }}>
                                  Rejeter
                                </Button>
                              </>
                            )}
                            {doc.status === 'valide' && (
                              <Button variant="ghost" size="sm" icon={<Archive className="w-3.5 h-3.5" />}
                                loading={archiveMutation.isPending}
                                onClick={() => archiveMutation.mutate(doc.id)}>
                                Archiver
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={studentDocs.count} pageSize={20} onChange={setPage} />
            </>
          )}
        </Card>
      )}

      {/* Generated Docs */}
      {tab === 'generated' && (
        <Card noPadding>
          {generatedLoading ? <Spinner text="Chargement..." /> : !generatedDocs?.results?.length ? (
            <Empty message="Aucun document généré" icon={<Shield className="w-8 h-8" />}
              description="Générez des certificats, relevés, et autres documents officiels" />
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Étudiant</th>
                      <th>Titre</th>
                      <th>Code vérification</th>
                      <th>Statut</th>
                      <th>Généré le</th>
                      <th>Validité</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedDocs.results.map((doc: GeneratedDocument) => (
                      <tr key={doc.id}>
                        <td>
                          <span className="text-lg">{docTypeIcons[doc.doc_type] ?? '📄'}</span>
                        </td>
                        <td className="font-semibold text-gray-900 text-sm">{doc.student}</td>
                        <td className="text-sm text-gray-700">{doc.title}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <QrCode className="w-3 h-3 text-gray-400" />
                            <span className="font-mono text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                              {doc.verification_code}
                            </span>
                          </div>
                        </td>
                        <td>
                          <Badge label={doc.doc_type_display} className={statusDoc[doc.status] ?? 'badge-gray'} dot />
                        </td>
                        <td className="text-xs text-gray-400">{formatDate(doc.created_at)}</td>
                        <td className="text-xs text-gray-400">
                          {doc.valid_until ? formatDate(doc.valid_until) : '—'}
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            {doc.file && (
                              <Button variant="ghost" size="sm" icon={<Download className="w-3.5 h-3.5" />}
                                onClick={() => window.open(doc.file!, '_blank')} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={generatedDocs.count} pageSize={20} onChange={setPage} />
            </>
          )}
        </Card>
      )}

      {/* Doc Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détail du document" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Titre', selected.title],
                ['Étudiant', selected.student],
                ['Catégorie', selected.category],
                ['Version', `v${selected.version}`],
                ['Statut', selected.status],
                ['Déposé par', selected.uploaded_by],
                ['Taille', `${(selected.file_size / 1024).toFixed(1)} Ko`],
                ['Type MIME', selected.mime_type],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">{label}</p>
                  <p className="font-semibold text-gray-800 text-sm">{value}</p>
                </div>
              ))}
            </div>
            {selected.rejection_reason && (
              <Alert type="error">
                <strong>Motif de rejet :</strong> {selected.rejection_reason}
              </Alert>
            )}
            {selected.file && (
              <Button variant="secondary" className="w-full" icon={<Download className="w-4 h-4" />}
                onClick={() => window.open(selected.file, '_blank')}>
                Télécharger le document
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Rejeter le document" size="sm">
        <RejectForm
          onSubmit={reason => rejectMutation.mutate({ id: rejectId!, reason })}
          onCancel={() => setRejectOpen(false)}
          loading={rejectMutation.isPending}
        />
      </Modal>

      {/* Generate Modal */}
      <Modal open={generateOpen} onClose={() => setGenerateOpen(false)} title="Générer un document" size="md">
        <GenerateDocForm
          onSuccess={() => { setGenerateOpen(false); queryClient.invalidateQueries({ queryKey: ['generated-documents'] }) }}
          onCancel={() => setGenerateOpen(false)}
        />
      </Modal>
    </div>
  )
}

function RejectForm({ onSubmit, onCancel, loading }: { onSubmit: (r: string) => void; onCancel: () => void; loading: boolean }) {
  const [reason, setReason] = useState('')
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Motif du rejet *</label>
        <textarea className="input min-h-[80px] resize-none" placeholder="Expliquez pourquoi ce document est rejeté..."
          value={reason} onChange={e => setReason(e.target.value)} />
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Annuler</Button>
        <Button variant="danger" className="flex-1" loading={loading}
          disabled={!reason.trim()} onClick={() => onSubmit(reason)}>
          Confirmer le rejet
        </Button>
      </div>
    </div>
  )
}

const GENERATABLE_TYPES = [
  { value: 'certificat_scolarite', label: 'Certificat de scolarité' },
  { value: 'releve_notes', label: 'Relevé de notes' },
  { value: 'fiche_inscription', label: "Fiche d'inscription" },
  { value: 'carte_etudiant', label: 'Carte étudiant' },
  { value: 'convocation', label: 'Convocation' },
  { value: 'diplome', label: 'Diplôme' },
  { value: 'attestation_fin_cycle', label: 'Attestation de fin de cycle' },
]

function GenerateDocForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({
    student: '', doc_type: 'certificat_scolarite',
    event_title: '', event_date: '', event_location: '', mention: '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.student) { toast.error('ID étudiant requis'); return }
    if (form.doc_type === 'convocation' && (!form.event_title || !form.event_date)) {
      toast.error('Objet et date requis pour une convocation'); return
    }
    setLoading(true)
    try {
      let res
      switch (form.doc_type) {
        case 'certificat_scolarite': res = await documentsApi.generateCertificatPDF(form.student); break
        case 'releve_notes': res = await documentsApi.generateRelevePDF(form.student); break
        case 'fiche_inscription': res = await documentsApi.generateFicheInscriptionPDF(form.student); break
        case 'carte_etudiant': res = await documentsApi.generateCarteEtudiantPDF(form.student); break
        case 'convocation':
          res = await documentsApi.generateConvocationPDF({
            student_id: form.student, event_title: form.event_title,
            event_date: form.event_date, event_location: form.event_location,
          })
          break
        case 'diplome':
        case 'attestation_fin_cycle':
          res = await documentsApi.generateDiplomePDF(form.student, {
            mention: form.mention, attestation: form.doc_type === 'attestation_fin_cycle',
          })
          break
        default: throw new Error('Type non supporté')
      }
      saveAs(new Blob([res.data], { type: 'application/pdf' }), `${form.doc_type}.pdf`)
      toast.success('Document généré avec succès')
      onSuccess()
    } catch { toast.error('Erreur lors de la génération — vérifiez que cet étudiant a une inscription validée') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">ID Étudiant *</label>
        <input className="input" value={form.student} onChange={e => set('student', e.target.value)} placeholder="UUID étudiant" />
      </div>
      <div>
        <label className="label">Type de document *</label>
        <select className="input bg-white" value={form.doc_type} onChange={e => set('doc_type', e.target.value)}>
          {GENERATABLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {form.doc_type === 'convocation' && (
        <>
          <div>
            <label className="label">Objet de la convocation *</label>
            <input className="input" value={form.event_title} onChange={e => set('event_title', e.target.value)}
              placeholder="Ex: Entretien disciplinaire" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.event_date} onChange={e => set('event_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Lieu</label>
              <input className="input" value={form.event_location} onChange={e => set('event_location', e.target.value)} />
            </div>
          </div>
        </>
      )}

      {(form.doc_type === 'diplome' || form.doc_type === 'attestation_fin_cycle') && (
        <div>
          <label className="label">Mention (optionnel)</label>
          <input className="input" value={form.mention} onChange={e => set('mention', e.target.value)} placeholder="Ex: Bien" />
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={loading} icon={<Shield className="w-4 h-4" />}>
          Générer le document
        </Button>
      </div>
    </form>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, Download, Eye, QrCode, CheckCircle, Search } from 'lucide-react'
import { Button, Input, Badge, Spinner, Empty, Pagination, Card, StatsCard, Modal, Alert } from '../../components/ui'
import { documentsApi, studentsApi } from '../../api'
import { formatDate, statusColor } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import { saveAs } from 'file-saver'

const DOC_TYPES = [
  { value: 'fiche_inscription', label: "Fiche d'inscription" },
  { value: 'certificat_scolarite', label: 'Certificat de scolarité' },
  { value: 'certificat_frequentation', label: 'Certificat de fréquentation' },
  { value: 'attestation_reussite', label: 'Attestation de réussite' },
  { value: 'releve_notes', label: 'Relevé de notes' },
  { value: 'bulletin', label: 'Bulletin' },
  { value: 'convocation', label: 'Convocation' },
  { value: 'carte_etudiant', label: "Carte d'étudiant" },
  { value: 'diplome', label: 'Diplôme' },
  { value: 'attestation_fin_cycle', label: 'Attestation de fin de cycle' },
  { value: 'pv_deliberation', label: 'PV de délibération' },
]

const docTypeColor: Record<string, string> = {
  certificat_scolarite: 'badge-blue', releve_notes: 'badge-green',
  diplome: 'badge-yellow', attestation_reussite: 'badge-green',
  convocation: 'badge-purple', carte_etudiant: 'badge-blue',
}

export default function ScolariteGeneratedDocsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [generateOpen, setGenerateOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['generated-docs', page, search, typeFilter],
    queryFn: () => documentsApi.getGeneratedDocuments({
      page, search, doc_type: typeFilter || undefined
    }).then(r => r.data),
  })

  const docs = data?.results ?? []
  const delivered = docs.filter((d: { status: string }) => d.status === 'delivre').length
  const generated = docs.filter((d: { status: string }) => d.status === 'genere').length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Documents Académiques</h1>
          <p className="text-gray-400 text-sm mt-0.5">Génération et délivrance des documents officiels</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={() => setGenerateOpen(true)}>
          Générer un document
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total générés" value={data?.count ?? 0}
          icon={<FileText className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Délivrés" value={delivered}
          icon={<CheckCircle className="w-5 h-5" />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatsCard title="En attente" value={generated}
          icon={<FileText className="w-5 h-5" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
      </div>

      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Rechercher par étudiant, code de vérification..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="flex-1" />
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} className="input w-full sm:w-56">
            <option value="">Tous les types</option>
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {isLoading ? <Spinner text="Chargement des documents..." /> : !docs.length ? (
          <Empty message="Aucun document généré" icon={<FileText className="w-8 h-8" />}
            action={<Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setGenerateOpen(true)}>Générer</Button>} />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Document</th><th>Étudiant</th><th>Type</th>
                    <th>Code vérif.</th><th>Généré le</th><th>Statut</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc: {
                    id: string; title: string; student: string; doc_type: string; doc_type_display: string
                    verification_code: string; created_at: string; status: string; file: string | null
                  }) => (
                    <tr key={doc.id}>
                      <td className="font-semibold text-sm">{doc.title}</td>
                      <td className="text-sm text-gray-600">{doc.student}</td>
                      <td><Badge label={doc.doc_type_display} className={docTypeColor[doc.doc_type] ?? 'badge-gray'} /></td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-mono text-xs text-gray-600">{doc.verification_code}</span>
                        </div>
                      </td>
                      <td className="text-xs text-gray-400">{formatDate(doc.created_at)}</td>
                      <td><Badge label={doc.status} className={statusColor(doc.status)} dot /></td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {doc.file && (
                            <a href={doc.file} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="sm" icon={<Download className="w-3.5 h-3.5" />} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={data.count} pageSize={20} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={generateOpen} onClose={() => setGenerateOpen(false)}
        title="Générer un document académique" size="md">
        <GenerateDocForm onSuccess={() => {
          setGenerateOpen(false)
          queryClient.invalidateQueries({ queryKey: ['generated-docs'] })
        }} />
      </Modal>
    </div>
  )
}

function GenerateDocForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ student: '', doc_type: 'certificat_scolarite', title: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: students } = useQuery({
    queryKey: ['students-for-docs'],
    queryFn: () => studentsApi.getStudents({ page_size: 200 }).then(r => r.data),
  })

  const handleSubmit = async () => {
    if (!form.student || !form.doc_type) { setError('Étudiant et type requis'); return }
    setLoading(true); setError('')
    try {
      // Utiliser les endpoints PDF backend pour certificat et relevé
      if (form.doc_type === 'certificat_scolarite') {
        const res = await documentsApi.generateCertificatPDF(form.student)
        saveAs(new Blob([res.data], { type: 'application/pdf' }), 'certificat_scolarite.pdf')
      } else if (form.doc_type === 'releve_notes') {
        const res = await documentsApi.generateRelevePDF(form.student)
        saveAs(new Blob([res.data], { type: 'application/pdf' }), 'releve_notes.pdf')
      } else {
        // Autres types via l'endpoint générique
        const docType = DOC_TYPES.find(t => t.value === form.doc_type)
        await documentsApi.generateDocument({
          ...form,
          title: form.title || docType?.label || form.doc_type,
        })
      }
      onSuccess()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail ?? 'Erreur lors de la génération.')
    }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="label">Étudiant *</label>
        <select className="input bg-white" value={form.student} onChange={e => set('student', e.target.value)}>
          <option value="">— Sélectionner un étudiant —</option>
          {students?.results?.map((s: { id: string; student_id: string; user: { full_name: string } }) => (
            <option key={s.id} value={s.id}>{s.user.full_name} ({s.student_id})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Type de document *</label>
        <select className="input bg-white" value={form.doc_type} onChange={e => set('doc_type', e.target.value)}>
          {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Titre personnalisé (optionnel)</label>
        <input className="input" value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="Laisser vide pour le titre par défaut" />
      </div>
      <Alert type="info">
        Le document sera généré avec un code de vérification QR unique permettant son authentification en ligne.
      </Alert>
      <Button className="w-full" onClick={handleSubmit} loading={loading} icon={<FileText className="w-4 h-4" />}>
        Générer le document
      </Button>
    </div>
  )
}

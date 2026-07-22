import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Download, QrCode, Plus, Upload, Eye, Shield } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Modal, Alert } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import { getDocumentStatus } from '../../lib/statusHelpers'
import { DOCUMENT_TYPES } from '../../lib/constants'
import { documentsApi } from '../../api'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

interface DocCategory { id: string; name: string }

interface GeneratedDoc {
  id: string; doc_type: string; title: string; status: string
  verification_code: string; created_at: string; valid_until: string | null
  file: string | null; qr_code: string | null
}

interface StudentDoc {
  id: string; title: string; status: string; category_name: string; created_at: string
  file: string; rejection_reason: string
}

export default function MyDocumentsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'generated' | 'uploaded'>('generated')
  const [showRequest, setShowRequest] = useState(false)
  const [showQR, setShowQR] = useState<GeneratedDoc | null>(null)
  const [docType, setDocType] = useState('certificat_scolarite')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: generatedData, isLoading: loadGen } = useQuery({
    queryKey: ['my-generated-docs'],
    queryFn: () => api.get('/documents/generated-documents/').then(r => r.data),
  })

  const { data: uploadedData, isLoading: loadUp } = useQuery({
    queryKey: ['my-student-docs'],
    queryFn: () => api.get('/documents/student-documents/').then(r => r.data),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['document-categories'],
    queryFn: () => documentsApi.getCategories().then(r => r.data),
  })

  const requestMut = useMutation({
    mutationFn: (type: string) => api.post('/documents/generated-documents/', { doc_type: type }),
    onSuccess: () => { toast.success('Demande soumise — la scolarité va générer votre document'); setShowRequest(false); qc.invalidateQueries({ queryKey: ['my-generated-docs'] }) },
    onError: () => toast.error('Erreur lors de la demande'),
  })

  const resetUpload = () => {
    setShowUpload(false); setUploadTitle(''); setUploadCategory(''); setUploadFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadMut = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('title', uploadTitle)
      fd.append('category', uploadCategory)
      fd.append('file', uploadFile as File)
      return documentsApi.uploadStudentDocument(fd)
    },
    onSuccess: () => { toast.success('Pièce déposée — en attente de vérification'); resetUpload(); qc.invalidateQueries({ queryKey: ['my-student-docs'] }) },
    onError: () => toast.error("Erreur lors du dépôt du document"),
  })

  const generatedDocs: GeneratedDoc[] = generatedData?.results ?? []
  const uploadedDocs: StudentDoc[] = uploadedData?.results ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Mes Documents</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Documents officiels et pièces justificatives</p>
        </div>
        <button onClick={() => setShowRequest(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 text-sm font-semibold transition">
          <Plus className="w-4 h-4" /> Demander un document
        </button>
      </div>

      <Alert type="info" title="Vérification d'authenticité">
        Chaque document officiel porte un QR code unique. Tout employeur peut vérifier son authenticité sur <strong>/verify/[code]</strong> sans compte.
      </Alert>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[
          { key: 'generated', label: 'Documents officiels', icon: FileText },
          { key: 'uploaded', label: 'Mes pièces', icon: Upload },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${tab === key ? 'bg-white text-gray-900 dark:text-gray-50 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Documents officiels */}
      {tab === 'generated' && (
        loadGen ? <Spinner /> : !generatedDocs.length ? (
          <Empty icon={<FileText className="w-8 h-8" />} message="Aucun document officiel"
            description="Cliquez sur 'Demander un document' pour en obtenir un." />
        ) : (
          <div className="space-y-3">
            {generatedDocs.map(doc => (
              <Card key={doc.id} hover>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-gray-50">{doc.title}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Généré le {formatDate(doc.created_at)}</p>
                        {doc.valid_until && <p className="text-xs text-amber-600 mt-0.5">Valide jusqu'au {formatDate(doc.valid_until)}</p>}
                      </div>
                      <Badge label={getDocumentStatus(doc.status).label} className={getDocumentStatus(doc.status).badge} />
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg flex items-center gap-1">
                        <Shield className="w-3 h-3" />{doc.verification_code}
                      </span>
                      <button onClick={() => setShowQR(doc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium hover:bg-gray-200 transition">
                        <QrCode className="w-3.5 h-3.5" /> QR Code
                      </button>
                      {doc.file && (
                        <a href={doc.file} target="_blank" rel="noopener noreferrer" download
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-200 transition">
                          <Download className="w-3.5 h-3.5" /> Télécharger
                        </a>
                      )}
                      <a href={`/verify/${doc.verification_code}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 transition">
                        <Eye className="w-3.5 h-3.5" /> Vérifier
                      </a>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Pièces justificatives */}
      {tab === 'uploaded' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 text-sm font-semibold transition">
              <Upload className="w-4 h-4" /> Déposer une pièce
            </button>
          </div>
          {loadUp ? <Spinner /> : !uploadedDocs.length ? (
            <Empty icon={<Upload className="w-8 h-8" />} message="Aucune pièce déposée"
              description="Déposez vos pièces justificatives pour compléter votre dossier." />
          ) : (
          <div className="space-y-3">
            {uploadedDocs.map(doc => (
              <Card key={doc.id} hover>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-50">{doc.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{doc.category_name} · {formatDate(doc.created_at)}</p>
                      {doc.status === 'rejete' && doc.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1">Rejeté : {doc.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge label={getDocumentStatus(doc.status).label} className={getDocumentStatus(doc.status).badge} />
                    <a href={doc.file} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                      <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Modal demande */}
      <Modal open={showRequest} onClose={() => setShowRequest(false)} title="Demander un document officiel" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Type de document *</label>
            <select className="input" value={docType} onChange={e => setDocType(e.target.value)}>
              {DOCUMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>
          <Alert type="info">Votre demande sera traitée par le service de scolarité. Vous serez notifié dès que le document est disponible.</Alert>
          <div className="flex gap-3">
            <button onClick={() => setShowRequest(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Annuler</button>
            <button onClick={() => requestMut.mutate(docType)} disabled={requestMut.isPending}
              className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
              {requestMut.isPending ? 'Envoi...' : 'Soumettre la demande'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal QR */}
      <Modal open={!!showQR} onClose={() => setShowQR(null)} title="QR Code de vérification" size="sm">
        {showQR && (
          <div className="text-center space-y-4">
            {showQR.qr_code ? (
              <img src={showQR.qr_code} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl" />
            ) : (
              <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
                <QrCode className="w-16 h-16 text-gray-400 dark:text-gray-500" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-50">{showQR.title}</p>
              <p className="font-mono text-sm text-gray-500 dark:text-gray-400 mt-1">{showQR.verification_code}</p>
              <a href={`/verify/${showQR.verification_code}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition">
                <Eye className="w-4 h-4" /> Vérifier en ligne
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal dépôt de pièce */}
      <Modal open={showUpload} onClose={resetUpload} title="Déposer une pièce justificative" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Titre *</label>
            <input className="input" placeholder="Ex : Acte de naissance" value={uploadTitle}
              onChange={e => setUploadTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Catégorie *</label>
            <select className="input" value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>
              <option value="">Sélectionnez...</option>
              {(categoriesData?.results ?? categoriesData ?? []).map((c: DocCategory) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fichier *</label>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="input"
              onChange={e => setUploadFile(e.target.files?.[0] ?? null)} />
          </div>
          <Alert type="info">Votre pièce sera examinée par le service de scolarité avant validation.</Alert>
          <div className="flex gap-3">
            <button onClick={resetUpload}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Annuler</button>
            <button onClick={() => uploadMut.mutate()} disabled={uploadMut.isPending || !uploadTitle || !uploadCategory || !uploadFile}
              className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50">
              {uploadMut.isPending ? 'Envoi...' : 'Déposer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

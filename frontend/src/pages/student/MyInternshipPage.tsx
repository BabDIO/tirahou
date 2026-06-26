import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Briefcase, BookMarked, Upload, Calendar, Building2, User, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Modal, Alert } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

const statusColor = (s: string) => ({
  en_recherche: 'badge-gray', convention_signee: 'badge-blue',
  en_cours: 'badge-yellow', termine: 'badge-purple',
  valide: 'badge-green', abandonne: 'badge-red',
  sujet_propose: 'badge-gray', sujet_valide: 'badge-blue',
  en_redaction: 'badge-yellow', depose: 'badge-purple',
  soutenu: 'badge-emerald', rejete: 'badge-red',
}[s] ?? 'badge-gray')

export default function MyInternshipPage() {
  const qc = useQueryClient()
  const [openThesis, setOpenThesis] = useState(false)
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const { data: internships, isLoading: loadInt } = useQuery({
    queryKey: ['my-internships'],
    queryFn: () => api.get('/internships/').then(r => r.data),
  })

  const { data: theses, isLoading: loadThes } = useQuery({
    queryKey: ['my-theses'],
    queryFn: () => api.get('/theses/').then(r => r.data),
  })

  const uploadReportMut = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData(); fd.append('report_file', file)
      return api.patch(`/internships/${id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => { toast.success('Rapport déposé avec succès'); setUploadingId(null); setReportFile(null); qc.invalidateQueries({ queryKey: ['my-internships'] }) },
    onError: () => toast.error('Erreur lors du dépôt'),
  })

  const internshipList = internships?.results ?? []
  const thesisList = theses?.results ?? []

  if (loadInt || loadThes) return <Spinner text="Chargement..." />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Stages & Mémoires</h1>
        <p className="text-gray-400 text-sm mt-0.5">Suivi de vos stages, mémoires et soutenances</p>
      </div>

      {/* Stages */}
      <div>
        <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary-600" /> Mes Stages
        </h2>
        {!internshipList.length ? (
          <Empty icon={<Briefcase className="w-6 h-6" />} message="Aucun stage enregistré"
            description="Votre tuteur ou la scolarité créera votre dossier de stage." />
        ) : (
          <div className="space-y-3">
            {internshipList.map((intership: {
              id: string; company_name: string; subject: string; status: string
              start_date: string; end_date: string; grade: number | null
              company_supervisor: string; company_address: string
              convention_file: string | null; report_file: string | null
            }) => (
              <Card key={intership.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{intership.company_name}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{intership.subject}</p>
                    </div>
                  </div>
                  <Badge label={intership.status} className={statusColor(intership.status)} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(intership.start_date)} → {formatDate(intership.end_date)}
                  </span>
                  {intership.company_supervisor && (
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {intership.company_supervisor}
                    </span>
                  )}
                  {intership.grade !== null && (
                    <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                      🎯 Note : {intership.grade}/20
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {intership.convention_file && (
                    <a href={intership.convention_file} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition">
                      <FileText className="w-3.5 h-3.5" /> Convention
                    </a>
                  )}
                  {intership.report_file && (
                    <a href={intership.report_file} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition">
                      <FileText className="w-3.5 h-3.5" /> Rapport
                    </a>
                  )}
                  {!intership.report_file && ['termine', 'en_cours'].includes(intership.status) && (
                    <div>
                      {uploadingId === intership.id ? (
                        <div className="flex items-center gap-2">
                          <input type="file" accept=".pdf,.doc,.docx" className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-primary-100 file:text-primary-700 file:text-xs"
                            onChange={e => setReportFile(e.target.files?.[0] ?? null)} />
                          <button onClick={() => { if (reportFile) uploadReportMut.mutate({ id: intership.id, file: reportFile }) }}
                            disabled={!reportFile || uploadReportMut.isPending}
                            className="px-2 py-1 bg-primary-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
                            {uploadReportMut.isPending ? '...' : 'Déposer'}
                          </button>
                          <button onClick={() => { setUploadingId(null); setReportFile(null) }} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">Annuler</button>
                        </div>
                      ) : (
                        <button onClick={() => setUploadingId(intership.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-100 transition">
                          <Upload className="w-3.5 h-3.5" /> Déposer rapport
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Mémoires & Thèses */}
      <div>
        <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-emerald-600" /> Mes Mémoires & Thèses
        </h2>
        {!thesisList.length ? (
          <Empty icon={<BookMarked className="w-6 h-6" />} message="Aucun mémoire enregistré"
            description="Votre directeur de mémoire créera votre dossier de thèse." />
        ) : (
          <div className="space-y-3">
            {thesisList.map((thesis: {
              id: string; title: string; type: string; status: string
              keywords: string; supervisor_name?: string; co_supervisor_name?: string
              plagiarism_score: number | null; final_file: string | null
              defense?: { scheduled_date: string; grade: number | null; mention: string; status: string; room: string; virtual_link: string }
            }) => (
              <Card key={thesis.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-bold text-gray-900">{thesis.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{thesis.type}</p>
                    {thesis.keywords && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {thesis.keywords.split(',').map(k => (
                          <span key={k} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{k.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge label={thesis.status} className={statusColor(thesis.status)} />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  {thesis.supervisor_name && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Dir. : {thesis.supervisor_name}</span>}
                  {thesis.co_supervisor_name && <span>Co-Dir. : {thesis.co_supervisor_name}</span>}
                  {thesis.plagiarism_score !== null && (
                    <span className={`font-semibold ${thesis.plagiarism_score > 20 ? 'text-red-600' : 'text-emerald-600'}`}>
                      Plagiat : {thesis.plagiarism_score}%
                    </span>
                  )}
                </div>
                {thesis.defense && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-800 mb-1">🎓 Soutenance</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-emerald-700">
                      <span>{formatDate(thesis.defense.scheduled_date)}</span>
                      {thesis.defense.room && <span>📍 {thesis.defense.room}</span>}
                      {thesis.defense.grade !== null && <span className="font-bold">Note : {thesis.defense.grade}/20 — {thesis.defense.mention}</span>}
                    </div>
                    {thesis.defense.virtual_link && (
                      <a href={thesis.defense.virtual_link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-xs text-emerald-700 underline">
                        Rejoindre en ligne
                      </a>
                    )}
                  </div>
                )}
                {thesis.final_file && (
                  <a href={thesis.final_file} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-200 transition">
                    <FileText className="w-3.5 h-3.5" /> Télécharger la version finale
                  </a>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

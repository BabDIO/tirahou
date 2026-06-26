import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Briefcase, FileText, CheckCircle, Plus, MessageSquare } from 'lucide-react'
import { Button, Badge, Spinner, Empty, Card, StatsCard, Modal, Alert, Tabs } from '../../components/ui'
import { internshipsApi } from '../../api'
import { formatDate, statusColor } from '../../lib/utils'
import api from '../../lib/axios'

export default function MyInternshipsTeacherPage() {
  const [tab, setTab] = useState('internships')
  const [progressOpen, setProgressOpen] = useState<string | null>(null)
  const [progressNote, setProgressNote] = useState('')
  const queryClient = useQueryClient()

  const { data: internships, isLoading: intLoading } = useQuery({
    queryKey: ['supervised-internships'],
    queryFn: () => internshipsApi.getInternships().then(r => r.data),
  })

  const { data: theses, isLoading: thesisLoading } = useQuery({
    queryKey: ['supervised-theses'],
    queryFn: () => internshipsApi.getTheses().then(r => r.data),
  })

  const addProgress = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      internshipsApi.addProgress(id, { note, date: new Date().toISOString().split('T')[0] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervised-theses'] })
      setProgressOpen(null)
      setProgressNote('')
    },
  })

  const validateSubject = useMutation({
    mutationFn: (id: string) => internshipsApi.validateSubject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['supervised-theses'] }),
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Mes Encadrements</h1>
        <p className="text-gray-400 text-sm mt-0.5">Stages et mémoires que vous encadrez</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard title="Stages encadrés" value={internships?.count ?? 0}
          icon={<Briefcase className="w-5 h-5" />} color="bg-gradient-to-br from-primary-500 to-primary-600" />
        <StatsCard title="Mémoires / Thèses" value={theses?.count ?? 0}
          icon={<FileText className="w-5 h-5" />} color="bg-gradient-to-br from-violet-500 to-violet-600" />
      </div>

      <Tabs
        tabs={[
          { key: 'internships', label: 'Stages', icon: <Briefcase className="w-4 h-4" /> },
          { key: 'theses', label: 'Mémoires & Thèses', icon: <FileText className="w-4 h-4" /> },
        ]}
        active={tab} onChange={setTab} variant="underline"
      />

      {tab === 'internships' && (
        intLoading ? <Spinner /> : !internships?.results?.length ? (
          <Empty message="Aucun stage à encadrer" icon={<Briefcase className="w-8 h-8" />} />
        ) : (
          <div className="space-y-3">
            {internships.results.map((s: {
              id: string; student_name: string; company_name: string; subject: string
              start_date: string; end_date: string; status: string; status_display: string
            }) => (
              <Card key={s.id} hover>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{s.student_name}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{s.company_name}</p>
                    <p className="text-sm text-gray-500 mt-1 italic">"{s.subject}"</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(s.start_date)} → {formatDate(s.end_date)}
                    </p>
                  </div>
                  <Badge label={s.status_display} className={statusColor(s.status)} dot />
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'theses' && (
        thesisLoading ? <Spinner /> : !theses?.results?.length ? (
          <Empty message="Aucun mémoire à encadrer" icon={<FileText className="w-8 h-8" />} />
        ) : (
          <div className="space-y-3">
            {theses.results.map((t: {
              id: string; student_name: string; title: string; type_display: string
              status: string; status_display: string; keywords: string
            }) => (
              <Card key={t.id} hover>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{t.student_name}</p>
                    <p className="text-sm font-medium text-gray-700 mt-1 line-clamp-2">{t.title}</p>
                    <p className="text-xs text-violet-600 font-semibold mt-1">{t.type_display}</p>
                    {t.keywords && <p className="text-xs text-gray-400 mt-1">Mots-clés: {t.keywords}</p>}
                  </div>
                  <Badge label={t.status_display} className={statusColor(t.status)} dot />
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  {t.status === 'sujet_propose' && (
                    <Button size="sm" variant="success" icon={<CheckCircle className="w-3.5 h-3.5" />}
                      loading={validateSubject.isPending}
                      onClick={() => validateSubject.mutate(t.id)}>
                      Valider le sujet
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" icon={<MessageSquare className="w-3.5 h-3.5" />}
                    onClick={() => setProgressOpen(t.id)}>
                    Ajouter un suivi
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      <Modal open={!!progressOpen} onClose={() => setProgressOpen(null)} title="Ajouter une note de suivi" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Note de suivi</label>
            <textarea className="input min-h-[100px] resize-none" value={progressNote}
              onChange={e => setProgressNote(e.target.value)}
              placeholder="Observations, avancement, points à améliorer..." />
          </div>
          <Button className="w-full" loading={addProgress.isPending}
            disabled={!progressNote.trim()}
            onClick={() => addProgress.mutate({ id: progressOpen!, note: progressNote })}>
            Enregistrer le suivi
          </Button>
        </div>
      </Modal>
    </div>
  )
}

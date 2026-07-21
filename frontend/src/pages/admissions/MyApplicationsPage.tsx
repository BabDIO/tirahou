import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, Send } from 'lucide-react'
import { admissionsApi, programsApi, academicApi } from '../../api'
import { Badge, Button, Card, Empty, Input, Modal, Select, Spinner, Textarea } from '../../components/ui'
import { useToast } from '../../hooks/useToast'
import type { AcademicYear, Application, Program } from '../../types'

const STATUS_BADGE: Record<string, string> = {
  brouillon: 'badge-gray',
  soumise: 'badge-blue',
  en_instruction: 'badge-amber',
  complete: 'badge-blue',
  incomplete: 'badge-red',
  admis: 'badge-green',
  admis_liste_attente: 'badge-amber',
  refuse: 'badge-red',
  desiste: 'badge-gray',
  converti: 'badge-green',
}

interface FormState {
  program: string
  last_diploma: string
  last_diploma_year: string
  last_institution: string
  average_grade: string
  motivation_letter: string
}

const EMPTY_FORM: FormState = {
  program: '', last_diploma: '', last_diploma_year: '', last_institution: '', average_grade: '', motivation_letter: '',
}

export default function MyApplicationsPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const { data: applications, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => admissionsApi.getApplications().then((r) => r.data.results),
  })

  const { data: programs } = useQuery({
    queryKey: ['programs', 'candidature-open'],
    queryFn: () => programsApi.getPrograms({ page_size: 100 }).then((r) => r.data.results as Program[]),
  })

  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => academicApi.getAcademicYears().then((r) => r.data.results as AcademicYear[]),
  })

  const openPrograms = (programs ?? []).filter((p) => p.candidature_open)
  const currentYear = (years ?? []).find((y) => y.is_current)

  const alreadyAppliedProgramIds = new Set((applications ?? []).map((a) => a.program))

  const create = useMutation({
    mutationFn: () =>
      admissionsApi.createApplication({
        program: form.program,
        academic_year: currentYear?.id,
        last_diploma: form.last_diploma,
        last_diploma_year: form.last_diploma_year ? Number(form.last_diploma_year) : undefined,
        last_institution: form.last_institution,
        average_grade: form.average_grade ? Number(form.average_grade) : undefined,
        motivation_letter: form.motivation_letter,
      }),
    onSuccess: () => {
      toast.success('Candidature créée en brouillon — pensez à la soumettre.')
      setModalOpen(false)
      setForm(EMPTY_FORM)
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: Record<string, string[] | string> } }
      const detail = e?.response?.data ? JSON.stringify(e.response.data) : 'Erreur lors de la création.'
      toast.error(detail)
    },
  })

  const submit = useMutation({
    mutationFn: (id: string) => admissionsApi.submitApplication(id),
    onSuccess: () => {
      toast.success('Candidature soumise avec succès.')
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
    },
    onError: () => toast.error('Erreur lors de la soumission.'),
  })

  if (isLoading) return <Spinner text="Chargement de vos candidatures..." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Mes candidatures</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Postulez à un programme et suivez l'avancement de vos dossiers.
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)} disabled={openPrograms.length === 0}>
          Nouvelle candidature
        </Button>
      </div>

      {openPrograms.length === 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Aucune candidature n'est ouverte actuellement. Revenez plus tard ou contactez le service de scolarité.
        </div>
      )}

      {!applications || applications.length === 0 ? (
        <Empty
          icon={<FileText className="w-10 h-10" />}
          message="Aucune candidature pour le moment"
          description="Cliquez sur « Nouvelle candidature » pour déposer un dossier."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {applications.map((app: Application) => (
            <Card key={app.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-50">{app.program_name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{app.application_number}</p>
                </div>
                <Badge label={app.status_display} className={STATUS_BADGE[app.status] ?? 'badge-gray'} />
              </div>
              {app.motivation_letter && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{app.motivation_letter}</p>
              )}
              {app.status === 'brouillon' && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Send className="w-3.5 h-3.5" />}
                  loading={submit.isPending}
                  onClick={() => submit.mutate(app.id)}
                >
                  Soumettre ma candidature
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvelle candidature"
        subtitle={currentYear ? `Année académique ${currentYear.label}` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button
              loading={create.isPending}
              disabled={!form.program}
              onClick={() => create.mutate()}
            >
              Créer le brouillon
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Programme"
            value={form.program}
            onChange={(e) => setForm({ ...form, program: e.target.value })}
          >
            <option value="">Sélectionnez un programme...</option>
            {openPrograms.map((p) => (
              <option key={p.id} value={p.id} disabled={alreadyAppliedProgramIds.has(p.id)}>
                {p.name} ({p.type_display}){alreadyAppliedProgramIds.has(p.id) ? ' — déjà postulé' : ''}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Dernier diplôme"
              placeholder="Baccalauréat"
              value={form.last_diploma}
              onChange={(e) => setForm({ ...form, last_diploma: e.target.value })}
            />
            <Input
              label="Année d'obtention"
              type="number"
              placeholder="2025"
              value={form.last_diploma_year}
              onChange={(e) => setForm({ ...form, last_diploma_year: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Établissement"
              placeholder="Lycée..."
              value={form.last_institution}
              onChange={(e) => setForm({ ...form, last_institution: e.target.value })}
            />
            <Input
              label="Moyenne obtenue"
              type="number"
              step="0.01"
              placeholder="14.5"
              value={form.average_grade}
              onChange={(e) => setForm({ ...form, average_grade: e.target.value })}
            />
          </div>
          <Textarea
            label="Lettre de motivation"
            rows={4}
            placeholder="Expliquez pourquoi vous souhaitez intégrer ce programme..."
            value={form.motivation_letter}
            onChange={(e) => setForm({ ...form, motivation_letter: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  )
}

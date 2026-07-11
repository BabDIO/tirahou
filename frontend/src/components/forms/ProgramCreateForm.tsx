import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookMarked } from 'lucide-react'
import { Button, Input, Select, Alert } from '../ui'
import { programsApi, academicApi } from '../../api'
import { useToast } from '../../hooks/useToast'

interface FormData {
  code: string
  name: string
  type: string
  mode: string
  department: string
  duration_semesters: number
  capacity: number
  fees: number
  languages: string
  prerequisites: string
  description: string
  status: string
}

interface Props { onSuccess: () => void; onCancel: () => void }

export default function ProgramCreateForm({ onSuccess, onCancel }: Props) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [form, setForm] = useState<FormData>({
    code: '', name: '', type: 'licence', mode: 'hybride', department: '',
    duration_semesters: 6, capacity: 50, fees: 0,
    languages: 'Français', prerequisites: '', description: '', status: 'preparation',
  })

  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => academicApi.getDepartments({ page_size: 100 }).then(r => r.data),
  })

  const set = (k: keyof FormData, v: string | number) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.code.trim()) errs.code = 'Code requis'
    if (!form.name.trim()) errs.name = 'Nom requis'
    if (!form.type) errs.type = 'Type requis'
    if (!form.mode) errs.mode = 'Mode requis'
    if (!form.department) errs.department = 'Département requis'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const create = useMutation({
    mutationFn: () => programsApi.createProgram(form as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      toast.success('Programme créé avec succès')
      onSuccess()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message ?? 'Erreur lors de la création')
    },
  })

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) create.mutate()
  }

  const deptOptions = departments?.results.map(d => ({
    value: d.id, label: `${d.acronym} — ${d.name}`
  })) ?? []

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Code *" placeholder="L-INFO" error={errors.code}
          value={form.code} onChange={e => set('code', e.target.value)} />
        <Select label="Statut" options={[
          { value: 'preparation', label: 'En préparation' },
          { value: 'active', label: 'Active' },
          { value: 'suspendue', label: 'Suspendue' },
        ]} value={form.status} onChange={e => set('status', e.target.value)} />

        <Input label="Intitulé complet *" placeholder="Licence Informatique" error={errors.name}
          className="sm:col-span-2" value={form.name} onChange={e => set('name', e.target.value)} />

        <Select label="Type *" error={errors.type} options={[
          { value: 'licence', label: 'Licence' },
          { value: 'licence_pro', label: 'Licence Professionnelle' },
          { value: 'master', label: 'Master' },
          { value: 'doctorat', label: 'Doctorat' },
          { value: 'du', label: 'Diplôme Universitaire' },
          { value: 'certificat', label: 'Certificat' },
          { value: 'micro_cert', label: 'Micro-Certification' },
        ]} value={form.type} onChange={e => set('type', e.target.value)} />

        <Select label="Mode *" error={errors.mode} options={[
          { value: 'presentiel', label: 'Présentiel' },
          { value: 'distanciel', label: 'Distanciel' },
          { value: 'hybride', label: 'Hybride' },
        ]} value={form.mode} onChange={e => set('mode', e.target.value)} />

        <Select label="Département *" error={errors.department}
          options={deptOptions} value={form.department}
          onChange={e => set('department', e.target.value)} />

        <Input label="Langue(s)" placeholder="Français, Anglais"
          value={form.languages} onChange={e => set('languages', e.target.value)} />

        <div>
          <label className="label">Durée (semestres)</label>
          <input type="number" className="input" min={1} max={12}
            value={form.duration_semesters} onChange={e => set('duration_semesters', Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Capacité d'accueil</label>
          <input type="number" className="input" min={1}
            value={form.capacity} onChange={e => set('capacity', Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Frais de scolarité (FCFA)</label>
          <input type="number" className="input" min={0}
            value={form.fees} onChange={e => set('fees', Number(e.target.value))} />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Prérequis</label>
          <textarea className="input min-h-[70px] resize-none" placeholder="Conditions d'accès..."
            value={form.prerequisites} onChange={e => set('prerequisites', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea className="input min-h-[80px] resize-none" placeholder="Description du programme..."
            value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={create.isPending} icon={<BookMarked className="w-4 h-4" />}>
          Créer le programme
        </Button>
      </div>
    </form>
  )
}

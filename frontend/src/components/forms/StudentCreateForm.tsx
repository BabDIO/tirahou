import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { Button, Input, Select } from '../ui'
import { studentsApi, programsApi } from '../../api'
import { useToast } from '../../hooks/useToast'
import api from '../../lib/axios'

interface FormData {
  email: string; first_name: string; last_name: string
  phone: string; password: string; gender: string
  birth_date: string; birth_place: string; nationality: string
  national_id: string; current_program: string; current_level: number
  baccalaureate_year: string; baccalaureate_series: string
  emergency_contact_name: string; emergency_contact_phone: string
  emergency_contact_relation: string
}

interface Props { onSuccess: () => void; onCancel: () => void }

export default function StudentCreateForm({ onSuccess, onCancel }: Props) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [form, setForm] = useState<FormData>({
    email: '', first_name: '', last_name: '', phone: '', password: '',
    gender: 'M', birth_date: '', birth_place: '', nationality: 'Malienne',
    national_id: '', current_program: '', current_level: 1,
    baccalaureate_year: '', baccalaureate_series: '',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
  })

  const { data: programs } = useQuery({
    queryKey: ['programs-active'],
    queryFn: () => programsApi.getPrograms({ status: 'active', page_size: 100 }).then(r => r.data),
  })

  const set = (k: keyof FormData, v: string | number) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.email.includes('@')) errs.email = 'Email invalide'
    if (!form.first_name.trim()) errs.first_name = 'Prénom requis'
    if (!form.last_name.trim()) errs.last_name = 'Nom requis'
    if (form.password.length < 8) errs.password = 'Minimum 8 caractères'
    if (!form.gender) errs.gender = 'Genre requis'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const create = useMutation({
    mutationFn: async () => {
      // 1. Créer le compte utilisateur
      const userRes = await api.post('/users/', {
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        username: `${form.email.split('@')[0]}_${Date.now()}`,
        password: form.password,
        role_ids: [],
      })

      // 2. Créer le profil étudiant
      return studentsApi.createStudent({
        user: userRes.data.id,
        gender: form.gender as 'M' | 'F' | 'A',
        birth_date: form.birth_date || undefined,
        birth_place: form.birth_place,
        nationality: form.nationality,
        national_id: form.national_id,
        current_program: form.current_program || undefined,
        current_level: form.current_level,
        baccalaureate_year: form.baccalaureate_year ? Number(form.baccalaureate_year) : undefined,
        baccalaureate_series: form.baccalaureate_series,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        emergency_contact_relation: form.emergency_contact_relation,
        status: 'candidat',
      } as never)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      toast.success('Étudiant créé avec succès')
      onSuccess()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string; email?: string[] } } }
      const msg = e?.response?.data?.message
        ?? e?.response?.data?.email?.[0]
        ?? 'Erreur lors de la création'
      toast.error(msg)
    },
  })

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (validate()) create.mutate()
  }

  const programOptions = programs?.results.map(p => ({ value: p.id, label: `${p.code} — ${p.name}` })) ?? []

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      {/* Compte */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Compte utilisateur</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Prénom *" placeholder="Jean" error={errors.first_name}
            value={form.first_name} onChange={e => set('first_name', e.target.value)} />
          <Input label="Nom *" placeholder="Dupont" error={errors.last_name}
            value={form.last_name} onChange={e => set('last_name', e.target.value)} />
          <Input label="Email *" type="email" placeholder="jean.dupont@email.com" error={errors.email}
            value={form.email} onChange={e => set('email', e.target.value)} />
          <Input label="Téléphone" placeholder="+225 07 00 00 00"
            value={form.phone} onChange={e => set('phone', e.target.value)} />
          <Input label="Mot de passe *" type="password" placeholder="Min. 8 caractères" error={errors.password}
            className="sm:col-span-2" value={form.password} onChange={e => set('password', e.target.value)} />
        </div>
      </div>

      {/* Profil */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Profil académique</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Genre *" error={errors.gender} options={[
            { value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }, { value: 'A', label: 'Autre' }
          ]} value={form.gender} onChange={e => set('gender', e.target.value)} />
          <Input label="Nationalité" value={form.nationality} onChange={e => set('nationality', e.target.value)} />
          <Input label="Date de naissance" type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
          <Input label="Lieu de naissance" placeholder="Bamako" value={form.birth_place} onChange={e => set('birth_place', e.target.value)} />
          <Input label="N° pièce d'identité" value={form.national_id} onChange={e => set('national_id', e.target.value)} />
          <div>
            <label className="label">Niveau</label>
            <select className="input bg-white dark:bg-slate-900" value={form.current_level} onChange={e => set('current_level', Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Niveau {n}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Select label="Programme" options={programOptions}
              value={form.current_program} onChange={e => set('current_program', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Bac */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Baccalauréat</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Année" type="number" placeholder="2023"
            value={form.baccalaureate_year} onChange={e => set('baccalaureate_year', e.target.value)} />
          <Input label="Série" placeholder="C, D, A..."
            value={form.baccalaureate_series} onChange={e => set('baccalaureate_series', e.target.value)} />
        </div>
      </div>

      {/* Contact urgence */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Contact d'urgence</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Nom" value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} />
          <Input label="Téléphone" value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} />
          <Input label="Relation" placeholder="Père, Mère..." value={form.emergency_contact_relation} onChange={e => set('emergency_contact_relation', e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white pb-1">
        <Button variant="secondary" className="flex-1" type="button" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" type="submit" loading={create.isPending} icon={<UserPlus className="w-4 h-4" />}>
          Créer l'étudiant
        </Button>
      </div>
    </form>
  )
}

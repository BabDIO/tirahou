import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckSquare, XSquare, AlertCircle, Eye } from 'lucide-react'
import { Card, Button, Badge, Tabs, Alert } from '../../components/ui'
import DataTable, { Column } from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

export default function GradesValidationPage() {
  const [tab, setTab] = useState('pending')
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])
  const [detailModal, setDetailModal] = useState<any>(null)
  const qc = useQueryClient()

  const { data: grades, isLoading } = useQuery({
    queryKey: ['grades-validation', tab],
    queryFn: () => api.get('/evaluation/grades/', {
      params: { status: tab === 'pending' ? 'saisie' : 'validee' }
    }).then(r => r.data)
  })

  const validateMut = useMutation({
    mutationFn: (ids: string[]) => api.post('/evaluation/validate-grades-bulk/', { grade_ids: ids }),
    onSuccess: (data) => {
      toast.success(data.detail)
      setSelectedGrades([])
      qc.invalidateQueries({ queryKey: ['grades-validation'] })
    }
  })

  const columns: Column<any>[] = [
    {
      key: 'select',
      label: '',
      width: '40px',
      render: (_, row) => tab === 'pending' && (
        <input
          type="checkbox"
          checked={selectedGrades.includes(row.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedGrades([...selectedGrades, row.id])
            } else {
              setSelectedGrades(selectedGrades.filter(id => id !== row.id))
            }
          }}
          className="w-4 h-4 rounded accent-blue-600"
        />
      )
    },
    {
      key: 'student',
      label: 'Étudiant',
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.student_name}</p>
          <p className="text-xs text-gray-400">{row.ec_code}</p>
        </div>
      )
    },
    {
      key: 'cc_grade',
      label: 'CC (40%)',
      render: (val) => val?.toFixed(2) || '—'
    },
    {
      key: 'exam_grade',
      label: 'Examen (60%)',
      render: (val) => val?.toFixed(2) || '—'
    },
    {
      key: 'final_grade',
      label: 'Note finale',
      render: (val) => (
        <span className={`font-bold ${val >= 10 ? 'text-emerald-600' : 'text-red-600'}`}>
          {val?.toFixed(2) || '—'}/20
        </span>
      )
    },
    {
      key: 'entered_by',
      label: 'Saisi par',
      render: (val) => val?.name || '—'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Button
          size="xs"
          variant="ghost"
          icon={<Eye className="w-3.5 h-3.5" />}
          onClick={() => setDetailModal(row)}
        >
          Détails
        </Button>
      )
    }
  ]

  const handleSelectAll = () => {
    if (selectedGrades.length === grades?.length) {
      setSelectedGrades([])
    } else {
      setSelectedGrades(grades?.map((g: any) => g.id) || [])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Validation des notes</h1>
          <p className="text-sm text-gray-500 mt-1">Vérifiez et validez les notes saisies</p>
        </div>
        {tab === 'pending' && selectedGrades.length > 0 && (
          <Button
            onClick={() => validateMut.mutate(selectedGrades)}
            loading={validateMut.isPending}
            icon={<CheckSquare className="w-4 h-4" />}
          >
            Valider ({selectedGrades.length})
          </Button>
        )}
      </div>

      <Card>
        <Tabs
          tabs={[
            { key: 'pending', label: 'En attente', count: grades?.length || 0 },
            { key: 'validated', label: 'Validées' }
          ]}
          active={tab}
          onChange={setTab}
        />

        <div className="mt-6">
          {tab === 'pending' && grades?.length > 0 && (
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedGrades.length === grades?.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                Tout sélectionner
              </label>
            </div>
          )}

          <DataTable
            data={grades || []}
            columns={columns}
            isLoading={isLoading}
            searchPlaceholder="Rechercher..."
            emptyMessage={tab === 'pending' ? 'Aucune note à valider' : 'Aucune note validée'}
          />
        </div>
      </Card>

      {detailModal && (
        <Modal
          isOpen={!!detailModal}
          onClose={() => setDetailModal(null)}
          title="Détails de la note"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500">Étudiant</label>
              <p className="font-medium">{detailModal.student_name}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">EC</label>
              <p className="font-medium">{detailModal.ec_name} ({detailModal.ec_code})</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500">CC (40%)</label>
                <p className="text-lg font-bold">{detailModal.cc_grade?.toFixed(2) || '—'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Examen (60%)</label>
                <p className="text-lg font-bold">{detailModal.exam_grade?.toFixed(2) || '—'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Note finale</label>
                <p className="text-lg font-bold text-blue-600">{detailModal.final_grade?.toFixed(2) || '—'}/20</p>
              </div>
            </div>
            {detailModal.appreciation && (
              <div>
                <label className="text-xs text-gray-500">Appréciation</label>
                <p className="text-sm">{detailModal.appreciation}</p>
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => setDetailModal(null)}
                className="flex-1"
              >
                Fermer
              </Button>
              {tab === 'pending' && (
                <Button
                  onClick={() => {
                    validateMut.mutate([detailModal.id])
                    setDetailModal(null)
                  }}
                  icon={<CheckSquare className="w-4 h-4" />}
                  className="flex-1"
                >
                  Valider
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

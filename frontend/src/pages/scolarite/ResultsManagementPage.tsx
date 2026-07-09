import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Award, CheckCircle, Download, Calculator, Send } from 'lucide-react'
import { Card, Button, Badge, Spinner, Alert } from '../../components/ui'
import DataTable, { Column } from '../../components/ui/DataTable'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

export default function ResultsManagementPage() {
  const [selectedSession, setSelectedSession] = useState('')
  const qc = useQueryClient()

  const { data: sessions } = useQuery({
    queryKey: ['exam-sessions'],
    queryFn: () => api.get('/exam-sessions/').then(r => r.data)
  })

  const { data: results, isLoading } = useQuery({
    queryKey: ['semester-results', selectedSession],
    queryFn: () => api.get('/evaluation/semester-results/', {
      params: { exam_session: selectedSession }
    }).then(r => r.data),
    enabled: !!selectedSession
  })

  const calculateResultsMut = useMutation({
    mutationFn: () => api.post('/evaluation/calculate-semester-results/', {
      exam_session_id: selectedSession
    }),
    onSuccess: () => {
      toast.success('Résultats calculés avec succès')
      qc.invalidateQueries({ queryKey: ['semester-results'] })
    }
  })

  const publishResultsMut = useMutation({
    mutationFn: () => api.post('/evaluation/publish-semester-results/', {
      exam_session_id: selectedSession
    }),
    onSuccess: (data) => {
      toast.success(`${data.detail}`)
      qc.invalidateQueries({ queryKey: ['semester-results'] })
    }
  })

  const exportResultsMut = useMutation({
    mutationFn: () => api.get('/evaluation/export-results/', {
      params: { exam_session: selectedSession },
      responseType: 'blob'
    }).then(r => {
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `resultats_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    }),
    onSuccess: () => toast.success('Export réussi')
  })

  const columns: Column<any>[] = [
    {
      key: 'student',
      label: 'Étudiant',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.student_name}</p>
          <p className="text-xs text-gray-400">{row.student_id}</p>
        </div>
      )
    },
    {
      key: 'average',
      label: 'Moyenne',
      sortable: true,
      render: (val) => (
        <span className={`font-bold ${val >= 10 ? 'text-emerald-600' : 'text-red-600'}`}>
          {val?.toFixed(2) || '—'}/20
        </span>
      )
    },
    {
      key: 'credits_obtained',
      label: 'Crédits',
      render: (val, row) => `${val || 0}/${row.total_credits || 0}`
    },
    {
      key: 'mention',
      label: 'Mention',
      render: (val) => val || '—'
    },
    {
      key: 'decision',
      label: 'Décision',
      render: (val) => (
        <Badge
          label={val === 'admis' ? 'Admis' : 'Ajourné'}
          className={val === 'admis' ? 'badge-green' : 'badge-red'}
        />
      )
    },
    {
      key: 'published',
      label: 'Statut',
      render: (val) => (
        <Badge
          label={val ? 'Publié' : 'Non publié'}
          className={val ? 'badge-blue' : 'badge-gray'}
        />
      )
    }
  ]

  const publishedCount = results?.filter((r: any) => r.published).length || 0
  const admisCount = results?.filter((r: any) => r.decision === 'admis').length || 0
  const successRate = results?.length > 0 ? ((admisCount / results.length) * 100).toFixed(1) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des résultats</h1>
          <p className="text-sm text-gray-500 mt-1">Calcul et publication des résultats semestriels</p>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Session d'examen</label>
            <select
              className="input"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
            >
              <option value="">Sélectionner une session</option>
              {sessions?.results?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.semester_label} - {s.session_type_display} ({s.academic_year_label})
                </option>
              ))}
            </select>
          </div>

          {selectedSession && (
            <div className="flex gap-2 pt-6">
              <Button
                onClick={() => calculateResultsMut.mutate()}
                loading={calculateResultsMut.isPending}
                icon={<Calculator className="w-4 h-4" />}
                variant="secondary"
              >
                Calculer
              </Button>
              <Button
                onClick={() => publishResultsMut.mutate()}
                loading={publishResultsMut.isPending}
                icon={<Send className="w-4 h-4" />}
                disabled={!results || results.length === 0}
              >
                Publier
              </Button>
              <Button
                onClick={() => exportResultsMut.mutate()}
                loading={exportResultsMut.isPending}
                icon={<Download className="w-4 h-4" />}
                variant="ghost"
              >
                Export CSV
              </Button>
            </div>
          )}
        </div>

        {selectedSession && results && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">Total étudiants</p>
              <p className="text-2xl font-bold text-blue-900">{results.length}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-xs text-emerald-600 font-medium mb-1">Taux de réussite</p>
              <p className="text-2xl font-bold text-emerald-900">{successRate}%</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs text-purple-600 font-medium mb-1">Résultats publiés</p>
              <p className="text-2xl font-bold text-purple-900">{publishedCount}/{results.length}</p>
            </div>
          </div>
        )}
      </Card>

      {selectedSession && (
        <DataTable
          data={results || []}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Rechercher un étudiant..."
          emptyMessage="Aucun résultat disponible"
          pageSize={20}
        />
      )}
    </div>
  )
}

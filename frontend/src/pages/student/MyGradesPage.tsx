/**
 * MyGradesPage - Page des notes pour étudiant
 * =========================================
 * 
 * Affiche toutes les notes de l'étudiant avec :
 * - Filtres par semestre et session
 * - Statistiques personnelles
 * - Graphiques d'évolution
 * - Détails par UE et EC
 * 
 * @module pages/student/MyGradesPage
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Award, TrendingUp, Target, BookOpen, AlertTriangle } from 'lucide-react'
import { Card, StatsCard, Tabs, Badge, Spinner, Empty, Modal, Button } from '../../components/ui'
import PageHeader from '../../components/layout/PageHeader'
import LineChart from '../../components/charts/LineChart'
import BarChart from '../../components/charts/BarChart'
import { evaluationApi } from '../../api'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

interface Grade {
  id: string
  ec_code: string
  ec_name: string
  cc_grade: number | null
  exam_grade: number | null
  final_grade: number | null
  is_absent: boolean
  status: string
  appreciation: string
}

export default function MyGradesPage() {
  const [selectedSemester, setSelectedSemester] = useState('all')
  const [selectedSession, setSelectedSession] = useState('current')
  const [contestGrade, setContestGrade] = useState<Grade | null>(null)
  const qc = useQueryClient()

  // Récupérer les notes
  const { data: grades, isLoading } = useQuery({
    queryKey: ['my-grades', selectedSemester, selectedSession],
    queryFn: () => api.get('/evaluation/student/grades/', {
      params: {
        semester: selectedSemester !== 'all' ? selectedSemester : undefined,
        exam_session: selectedSession !== 'current' ? selectedSession : undefined
      }
    }).then(r => r.data)
  })

  // Récupérer les statistiques
  const { data: stats } = useQuery({
    queryKey: ['my-grades-stats'],
    queryFn: () => api.get('/evaluation/student/statistics/').then(r => r.data)
  })

  const contestMut = useMutation({
    mutationFn: (data: { grade_id: string; reason: string }) => evaluationApi.submitGradeContest(data),
    onSuccess: () => {
      toast.success('Réclamation envoyée à la scolarité')
      setContestGrade(null)
      qc.invalidateQueries({ queryKey: ['my-grades'] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e?.response?.data?.error ?? 'Erreur lors de l\'envoi de la réclamation')
    },
  })

  // Normaliser les notes : l'API renvoie les DecimalField Django sous forme
  // de chaînes (ex. "15.00"), pas de nombres — .toFixed() plante dessus.
  const normalizedGrades: Grade[] = (grades ?? []).map((g: Grade) => ({
    ...g,
    cc_grade: g.cc_grade !== null && g.cc_grade !== undefined ? Number(g.cc_grade) : null,
    exam_grade: g.exam_grade !== null && g.exam_grade !== undefined ? Number(g.exam_grade) : null,
    final_grade: g.final_grade !== null && g.final_grade !== undefined ? Number(g.final_grade) : null,
  }))

  // Calculer les statistiques locales
  const validGrades = normalizedGrades.filter((g: Grade) => g.final_grade !== null && !g.is_absent)
  const average = validGrades.length > 0
    ? (validGrades.reduce((sum: number, g: Grade) => sum + (g.final_grade || 0), 0) / validGrades.length).toFixed(2)
    : '—'

  const successCount = validGrades.filter((g: Grade) => (g.final_grade || 0) >= 10).length
  const successRate = validGrades.length > 0
    ? ((successCount / validGrades.length) * 100).toFixed(1)
    : '—'

  // Préparer données pour graphiques
  const chartData = validGrades.map((g: Grade) => ({
    name: g.ec_code,
    'Note CC': g.cc_grade || 0,
    'Examen': g.exam_grade || 0,
    'Finale': g.final_grade || 0
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes Notes"
        description="Consultez vos résultats et suivez votre progression"
        breadcrumbs={[
          { label: 'Accueil', href: '/dashboard' },
          { label: 'Mes Notes' }
        ]}
      />

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Moyenne générale"
            value={average}
            icon={<Award className="w-5 h-5" />}
            color="bg-primary-600"
            subtitle="/20"
          />
          <StatsCard
            title="Taux de réussite"
            value={`${successRate}%`}
            icon={<Target className="w-5 h-5" />}
            color="bg-emerald-600"
          />
          <StatsCard
            title="EC validés"
            value={`${successCount}/${validGrades.length}`}
            icon={<BookOpen className="w-5 h-5" />}
            color="bg-blue-600"
          />
          <StatsCard
            title="Crédits obtenus"
            value={stats.total_credits || 0}
            icon={<TrendingUp className="w-5 h-5" />}
            color="bg-purple-600"
            subtitle={`/${stats.total_credits_available || 0}`}
          />
        </div>
      )}

      {/* Graphiques */}
      {!isLoading && validGrades.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Évolution des notes" noPadding>
            <div className="p-6">
              <LineChart
                data={chartData}
                lines={[
                  { dataKey: 'Finale', name: 'Note finale', color: '#3b82f6' }
                ]}
                xAxisKey="name"
                height={250}
              />
            </div>
          </Card>

          <Card title="Comparaison CC vs Examen" noPadding>
            <div className="p-6">
              <BarChart
                data={chartData.slice(0, 6)}
                bars={[
                  { dataKey: 'Note CC', name: 'CC (40%)', color: '#10b981' },
                  { dataKey: 'Examen', name: 'Examen (60%)', color: '#3b82f6' }
                ]}
                xAxisKey="name"
                height={250}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Tableau des notes */}
      <Card title="Détail des notes" noPadding>
        {isLoading ? (
          <Spinner text="Chargement des notes..." />
        ) : validGrades.length === 0 ? (
          <Empty message="Aucune note disponible" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 uppercase text-xs">
                    EC
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 uppercase text-xs">
                    CC (40%)
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 uppercase text-xs">
                    Examen (60%)
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 uppercase text-xs">
                    Note finale
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 uppercase text-xs">
                    Statut
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 uppercase text-xs">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {validGrades.map((grade: Grade) => (
                  <tr key={grade.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-50">{grade.ec_name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{grade.ec_code}</p>
                    </td>
                    <td className="text-center px-4 py-3">
                      {grade.cc_grade?.toFixed(2) || '—'}
                    </td>
                    <td className="text-center px-4 py-3">
                      {grade.exam_grade?.toFixed(2) || '—'}
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className={`font-bold ${
                        (grade.final_grade || 0) >= 10
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}>
                        {grade.final_grade?.toFixed(2) || '—'}/20
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <Badge
                        label={(grade.final_grade || 0) >= 10 ? 'Validé' : 'Échoué'}
                        className={(grade.final_grade || 0) >= 10 ? 'badge-green' : 'badge-red'}
                      />
                    </td>
                    <td className="text-right px-4 py-3">
                      {(grade.status === 'validee' || grade.status === 'publiee') && (
                        <button onClick={() => setContestGrade(grade)}
                          className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 ml-auto">
                          <AlertTriangle className="w-3 h-3" /> Contester
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal contestation */}
      <Modal open={!!contestGrade} onClose={() => setContestGrade(null)}
        title="Contester une note" subtitle={contestGrade?.ec_name} size="sm">
        {contestGrade && (
          <ContestForm
            grade={contestGrade}
            loading={contestMut.isPending}
            onSubmit={(reason) => contestMut.mutate({ grade_id: contestGrade.id, reason })}
            onCancel={() => setContestGrade(null)}
          />
        )}
      </Modal>
    </div>
  )
}

function ContestForm({ grade, loading, onSubmit, onCancel }: {
  grade: Grade; loading: boolean; onSubmit: (reason: string) => void; onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5 flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">Note finale</span>
        <span className={`font-bold ${(grade.final_grade || 0) >= 10 ? 'text-emerald-600' : 'text-red-600'}`}>
          {grade.final_grade?.toFixed(2) ?? '—'}/20
        </span>
      </div>
      <div>
        <label className="label">Motif de la contestation *</label>
        <textarea className="input min-h-[100px] resize-none" value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Expliquez pourquoi vous contestez cette note (erreur de saisie, contre-vérification demandée...)" />
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" variant="danger" loading={loading} disabled={!reason.trim()}
          onClick={() => onSubmit(reason)}>
          Envoyer la réclamation
        </Button>
      </div>
    </div>
  )
}

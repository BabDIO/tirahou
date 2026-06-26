import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Search, TrendingUp, AlertTriangle, Eye } from 'lucide-react'
import { Card, Spinner, Badge, Empty, Progress } from '../../components/ui'
import api from '../../lib/axios'

export default function MyStudentsPage() {
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('')

  const { data: students, isLoading } = useQuery({
    queryKey: ['teacher-students'],
    queryFn: () => api.get('/students/').then(r => r.data),
  })

  const { data: engagementScores } = useQuery({
    queryKey: ['engagement-scores'],
    queryFn: () => api.get('/analytics/engagement-scores/').then(r => r.data),
  })

  const studentList = students?.results ?? []
  const scores = engagementScores?.results ?? []
  const scoreMap: Record<string, { engagement_score: number; dropout_risk: string; completion_rate: number }> = {}
  scores.forEach((s: { student: string; engagement_score: number; dropout_risk: string; completion_rate: number }) => { scoreMap[s.student] = s })

  const filtered = studentList.filter((s: { id: string; student_id: string; user: { first_name: string; last_name: string } }) => {
    const matchSearch = !search || `${s.user.first_name} ${s.user.last_name} ${s.student_id}`.toLowerCase().includes(search.toLowerCase())
    const score = scoreMap[s.id]
    const matchRisk = !riskFilter || score?.dropout_risk === riskFilter
    return matchSearch && matchRisk
  })

  const riskColor = (r: string) => ({
    faible: 'badge-green', moyen: 'badge-yellow', eleve: 'badge-orange', critique: 'badge-red',
  }[r] ?? 'badge-gray')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Mes Étudiants</h1>
        <p className="text-gray-400 text-sm mt-0.5">Suivi de l'engagement et du risque de décrochage</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Rechercher un étudiant..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-full sm:w-44" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
          <option value="">Tous les risques</option>
          <option value="faible">Faible risque</option>
          <option value="moyen">Risque moyen</option>
          <option value="eleve">Risque élevé</option>
          <option value="critique">Risque critique</option>
        </select>
      </div>

      {isLoading ? <Spinner /> : !filtered.length ? (
        <Empty icon={<Users className="w-8 h-8" />} message="Aucun étudiant trouvé" />
      ) : (
        <div className="space-y-2">
          {filtered.map((s: { id: string; student_id: string; status: string; user: { first_name: string; last_name: string; email: string } }) => {
            const score = scoreMap[s.id]
            return (
              <Card key={s.id} hover>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-700 font-black text-sm">
                    {s.user.first_name[0]}{s.user.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-gray-900">{s.user.first_name} {s.user.last_name}</p>
                        <p className="text-xs text-gray-400">{s.student_id} · {s.user.email}</p>
                      </div>
                      {score && (
                        <Badge label={score.dropout_risk} className={riskColor(score.dropout_risk)} />
                      )}
                    </div>
                    {score && (
                      <div className="mt-2 flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Engagement</span>
                            <span className="font-semibold">{Math.round(score.engagement_score)}/100</span>
                          </div>
                          <Progress value={score.engagement_score}
                            color={score.engagement_score >= 70 ? 'bg-emerald-500' : score.engagement_score >= 40 ? 'bg-amber-500' : 'bg-red-500'}
                            size="sm" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Complétion</span>
                            <span className="font-semibold">{Math.round(score.completion_rate)}%</span>
                          </div>
                          <Progress value={score.completion_rate} color="bg-primary-500" size="sm" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

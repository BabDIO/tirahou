import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, TrendingDown } from 'lucide-react'
import { Card, StatsCard, Badge, Progress } from '../../components/ui'
import api from '../../lib/axios'

export default function MyAttendancePage() {
  const { data: attendance } = useQuery({
    queryKey: ['student-attendance'],
    queryFn: () => api.get('/student/attendance/').then(r => r.data)
  })

  const { data: stats } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: () => api.get('/student/attendance/stats/').then(r => r.data)
  })

  const rate = stats?.rate || 0
  const present = stats?.present || 0
  const absent = stats?.absent || 0
  const total = present + absent

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mon assiduité</h1>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatsCard title="Taux de présence" value={`${rate}%`} icon={<TrendingDown className="w-5 h-5" />} color="bg-blue-600" />
        <StatsCard title="Présent" value={present} icon={<CheckCircle className="w-5 h-5" />} color="bg-emerald-600" />
        <StatsCard title="Absent" value={absent} icon={<XCircle className="w-5 h-5" />} color="bg-red-600" />
        <StatsCard title="Total séances" value={total} icon={<Clock className="w-5 h-5" />} color="bg-purple-600" />
      </div>

      <Card title="Progression">
        <Progress value={rate} max={100} label="Taux de présence" size="lg" color={rate >= 75 ? 'bg-emerald-600' : rate >= 50 ? 'bg-amber-600' : 'bg-red-600'} />
        {rate < 75 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">⚠️ Votre taux de présence est inférieur à 75%. Cela peut affecter votre validation du semestre.</p>
          </div>
        )}
      </Card>

      <Card title="Historique">
        <div className="space-y-3">
          {attendance?.map((record: any) => (
            <div key={record.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${record.status === 'present' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {record.status === 'present' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
              </div>
              <div className="flex-1">
                <p className="font-medium">{record.course_name}</p>
                <p className="text-sm text-gray-500">{record.date} - {record.time}</p>
              </div>
              <Badge label={record.status === 'present' ? 'Présent' : 'Absent'} className={record.status === 'present' ? 'badge-green' : 'badge-red'} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

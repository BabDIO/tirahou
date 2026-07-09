import { useQuery } from '@tanstack/react-query'
import { BookOpen, Award, Calendar, FileText, TrendingUp, Clock } from 'lucide-react'
import { Card, StatsCard, Button } from '../../components/ui'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/axios'

export default function StudentDashboard() {
  const navigate = useNavigate()

  const { data: stats } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => api.get('/student/dashboard/').then(r => r.data)
  })

  const { data: upcomingClasses } = useQuery({
    queryKey: ['upcoming-classes'],
    queryFn: () => api.get('/student/upcoming-classes/').then(r => r.data)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord étudiant</h1>
        <p className="text-sm text-gray-500 mt-1">Bienvenue sur votre espace personnel</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Mes cours" value={stats?.courses_count || 0} icon={<BookOpen className="w-5 h-5" />} color="bg-blue-600" />
        <StatsCard title="Moyenne générale" value={`${stats?.average || 0}/20`} icon={<Award className="w-5 h-5" />} color="bg-emerald-600" />
        <StatsCard title="Crédits obtenus" value={`${stats?.credits || 0}/${stats?.total_credits || 0}`} icon={<TrendingUp className="w-5 h-5" />} color="bg-purple-600" />
        <StatsCard title="Assiduité" value={`${stats?.attendance_rate || 0}%`} icon={<Clock className="w-5 h-5" />} color="bg-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Prochains cours">
            {upcomingClasses?.map((c: any) => (
              <div key={c.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-gray-500">{c.time}</p>
                </div>
                <Button size="sm" onClick={() => navigate(`/virtual-classes/${c.id}`)}>Rejoindre</Button>
              </div>
            ))}
          </Card>
        </div>

        <Card title="Actions rapides">
          <div className="space-y-2">
            <button onClick={() => navigate('/student/grades')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition text-left">
              <Award className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium">Mes notes</span>
            </button>
            <button onClick={() => navigate('/student/schedule')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition text-left">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">Mon emploi du temps</span>
            </button>
            <button onClick={() => navigate('/student/documents')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition text-left">
              <FileText className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium">Mes documents</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, Clock, Award, CheckCircle, Sparkles } from 'lucide-react'
import { analyticsApi } from '../../api'
import { Card, Badge, Button, Spinner } from '../../components/ui'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

interface MicroCertification {
  id: string
  title: string
  code: string
  description: string
  program_name: string | null
  duration_hours: number
  credits: number
  price: string
  is_free: boolean
  badge_name: string | null
}

interface StudentCertification {
  id: string
  status: string
  status_display: string
  score: string | null
  enrolled_at: string
  completed_at: string | null
  verification_code: string
  certification_detail: MicroCertification
}

const STATUS_BADGE: Record<string, string> = {
  enrolled: 'badge-blue', in_progress: 'badge-amber', completed: 'badge-green',
  certified: 'badge-purple', failed: 'badge-red',
}

export default function MyCertificationsPage() {
  const queryClient = useQueryClient()

  const { data: catalog, isLoading: loadingCatalog } = useQuery({
    queryKey: ['micro-certifications'],
    queryFn: () => analyticsApi.getMicroCertifications().then(r => (r.data.results ?? r.data) as MicroCertification[]),
  })

  const { data: myCertifications, isLoading: loadingMine } = useQuery({
    queryKey: ['my-certifications'],
    queryFn: () => analyticsApi.getMyCertifications().then(r => (r.data.results ?? r.data) as StudentCertification[]),
  })

  const enrollMutation = useMutation({
    mutationFn: (certificationId: string) => analyticsApi.enrollCertification(certificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-certifications'] })
      toast.success('Inscription réussie !')
    },
    onError: () => toast.error('Erreur lors de l\'inscription'),
  })

  const enrolledIds = new Set((myCertifications ?? []).map((sc) => sc.certification_detail.id))

  if (loadingCatalog || loadingMine) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner text="Chargement des micro-certifications..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span className="text-indigo-200 text-sm font-medium">Développement de compétences</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Micro-certifications</h1>
          </div>
        </div>
      </div>

      {/* My certifications */}
      <Card title="Mes certifications" subtitle={`${myCertifications?.length ?? 0} inscription(s)`}>
        {!myCertifications || myCertifications.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Vous n'êtes inscrit à aucune certification pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {myCertifications.map((sc) => (
              <div key={sc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    sc.status === 'certified' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300' : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  )}>
                    {sc.status === 'certified' ? <Award className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{sc.certification_detail.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {sc.score != null ? `Note : ${Number(sc.score).toFixed(1)}/20` : `Inscrit le ${new Date(sc.enrolled_at).toLocaleDateString('fr-FR')}`}
                    </p>
                  </div>
                </div>
                <Badge label={sc.status_display} className={STATUS_BADGE[sc.status] ?? 'badge-gray'} dot />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Catalog */}
      <Card title="Catalogue disponible" subtitle={`${catalog?.length ?? 0} certification(s) publiée(s)`}>
        {!catalog || catalog.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Aucune micro-certification disponible pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {catalog.map((cert) => {
              const isEnrolled = enrolledIds.has(cert.id)
              return (
                <div key={cert.id} className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{cert.title}</p>
                    <Badge label={cert.is_free ? 'Gratuit' : `${cert.price} FCFA`} className={cert.is_free ? 'badge-green' : 'badge-amber'} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{cert.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{cert.duration_hours}h</span>
                    <span>{cert.credits} crédit(s)</span>
                    {cert.program_name && <span>{cert.program_name}</span>}
                  </div>
                  {cert.badge_name && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-3 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Badge « {cert.badge_name} » à la clé
                    </p>
                  )}
                  <Button
                    size="sm" className="w-full"
                    disabled={isEnrolled || enrollMutation.isPending}
                    onClick={() => enrollMutation.mutate(cert.id)}
                  >
                    {isEnrolled ? 'Déjà inscrit' : 'S\'inscrire'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

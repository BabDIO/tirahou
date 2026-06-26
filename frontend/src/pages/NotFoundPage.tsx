import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-gray-200 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page introuvable</h1>
        <p className="text-gray-500 mb-8">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
            Retour
          </Button>
          <Button icon={<Home className="w-4 h-4" />} onClick={() => navigate('/dashboard')}>
            Tableau de bord
          </Button>
        </div>
      </div>
    </div>
  )
}

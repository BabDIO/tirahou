import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Shield, CheckCircle, XCircle, Search, Zap } from 'lucide-react'
import { Button, Spinner, Alert } from '../../components/ui'
import { documentsApi } from '../../api'
import { formatDate } from '../../lib/utils'

export default function VerifyDocumentPage() {
  const { code } = useParams<{ code?: string }>()
  const navigate = useNavigate()
  const [inputCode, setInputCode] = useState(code ?? '')
  const [searchCode, setSearchCode] = useState(code ?? '')

  const { data, isLoading, error } = useQuery({
    queryKey: ['verify-doc', searchCode],
    queryFn: () => documentsApi.verifyDocument(searchCode).then((r: { data: { valid: boolean; doc_type?: string; student?: string; generated_at?: string; status?: string } }) => r.data),
    enabled: !!searchCode,
    retry: false,
  })

  const handleSearch = () => {
    if (inputCode.trim()) setSearchCode(inputCode.trim())
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">SIGUVH</span>
          </div>
          <span className="text-sm text-gray-500">Vérification de document</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          {/* Title */}
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Vérification de document</h1>
            <p className="text-gray-500 text-sm mt-2">
              Entrez le code de vérification figurant sur le document pour confirmer son authenticité.
            </p>
          </div>

          {/* Search */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <label className="label">Code de vérification</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1 font-mono uppercase tracking-widest"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.toUpperCase())}
                  placeholder="VER-XXXXXXXXXXXX"
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} icon={<Search className="w-4 h-4" />}>
                  Vérifier
                </Button>
              </div>
            </div>

            {isLoading && <Spinner text="Vérification en cours..." />}

            {/* Valid document */}
            {data?.valid && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-800">Document authentique ✓</p>
                    <p className="text-sm text-emerald-600">Ce document est valide et a été émis par SIGUVH.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    ['Type de document', data.doc_type],
                    ['Étudiant', data.student],
                    ['Généré le', formatDate(data.generated_at ?? null)],
                    ['Statut', data.status],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm text-gray-600">{label}</span>
                      <span className="text-sm font-semibold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invalid document */}
            {(error || (data && !data.valid)) && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-red-800">Document introuvable ✗</p>
                  <p className="text-sm text-red-600">
                    Ce code ne correspond à aucun document dans notre système.
                    Vérifiez le code et réessayez.
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400">
            Ce service de vérification est fourni par SIGUVH — Université Virtuelle Hybride
          </p>
        </div>
      </div>
    </div>
  )
}

import { saveAs } from 'file-saver'
import { useToast } from './useToast'

export function useDownload() {
  const toast = useToast()

  const download = async (
    fetcher: () => Promise<{ data: Blob; headers: Record<string, string> }>,
    filename: string
  ) => {
    const tid = toast.loading('Téléchargement en cours...')
    try {
      const res = await fetcher()
      const contentType = res.headers['content-type'] || 'application/octet-stream'
      saveAs(new Blob([res.data], { type: contentType }), filename)
      toast.dismiss(tid)
      toast.success('Fichier téléchargé')
    } catch {
      toast.dismiss(tid)
      toast.error('Erreur lors du téléchargement')
    }
  }

  const downloadPDF = (studentId: string, type: 'certificat' | 'releve', params?: object) => {
    const filename = type === 'certificat' ? 'certificat_scolarite.pdf' : 'releve_notes.pdf'
    return download(
      () => import('../api').then(({ documentsApi }) =>
        type === 'certificat'
          ? documentsApi.generateCertificatPDF(studentId, params) as Promise<{ data: Blob; headers: Record<string, string> }>
          : documentsApi.generateRelevePDF(studentId, params) as Promise<{ data: Blob; headers: Record<string, string> }>
      ),
      filename
    )
  }

  const downloadExcel = (type: 'students' | 'grades' | 'payments', params?: object) => {
    const filenames = { students: 'etudiants.xlsx', grades: 'notes.xlsx', payments: 'paiements.csv' }
    return download(
      () => import('../api').then(({ analyticsApi }) => {
        if (type === 'students') return analyticsApi.exportStudents(params) as Promise<{ data: Blob; headers: Record<string, string> }>
        if (type === 'grades') return analyticsApi.exportGrades(params) as Promise<{ data: Blob; headers: Record<string, string> }>
        return analyticsApi.exportPayments(params) as Promise<{ data: Blob; headers: Record<string, string> }>
      }),
      filenames[type]
    )
  }

  return { download, downloadPDF, downloadExcel }
}

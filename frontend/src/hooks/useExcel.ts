import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export function useExcel() {
  const exportToExcel = (data: object[], filename: string, sheetName = 'Données') => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    // Auto column width
    const cols = Object.keys(data[0] ?? {}).map(key => ({ wch: Math.max(key.length, 15) }))
    ws['!cols'] = cols
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${filename}.xlsx`)
  }

  const importFromExcel = (file: File): Promise<object[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          resolve(XLSX.utils.sheet_to_json(ws))
        } catch (err) {
          reject(err)
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  const exportGradesTemplate = (students: { student_id: string; full_name: string }[], ecCode: string) => {
    const data = students.map(s => ({
      'Matricule': s.student_id,
      'Nom complet': s.full_name,
      'EC': ecCode,
      'Note CC (0-20)': '',
      'Note Examen (0-20)': '',
      'Note Finale (0-20)': '',
      'Absent (OUI/NON)': 'NON',
    }))
    exportToExcel(data, `notes_${ecCode}`, 'Notes')
  }

  return { exportToExcel, importFromExcel, exportGradesTemplate }
}

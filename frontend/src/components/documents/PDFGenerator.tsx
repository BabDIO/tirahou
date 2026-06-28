import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, type DocumentProps } from '@react-pdf/renderer'
import { Download } from 'lucide-react'
import { Button } from '../ui'

const S = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1f2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, paddingBottom: 15, borderBottomWidth: 2, borderBottomColor: '#2563eb' },
  uniName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1e3a8a' },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 20, color: '#1e3a8a' },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#2563eb', marginBottom: 8, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: '#dbeafe' },
  row: { flexDirection: 'row', marginBottom: 5 },
  label: { width: '40%', fontFamily: 'Helvetica-Bold', color: '#6b7280' },
  value: { width: '60%' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1e3a8a', padding: 6 },
  tableHeaderCell: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  tableRow: { flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tableCell: { fontSize: 9 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#9ca3af', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
  verifyBox: { alignItems: 'center', marginTop: 20, padding: 15, backgroundColor: '#f9fafb', borderRadius: 8 },
  verifyCode: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#2563eb', letterSpacing: 2 },
  infoBox: { marginTop: 15, padding: 15, backgroundColor: '#f0f9ff', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#2563eb' },
})

// ── Certificat de Scolarité ───────────────────────────────────────────────────
interface CertificatProps {
  student: {
    full_name: string; student_id: string; nationality: string
    birth_date: string; program_name: string; level: number; academic_year: string
  }
  university: string
  verificationCode: string
  date: string
}

export const CertificatScolarite = ({ student, university, verificationCode, date }: CertificatProps) => (
  <Document>
    <Page size="A4" style={S.page}>
      <View style={S.header}>
        <View>
          <Text style={S.uniName}>{university}</Text>
          <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>Service de Scolarité</Text>
        </View>
        <Text style={{ fontSize: 9, color: '#6b7280' }}>Délivré le {date}</Text>
      </View>

      <Text style={S.title}>CERTIFICAT DE SCOLARITÉ</Text>

      <View style={{ marginBottom: 15 }}>
        <Text style={S.sectionTitle}>Informations de l'étudiant</Text>
        {([
          ['Nom complet', student.full_name],
          ['Matricule', student.student_id],
          ['Nationalité', student.nationality],
          ['Date de naissance', student.birth_date],
          ['Programme', student.program_name],
          ['Niveau', `Licence ${student.level}`],
          ['Année académique', student.academic_year],
        ] as [string, string][]).map(([label, value]) => (
          <View key={label} style={S.row}>
            <Text style={S.label}>{label} :</Text>
            <Text style={S.value}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={S.infoBox}>
        <Text style={{ fontSize: 10, lineHeight: 1.6 }}>
          Le présent certificat atteste que l'étudiant(e) susmentionné(e) est régulièrement
          inscrit(e) à {university} pour l'année académique {student.academic_year},
          en {student.program_name}, niveau Licence {student.level}.
        </Text>
        <Text style={{ fontSize: 10, marginTop: 8 }}>
          Ce certificat est délivré pour servir et valoir ce que de droit.
        </Text>
      </View>

      <View style={S.verifyBox}>
        <Text style={{ fontSize: 9, color: '#6b7280', marginBottom: 5 }}>Code de vérification</Text>
        <Text style={S.verifyCode}>{verificationCode}</Text>
        <Text style={{ fontSize: 8, color: '#9ca3af', marginTop: 4 }}>
          Vérifiez sur : TIRAHOU.edu/verify/{verificationCode}
        </Text>
      </View>

      <View style={S.footer}>
        <Text>Document généré par TIRAHOU · {university} · {date}</Text>
      </View>
    </Page>
  </Document>
)

// ── Relevé de Notes ───────────────────────────────────────────────────────────
interface ReleveProps {
  student: { full_name: string; student_id: string; program_name: string; academic_year: string }
  results: { ue_code: string; ue_name: string; credits: number; average: number | null; decision: string }[]
  semester: string
  university: string
  verificationCode: string
  date: string
}

export const ReleveNotes = ({ student, results, semester, university, verificationCode, date }: ReleveProps) => {
  const validatedCredits = results.reduce((s, r) =>
    s + (['valide', 'compense'].includes(r.decision) ? r.credits : 0), 0)
  const validResults = results.filter(r => r.average !== null)
  const avg = validResults.length
    ? validResults.reduce((s, r) => s + (r.average ?? 0), 0) / validResults.length
    : 0

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.uniName}>{university}</Text>
            <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>Service de Scolarité</Text>
          </View>
          <Text style={{ fontSize: 9, color: '#6b7280' }}>Délivré le {date}</Text>
        </View>

        <Text style={S.title}>RELEVÉ DE NOTES — {semester.toUpperCase()}</Text>

        <View style={{ marginBottom: 15 }}>
          <Text style={S.sectionTitle}>Étudiant</Text>
          <View style={{ flexDirection: 'row', gap: 15 }}>
            {([['Nom', student.full_name], ['Matricule', student.student_id], ['Programme', student.program_name], ['Année', student.academic_year]] as [string, string][]).map(([l, v]) => (
              <View key={l} style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, color: '#6b7280' }}>{l}</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text style={S.sectionTitle}>Résultats par UE</Text>
          <View style={S.tableHeader}>
            <Text style={[S.tableHeaderCell, { width: '15%' }]}>Code</Text>
            <Text style={[S.tableHeaderCell, { width: '42%' }]}>Unité d'Enseignement</Text>
            <Text style={[S.tableHeaderCell, { width: '13%', textAlign: 'center' }]}>Crédits</Text>
            <Text style={[S.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Moyenne</Text>
            <Text style={[S.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Décision</Text>
          </View>
          {results.map((r, i) => (
            <View key={i} style={[S.tableRow, { backgroundColor: i % 2 === 0 ? 'white' : '#f9fafb' }]}>
              <Text style={[S.tableCell, { width: '15%', fontFamily: 'Helvetica-Bold', color: '#2563eb' }]}>{r.ue_code}</Text>
              <Text style={[S.tableCell, { width: '42%' }]}>{r.ue_name}</Text>
              <Text style={[S.tableCell, { width: '13%', textAlign: 'center' }]}>{r.credits}</Text>
              <Text style={[S.tableCell, { width: '15%', textAlign: 'center', fontFamily: 'Helvetica-Bold', color: (r.average ?? 0) >= 10 ? '#059669' : '#dc2626' }]}>
                {r.average !== null ? `${Number(r.average).toFixed(2)}/20` : '—'}
              </Text>
              <Text style={[S.tableCell, { width: '15%', textAlign: 'center', color: ['valide', 'compense'].includes(r.decision) ? '#059669' : '#dc2626' }]}>
                {r.decision?.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 15 }}>
          <View style={{ backgroundColor: '#f0f9ff', padding: 10, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 8, color: '#6b7280' }}>Moyenne générale</Text>
            <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#2563eb' }}>{avg.toFixed(2)}/20</Text>
          </View>
          <View style={{ backgroundColor: '#f0fdf4', padding: 10, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 8, color: '#6b7280' }}>Crédits validés</Text>
            <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#059669' }}>{validatedCredits}</Text>
          </View>
        </View>

        <View style={S.verifyBox}>
          <Text style={{ fontSize: 9, color: '#6b7280', marginBottom: 5 }}>Code de vérification</Text>
          <Text style={S.verifyCode}>{verificationCode}</Text>
        </View>

        <View style={S.footer}>
          <Text>Document généré par TIRAHOU · {university} · {date}</Text>
        </View>
      </Page>
    </Document>
  )
}

// ── Bouton téléchargement PDF ─────────────────────────────────────────────────
interface PDFButtonProps {
  document: React.ReactElement<DocumentProps>
  filename: string
  label?: string
}

export function PDFButton({ document: doc, filename, label = 'Télécharger PDF' }: PDFButtonProps) {
  return (
    <PDFDownloadLink document={doc} fileName={`${filename}.pdf`}>
      {({ loading }: { loading: boolean }) => (
        <Button variant="secondary" size="sm" loading={loading} icon={<Download className="w-4 h-4" />}>
          {loading ? 'Génération...' : label}
        </Button>
      )}
    </PDFDownloadLink>
  )
}

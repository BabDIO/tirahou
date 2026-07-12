import { useEffect, useState, useCallback } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import api from '../../lib/api'
import { Button, Card, EmptyState, Loading, StatTile, colors } from '../../components/ui'

interface Ec {
  id: string
  code: string
  name: string
}

interface ExamSession {
  id: string
  session_type_display: string
  academic_year_label?: string
}

interface StudentEnrolled {
  id: string
  student_id: string
  user: { first_name: string; last_name: string }
}

interface ExistingGrade {
  id: string
  student: string
  cc_grade: number | string | null
  exam_grade: number | string | null
  is_absent: boolean
}

interface Entry {
  cc: string
  exam: string
  isAbsent: boolean
}

export default function TeacherGrades() {
  const [ecs, setEcs] = useState<Ec[]>([])
  const [sessions, setSessions] = useState<ExamSession[]>([])
  const [selectedEc, setSelectedEc] = useState<string>('')
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [students, setStudents] = useState<StudentEnrolled[]>([])
  const [entries, setEntries] = useState<Record<string, Entry>>({})
  const [stats, setStats] = useState<{ average?: number; success_rate?: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTable, setLoadingTable] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const [ecsRes, sessionsRes] = await Promise.all([api.get('/ecs/'), api.get('/exam-sessions/')])
        setEcs(ecsRes.data?.results ?? ecsRes.data ?? [])
        setSessions(sessionsRes.data?.results ?? sessionsRes.data ?? [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const loadTable = useCallback(async (ec: string, session: string) => {
    setLoadingTable(true)
    try {
      const [studentsRes, gradesRes, statsRes] = await Promise.all([
        api.get('/students/', { params: { enrolled_in_ec: ec } }),
        api.get('/evaluation/teacher/grades/', { params: { ec, exam_session: session } }),
        api.get('/evaluation/teacher/statistics/', { params: { ec, exam_session: session } }),
      ])
      const studentList: StudentEnrolled[] = studentsRes.data?.results ?? studentsRes.data ?? []
      setStudents(studentList)
      const existing: ExistingGrade[] = gradesRes.data ?? []
      const map: Record<string, Entry> = {}
      existing.forEach((g) => {
        map[g.student] = {
          cc: g.cc_grade !== null ? String(g.cc_grade) : '',
          exam: g.exam_grade !== null ? String(g.exam_grade) : '',
          isAbsent: g.is_absent,
        }
      })
      setEntries(map)
      setStats(statsRes.data ?? null)
    } catch {
      setStudents([])
    } finally {
      setLoadingTable(false)
    }
  }, [])

  const pickEc = (id: string) => {
    setSelectedEc(id)
    if (selectedSession) loadTable(id, selectedSession)
  }
  const pickSession = (id: string) => {
    setSelectedSession(id)
    if (selectedEc) loadTable(selectedEc, id)
  }

  const updateEntry = (studentId: string, field: 'cc' | 'exam', value: string) => {
    setEntries((prev) => {
      const current = prev[studentId] ?? { cc: '', exam: '', isAbsent: false }
      return { ...prev, [studentId]: { ...current, [field]: value } }
    })
  }

  const saveGrade = async (studentId: string) => {
    const entry = entries[studentId] ?? { cc: '', exam: '', isAbsent: false }
    const cc = parseFloat(entry.cc)
    const exam = parseFloat(entry.exam)
    if ((entry.cc && (cc < 0 || cc > 20)) || (entry.exam && (exam < 0 || exam > 20))) {
      Alert.alert('Note invalide', 'Les notes doivent être comprises entre 0 et 20.')
      return
    }
    setSavingId(studentId)
    try {
      await api.post('/evaluation/teacher/enter-grade/', {
        student_id: studentId,
        ec_id: selectedEc,
        exam_session_id: selectedSession,
        cc_grade: entry.cc !== '' ? cc : null,
        exam_grade: entry.exam !== '' ? exam : null,
        is_absent: entry.isAbsent,
      })
      Alert.alert('Enregistré', 'Note enregistrée avec succès.')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      Alert.alert('Erreur', e?.response?.data?.error ?? "Erreur lors de l'enregistrement.")
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <Loading label="Chargement..." />

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Saisie des Notes</Text>

      <Text style={styles.label}>Élément Constitutif</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {ecs.map((ec) => (
          <Pressable key={ec.id} onPress={() => pickEc(ec.id)} style={[styles.chip, selectedEc === ec.id && styles.chipActive]}>
            <Text style={[styles.chipText, selectedEc === ec.id && styles.chipTextActive]}>{ec.code}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>Session d'examen</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {sessions.map((s) => (
          <Pressable key={s.id} onPress={() => pickSession(s.id)} style={[styles.chip, selectedSession === s.id && styles.chipActive]}>
            <Text style={[styles.chipText, selectedSession === s.id && styles.chipTextActive]}>{s.session_type_display}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {!selectedEc || !selectedSession ? (
        <EmptyState label="Sélectionnez un EC et une session pour commencer la saisie." />
      ) : loadingTable ? (
        <Loading label="Chargement des étudiants..." />
      ) : students.length === 0 ? (
        <EmptyState label="Aucun étudiant inscrit à cet EC pour cette session." />
      ) : (
        <>
          {stats && (
            <View style={styles.statsRow}>
              <StatTile label="Moyenne" value={`${Number(stats.average ?? 0).toFixed(2)}/20`} />
              <StatTile label="Réussite" value={`${stats.success_rate ?? 0}%`} />
            </View>
          )}
          {students.map((s) => {
            const entry = entries[s.id] ?? { cc: '', exam: '', isAbsent: false }
            const ccVal = parseFloat(entry.cc) || 0
            const examVal = parseFloat(entry.exam) || 0
            const final = entry.isAbsent ? 0 : !entry.cc && !entry.exam ? null : Math.min(20, Math.max(0, ccVal * 0.4 + examVal * 0.6))
            return (
              <Card key={s.id}>
                <Text style={styles.studentName}>{s.user.first_name} {s.user.last_name}</Text>
                <Text style={styles.studentId}>{s.student_id}</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>CC (40%)</Text>
                    <TextInput
                      style={styles.gradeInput}
                      keyboardType="decimal-pad"
                      value={entry.cc}
                      onChangeText={(v) => updateEntry(s.id, 'cc', v)}
                      placeholder="—"
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Examen (60%)</Text>
                    <TextInput
                      style={styles.gradeInput}
                      keyboardType="decimal-pad"
                      value={entry.exam}
                      onChangeText={(v) => updateEntry(s.id, 'exam', v)}
                      placeholder="—"
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Finale</Text>
                    <Text style={[styles.finalGrade, { color: final === null ? colors.textMuted : final >= 10 ? colors.success : colors.danger }]}>
                      {final !== null ? final.toFixed(2) : '—'}
                    </Text>
                  </View>
                </View>
                <Button title="Enregistrer" onPress={() => saveGrade(s.id)} loading={savingId === s.id} />
              </Card>
            )
          })}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },
  chipRow: { marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  studentName: { fontSize: 15, fontWeight: '700', color: colors.text },
  studentId: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  inputCol: { flex: 1 },
  inputLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  gradeInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, textAlign: 'center', backgroundColor: '#fff' },
  finalGrade: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 4 },
})

import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { Badge, Button, Card, EmptyState, Loading, ScreenHeader, SectionTitle, colors } from '../components/ui'

interface Assignment {
  id: string
  title: string
  type_display: string
  instructions: string
  max_grade: number | string
  due_date: string
  course_space: string
}

interface Submission {
  id: string
  student_name: string
  file: string
  submitted_at: string
  is_late: boolean
  grade: number | string | null
  status: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AssignmentsScreen() {
  const role = useAuthStore((s) => s.role)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [mySubmittedIds, setMySubmittedIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/assignments/', { params: { ordering: 'due_date' } })
      const list: Assignment[] = data?.results ?? data ?? []
      setAssignments(list)

      if (role === 'enseignant') {
        const entries = await Promise.all(
          list.map(async (a) => {
            try {
              const res = await api.get(`/assignments/${a.id}/submissions/`)
              return [a.id, res.data ?? []] as const
            } catch {
              return [a.id, []] as const
            }
          })
        )
        setSubmissions(Object.fromEntries(entries))
      }
    } catch {
      setAssignments([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [role])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const submit = async (assignmentId: string) => {
    const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
    if (picked.canceled || !picked.assets?.length) return
    const file = picked.assets[0]

    setSubmittingId(assignmentId)
    try {
      const formData = new FormData()
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as unknown as Blob)
      await api.post(`/assignments/${assignmentId}/submit/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMySubmittedIds((prev) => new Set(prev).add(assignmentId))
    } catch {
      // L'échec est visible via l'absence de mise à jour de mySubmittedIds ;
      // le bouton "Déposer" reste actif pour réessayer.
    } finally {
      setSubmittingId(null)
    }
  }

  if (loading) return <Loading label="Chargement des devoirs..." />

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Devoirs" />

      {assignments.length === 0 ? (
        <EmptyState label="Aucun devoir publié pour le moment." icon="document-text-outline" />
      ) : (
        assignments.map((a) => {
          const overdue = new Date(a.due_date) < new Date()
          const alreadySubmitted = mySubmittedIds.has(a.id)
          return (
            <Card key={a.id} style={{ marginBottom: 12 }}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assignmentTitle}>{a.title}</Text>
                  <Text style={styles.meta}>{a.type_display} · {a.max_grade}/20</Text>
                </View>
                <Badge label={overdue ? 'Échéance dépassée' : formatDate(a.due_date)} tone={overdue ? 'danger' : 'default'} icon={overdue ? undefined : 'time-outline'} />
              </View>
              {a.instructions ? <Text style={styles.instructions}>{a.instructions}</Text> : null}

              {role === 'etudiant' && (
                alreadySubmitted ? (
                  <Badge label="Devoir soumis" tone="success" />
                ) : (
                  <Button
                    title="Déposer mon fichier"
                    variant="secondary"
                    icon="cloud-upload-outline"
                    loading={submittingId === a.id}
                    onPress={() => submit(a.id)}
                  />
                )
              )}

              {role === 'enseignant' && (
                <View style={{ marginTop: 10 }}>
                  <SectionTitle>Soumissions ({submissions[a.id]?.length ?? 0})</SectionTitle>
                  {(submissions[a.id] ?? []).length === 0 ? (
                    <Text style={styles.meta}>Aucune soumission pour le moment.</Text>
                  ) : (
                    submissions[a.id].map((s) => (
                      <View key={s.id} style={styles.submissionRow}>
                        <Text style={styles.submissionName}>{s.student_name}</Text>
                        <Badge
                          label={s.grade !== null ? `${Number(s.grade).toFixed(1)}/20` : (s.is_late ? 'En retard' : 'À corriger')}
                          tone={s.grade !== null ? 'success' : (s.is_late ? 'warning' : 'default')}
                        />
                      </View>
                    ))
                  )}
                </View>
              )}
            </Card>
          )
        })
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  assignmentTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  instructions: { fontSize: 13, color: colors.text, marginTop: 10, lineHeight: 18 },
  submissionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  submissionName: { fontSize: 13, color: colors.text },
})

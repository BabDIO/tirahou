import { useEffect, useState, useCallback } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native'
import api from '../../lib/api'
import { Badge, Card, EmptyState, Loading, colors } from '../../components/ui'

interface CourseSpace {
  id: string
  title: string
  code?: string
  students_count?: number
}

export default function TeacherCourses() {
  const [courses, setCourses] = useState<CourseSpace[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/course-spaces/')
      setCourses(data?.results ?? data ?? [])
      setError(false)
    } catch {
      setCourses([])
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  if (loading) return <Loading label="Chargement de vos cours..." />

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Mes Cours</Text>

      {error ? (
        <EmptyState label="Erreur de chargement de vos cours. Tirez vers le bas pour réessayer." />
      ) : courses.length === 0 ? (
        <EmptyState label="Aucun cours assigné." />
      ) : (
        courses.map((c) => (
          <Card key={c.id}>
            <Text style={styles.courseTitle}>{c.title}</Text>
            {c.code ? <Text style={styles.meta}>{c.code}</Text> : null}
            {typeof c.students_count === 'number' && <Badge label={`${c.students_count} étudiant(s)`} />}
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 14 },
  courseTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  meta: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
})

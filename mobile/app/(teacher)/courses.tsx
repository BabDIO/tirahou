import { useEffect, useState, useCallback } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import api from '../../lib/api'
import { Badge, Card, EmptyState, Icon, Loading, colors } from '../../components/ui'

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
        <EmptyState label="Erreur de chargement de vos cours. Tirez vers le bas pour réessayer." icon="alert-circle-outline" />
      ) : courses.length === 0 ? (
        <EmptyState label="Aucun cours assigné." icon="book-outline" />
      ) : (
        courses.map((c) => (
          <Card key={c.id}>
            <View style={styles.courseRow}>
              <View style={styles.courseIconWrap}>
                <Icon name="book-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseTitle}>{c.title}</Text>
                {c.code ? <Text style={styles.meta}>{c.code}</Text> : null}
              </View>
            </View>
            {typeof c.students_count === 'number' && <Badge label={`${c.students_count} étudiant(s)`} icon="people-outline" />}
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 14 },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  courseIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  courseTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
})

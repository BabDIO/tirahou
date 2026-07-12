import { useEffect, useState, useCallback } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Card, EmptyState, Loading, SectionTitle, StatTile, colors } from '../../components/ui'

interface CourseSpace {
  id: string
  title: string
}

interface ScheduledSession {
  id: string
  ec_name: string
  start_datetime: string
  status: string
}

interface PendingGrade {
  id: string
}

export default function TeacherHome() {
  const user = useAuthStore((s) => s.user)
  const [courses, setCourses] = useState<CourseSpace[]>([])
  const [upcoming, setUpcoming] = useState<ScheduledSession[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [coursesRes, sessionsRes, gradesRes] = await Promise.all([
        api.get('/course-spaces/'),
        api.get('/sessions/'),
        api.get('/grades/', { params: { status: 'saisie' } }),
      ])
      setCourses((coursesRes.data?.results ?? coursesRes.data ?? []).slice(0, 5))
      const sessions: ScheduledSession[] = sessionsRes.data?.results ?? sessionsRes.data ?? []
      setUpcoming(
        sessions
          .filter((s) => new Date(s.start_datetime) >= new Date() && s.status !== 'annule')
          .slice(0, 3)
      )
      const grades: PendingGrade[] = gradesRes.data?.results ?? gradesRes.data ?? []
      setPendingCount(grades.length)
    } catch {
      // le dashboard reste utilisable même en cas d'échec partiel
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

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  if (loading) return <Loading label="Chargement de votre espace..." />

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>{greeting},</Text>
      <Text style={styles.name}>{user?.first_name ?? user?.full_name}</Text>

      <View style={styles.statsGrid}>
        <StatTile label="Cours" value={courses.length} />
        <StatTile label="Notes à valider" value={pendingCount} tone={pendingCount > 0 ? 'warning' : 'success'} />
      </View>

      <SectionTitle>Prochains cours</SectionTitle>
      {upcoming.length === 0 ? (
        <Card>
          <Text style={{ color: colors.textMuted }}>Aucun cours à venir.</Text>
        </Card>
      ) : (
        upcoming.map((s) => (
          <Card key={s.id}>
            <Text style={styles.sessionTitle}>{s.ec_name}</Text>
            <Text style={styles.sessionTime}>
              {new Date(s.start_datetime).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Card>
        ))
      )}

      <SectionTitle>Mes cours</SectionTitle>
      {courses.length === 0 ? (
        <EmptyState label="Aucun cours assigné." />
      ) : (
        courses.map((c) => (
          <Card key={c.id}>
            <Text style={styles.sessionTitle}>{c.title}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  greeting: { fontSize: 15, color: colors.textMuted },
  name: { fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 18 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  sessionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sessionTime: { fontSize: 13, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
})

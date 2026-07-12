import { useEffect, useState, useCallback } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Card, Loading, SectionTitle, StatTile, colors } from '../../components/ui'

interface StudentStats {
  courses_count: number
  average: number
  credits: number
  total_credits: number
  attendance_rate: number
}

interface ScheduledSession {
  id: string | number
  ec_name: string
  start_datetime: string
  status: string
}

const EMPTY_STATS: StudentStats = { courses_count: 0, average: 0, credits: 0, total_credits: 0, attendance_rate: 0 }

export default function StudentHome() {
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<StudentStats>(EMPTY_STATS)
  const [upcoming, setUpcoming] = useState<ScheduledSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [dashRes, sessionsRes] = await Promise.all([
        api.get('/student/dashboard/'),
        api.get('/sessions/', { params: { ordering: 'start_datetime' } }),
      ])
      setStats(dashRes.data ?? EMPTY_STATS)
      const sessions: ScheduledSession[] = sessionsRes.data?.results ?? sessionsRes.data ?? []
      setUpcoming(
        sessions
          .filter((s) => new Date(s.start_datetime) >= new Date() && s.status !== 'annule')
          .slice(0, 3)
      )
    } catch {
      // Le fond de page reste utilisable même si le dashboard échoue à charger
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
        <StatTile label="Cours suivis" value={stats.courses_count} />
        <StatTile label="Moyenne" value={`${stats.average ?? 0}/20`} tone={((stats.average ?? 0) >= 10) ? 'success' : 'danger'} />
        <StatTile label="Crédits" value={`${stats.credits}/${stats.total_credits}`} />
        <StatTile label="Assiduité" value={`${stats.attendance_rate ?? 0}%`} tone={(stats.attendance_rate ?? 0) >= 75 ? 'success' : 'warning'} />
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

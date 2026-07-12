import { useEffect, useState, useCallback } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import api from '../../lib/api'
import { Badge, Card, EmptyState, Loading, colors } from '../../components/ui'

interface ScheduledSession {
  id: string
  ec_name: string
  ec_code: string
  teacher_name: string
  room_name: string | null
  mode_display: string
  start_datetime: string
  end_datetime: string
}

const DAYS_ORDER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export default function StudentSchedule() {
  const [sessions, setSessions] = useState<ScheduledSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/sessions/', { params: { ordering: 'start_datetime' } })
      setSessions(data?.results ?? data ?? [])
    } catch {
      setSessions([])
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

  if (loading) return <Loading label="Chargement de l'emploi du temps..." />

  const byDay: Record<string, ScheduledSession[]> = {}
  sessions.forEach((s) => {
    const day = new Date(s.start_datetime).toLocaleDateString('fr-FR', { weekday: 'long' })
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(s)
  })

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Mon Emploi du temps</Text>

      {sessions.length === 0 ? (
        <EmptyState label="Aucune séance planifiée." />
      ) : (
        DAYS_ORDER.filter((d) => byDay[d]).map((day) => (
          <View key={day} style={{ marginBottom: 16 }}>
            <Text style={styles.dayTitle}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
            {byDay[day].map((s) => (
              <Card key={s.id}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ecName}>{s.ec_name}</Text>
                    <Text style={styles.meta}>
                      {new Date(s.start_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {new Date(s.end_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {s.room_name ? ` · ${s.room_name}` : ''}
                    </Text>
                    {s.teacher_name ? <Text style={styles.meta}>{s.teacher_name}</Text> : null}
                  </View>
                  <Badge label={s.mode_display} />
                </View>
              </Card>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 14 },
  dayTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 8, textTransform: 'capitalize' },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  ecName: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
})

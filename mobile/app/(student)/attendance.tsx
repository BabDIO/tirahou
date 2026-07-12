import { useEffect, useState, useCallback } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import api from '../../lib/api'
import { Badge, Card, EmptyState, Loading, StatTile, colors } from '../../components/ui'

interface AttendanceRecord {
  id: string
  course_name: string
  date: string
  time: string
  status: 'present' | 'absent'
}

interface AttendanceStats {
  rate: number
  present: number
  absent: number
}

export default function StudentAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats>({ rate: 0, present: 0, absent: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [recRes, statsRes] = await Promise.all([
        api.get('/student/attendance/'),
        api.get('/student/attendance/stats/'),
      ])
      setRecords(recRes.data ?? [])
      setStats(statsRes.data ?? { rate: 0, present: 0, absent: 0 })
    } catch {
      setRecords([])
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

  if (loading) return <Loading label="Chargement de votre assiduité..." />

  const total = stats.present + stats.absent

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Mon Assiduité</Text>

      <View style={styles.statsGrid}>
        <StatTile label="Taux de présence" value={`${stats.rate}%`} tone={stats.rate >= 75 ? 'success' : 'danger'} />
        <StatTile label="Présent" value={stats.present} tone="success" />
        <StatTile label="Absent" value={stats.absent} tone="danger" />
        <StatTile label="Total séances" value={total} />
      </View>

      {stats.rate < 75 && total > 0 && (
        <Card style={styles.warningCard}>
          <Text style={styles.warningText}>⚠️ Votre taux de présence est inférieur à 75%. Cela peut affecter votre validation du semestre.</Text>
        </Card>
      )}

      {records.length === 0 ? (
        <EmptyState label="Aucun historique d'assiduité." />
      ) : (
        records.map((r) => (
          <Card key={r.id}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseName}>{r.course_name}</Text>
                <Text style={styles.meta}>{r.date} · {r.time}</Text>
              </View>
              <Badge label={r.status === 'present' ? 'Présent' : 'Absent'} tone={r.status === 'present' ? 'success' : 'danger'} />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  warningCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  warningText: { color: '#92400e', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  courseName: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
})

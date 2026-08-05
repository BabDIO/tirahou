import { useEffect, useState, useCallback } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import api from '../../lib/api'
import { Badge, Card, EmptyState, Icon, Loading, StatTile, colors } from '../../components/ui'

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
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const [recRes, statsRes] = await Promise.all([
        api.get('/student/attendance/'),
        api.get('/student/attendance/stats/'),
      ])
      setRecords(recRes.data ?? [])
      setStats(statsRes.data ?? { rate: 0, present: 0, absent: 0 })
      setError(false)
    } catch {
      // records est vidé mais stats gardait sa valeur précédente sans
      // aucune indication d'échec — l'étudiant ne sait pas que les
      // chiffres affichés peuvent être obsolètes.
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

  if (loading) return <Loading label="Chargement de votre assiduité..." />

  const total = stats.present + stats.absent

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Mon Assiduité</Text>

      {error && (
        <Card style={{ borderColor: colors.danger, borderWidth: 1, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="cloud-offline-outline" size={18} color={colors.danger} />
            <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600', flex: 1 }}>
              Certaines données n'ont pas pu être chargées. Tirez vers le bas pour réessayer.
            </Text>
          </View>
        </Card>
      )}

      <View style={styles.statsGrid}>
        <StatTile label="Taux de présence" value={`${stats.rate}%`} tone={stats.rate >= 75 ? 'success' : 'danger'} icon="pie-chart-outline" />
        <StatTile label="Présent" value={stats.present} tone="success" icon="checkmark-outline" />
        <StatTile label="Absent" value={stats.absent} tone="danger" icon="close-outline" />
        <StatTile label="Total séances" value={total} icon="layers-outline" />
      </View>

      {stats.rate < 75 && total > 0 && (
        <Card style={styles.warningCard}>
          <View style={styles.warningRow}>
            <Icon name="warning-outline" size={18} color="#92400e" />
            <Text style={styles.warningText}>Votre taux de présence est inférieur à 75%. Cela peut affecter votre validation du semestre.</Text>
          </View>
        </Card>
      )}

      {records.length === 0 ? (
        <EmptyState label="Aucun historique d'assiduité." icon="calendar-outline" />
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
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  warningText: { color: '#92400e', fontSize: 13, flex: 1, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  courseName: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
})

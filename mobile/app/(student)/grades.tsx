import { useEffect, useState, useCallback } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import api from '../../lib/api'
import { Badge, Card, EmptyState, Loading, StatTile, colors } from '../../components/ui'

interface Grade {
  id: string
  ec_code: string
  ec_name: string
  cc_grade: number | string | null
  exam_grade: number | string | null
  final_grade: number | string | null
  is_absent: boolean
}

export default function StudentGrades() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/evaluation/student/grades/')
      setGrades(data ?? [])
    } catch {
      setGrades([])
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

  if (loading) return <Loading label="Chargement de vos notes..." />

  const valid = grades.filter((g) => g.final_grade !== null && !g.is_absent)
  const average = valid.length
    ? (valid.reduce((sum, g) => sum + Number(g.final_grade), 0) / valid.length).toFixed(2)
    : '—'
  const successCount = valid.filter((g) => Number(g.final_grade) >= 10).length

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Mes Notes</Text>

      <View style={styles.statsRow}>
        <StatTile label="Moyenne" value={`${average}/20`} tone={Number(average) >= 10 ? 'success' : 'danger'} />
        <StatTile label="EC validés" value={`${successCount}/${valid.length}`} />
      </View>

      {grades.length === 0 ? (
        <EmptyState label="Aucune note disponible pour le moment." />
      ) : (
        grades.map((g) => {
          const final = g.final_grade !== null ? Number(g.final_grade) : null
          return (
            <Card key={g.id}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ecName}>{g.ec_name}</Text>
                  <Text style={styles.ecCode}>{g.ec_code}</Text>
                </View>
                {g.is_absent ? (
                  <Badge label="Absent" tone="warning" />
                ) : final !== null ? (
                  <Badge label={`${final.toFixed(2)}/20`} tone={final >= 10 ? 'success' : 'danger'} />
                ) : (
                  <Badge label="En attente" />
                )}
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailText}>CC: {g.cc_grade !== null ? Number(g.cc_grade).toFixed(2) : '—'}</Text>
                <Text style={styles.detailText}>Examen: {g.exam_grade !== null ? Number(g.exam_grade).toFixed(2) : '—'}</Text>
              </View>
            </Card>
          )
        })
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ecName: { fontSize: 15, fontWeight: '700', color: colors.text },
  ecCode: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  detailRow: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  detailText: { fontSize: 12, color: colors.textMuted },
})

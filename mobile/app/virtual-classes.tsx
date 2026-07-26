import { useCallback, useEffect, useState } from 'react'
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { Badge, Button, Card, EmptyState, Loading, colors } from '../components/ui'

interface VirtualSession {
  id: string
  title: string
  course_space_title: string
  provider_display: string
  mode_display: string
  status: string
  status_display: string
  scheduled_start: string
  scheduled_end: string
  join_url: string
  participants_count: number
}

const STATUS_TONE: Record<string, 'default' | 'success' | 'danger' | 'warning'> = {
  planifiee: 'default',
  en_cours: 'success',
  terminee: 'default',
  annulee: 'danger',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function VirtualClassesScreen() {
  const role = useAuthStore((s) => s.role)
  const [sessions, setSessions] = useState<VirtualSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/virtual-sessions/', { params: { ordering: 'scheduled_start' } })
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

  const join = async (session: VirtualSession) => {
    setJoiningId(session.id)
    try {
      // Enregistre la participation (fusionnée avec la présence si la
      // session correspond à un créneau planifié — voir join() côté API)
      // avant d'ouvrir le lien de la visioconférence.
      await api.post(`/virtual-sessions/${session.id}/join/`, { join_mode: 'online' })
    } catch {
      // Même en cas d'échec de l'enregistrement de présence, laisser
      // l'utilisateur rejoindre la session reste plus utile que de bloquer.
    } finally {
      setJoiningId(null)
      if (session.join_url) Linking.openURL(session.join_url)
    }
  }

  if (loading) return <Loading label="Chargement des classes virtuelles..." />

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Classes virtuelles</Text>

      {sessions.length === 0 ? (
        <EmptyState label="Aucune classe virtuelle programmée." />
      ) : (
        sessions.map((s) => (
          <Card key={s.id} style={{ marginBottom: 12 }}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionTitle}>{s.title}</Text>
                <Text style={styles.meta}>{s.course_space_title} · {s.provider_display}</Text>
              </View>
              <Badge label={s.status_display} tone={STATUS_TONE[s.status] ?? 'default'} />
            </View>
            <Text style={styles.meta}>{formatDate(s.scheduled_start)} — {formatDate(s.scheduled_end)}</Text>
            {role === 'enseignant' && (
              <Text style={styles.meta}>{s.participants_count} participant(s)</Text>
            )}
            {(s.status === 'planifiee' || s.status === 'en_cours') && s.join_url ? (
              <Button
                title={s.status === 'en_cours' ? 'Rejoindre maintenant' : 'Rejoindre'}
                loading={joiningId === s.id}
                onPress={() => join(s)}
              />
            ) : null}
          </Card>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  sessionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
})

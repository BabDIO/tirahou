import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import api from '../lib/api'
import { Badge, Card, EmptyState, IconName, Loading, ScreenHeader, colors } from '../components/ui'

const TYPE_ICON: Record<string, IconName> = {
  resultat: 'ribbon-outline',
  paiement: 'card-outline',
  absence: 'calendar-outline',
  alerte: 'warning-outline',
}

interface Notification {
  id: string
  type: string
  type_display: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  action_url: string
}

const TYPE_TONE: Record<string, 'default' | 'success' | 'danger' | 'warning'> = {
  resultat: 'success',
  paiement: 'warning',
  absence: 'danger',
  alerte: 'danger',
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/', { params: { ordering: '-created_at' } })
      setNotifications(data?.results ?? data ?? [])
      setError(false)
    } catch {
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

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    try {
      await api.post(`/notifications/${id}/mark_read/`)
    } catch {
      load()
    }
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      await api.post('/notifications/mark_all_read/')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      // best-effort
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) return <Loading label="Chargement des notifications..." />

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader
        title="Notifications"
        count={unreadCount}
        rightLabel={unreadCount > 0 ? 'Tout marquer comme lu' : undefined}
        onRightPress={markAllRead}
        rightBusy={markingAll}
      />

      {error ? (
        <EmptyState label="Erreur de chargement. Tirez vers le bas pour réessayer." />
      ) : notifications.length === 0 ? (
        <EmptyState label="Aucune notification pour le moment." />
      ) : (
        notifications.map((n) => (
          <Pressable key={n.id} onPress={() => !n.is_read && markRead(n.id)}>
            <Card style={!n.is_read ? styles.unreadCard : undefined}>
              <View style={styles.rowBetween}>
                <Badge label={n.type_display} tone={TYPE_TONE[n.type] ?? 'default'} icon={TYPE_ICON[n.type]} />
                {!n.is_read && <View style={styles.dot} />}
              </View>
              <Text style={styles.notifTitle}>{n.title}</Text>
              <Text style={styles.notifMessage}>{n.message}</Text>
              <Text style={styles.notifDate}>
                {new Date(n.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  unreadCard: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  notifTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
  notifMessage: { fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  notifDate: { fontSize: 11, color: colors.textMuted },
})

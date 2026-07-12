import { useEffect, useState, useCallback } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import api from '../../lib/api'
import { Badge, Button, Card, EmptyState, Loading, colors } from '../../components/ui'

interface ScheduledSession {
  id: string
  ec_name: string
  start_datetime: string
}

interface AttendanceSheet {
  id: string
  session: string
  is_open: boolean
  session_code: string
  present_count: number
  total_count: number
}

export default function TeacherAttendance() {
  const [sessions, setSessions] = useState<ScheduledSession[]>([])
  const [sheets, setSheets] = useState<AttendanceSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [sessionsRes, sheetsRes] = await Promise.all([
        api.get('/sessions/', { params: { ordering: '-start_datetime' } }),
        api.get('/attendance-sheets/'),
      ])
      const allSessions: ScheduledSession[] = sessionsRes.data?.results ?? sessionsRes.data ?? []
      setSessions(allSessions.slice(0, 10))
      setSheets(sheetsRes.data?.results ?? sheetsRes.data ?? [])
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

  const sheetForSession = (sessionId: string) => sheets.find((sh) => sh.session === sessionId)

  const createAndOpen = async (sessionId: string) => {
    setBusyId(sessionId)
    try {
      const { data: sheet } = await api.post('/attendance-sheets/', { session: sessionId })
      await api.post(`/attendance-sheets/${sheet.id}/open/`)
      await load()
    } catch {
      Alert.alert('Erreur', "Impossible de créer la feuille de présence.")
    } finally {
      setBusyId(null)
    }
  }

  const toggleSheet = async (sheet: AttendanceSheet) => {
    setBusyId(sheet.id)
    try {
      await api.post(`/attendance-sheets/${sheet.id}/${sheet.is_open ? 'close' : 'open'}/`)
      await load()
    } catch {
      Alert.alert('Erreur', "Action impossible.")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <Loading label="Chargement..." />

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Présence</Text>
      <Text style={styles.hint}>Ouvrez une feuille pour une séance, puis communiquez le code à vos étudiants.</Text>

      {sessions.length === 0 ? (
        <EmptyState label="Aucune séance récente." />
      ) : (
        sessions.map((s) => {
          const sheet = sheetForSession(s.id)
          return (
            <Card key={s.id}>
              <Text style={styles.sessionTitle}>{s.ec_name}</Text>
              <Text style={styles.meta}>
                {new Date(s.start_datetime).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
              </Text>

              {sheet ? (
                <>
                  <View style={styles.row}>
                    <Badge label={sheet.is_open ? 'Ouverte' : 'Fermée'} tone={sheet.is_open ? 'success' : 'default'} />
                    {sheet.is_open && <Text style={styles.code}>Code : {sheet.session_code}</Text>}
                  </View>
                  <Text style={styles.meta}>{sheet.present_count}/{sheet.total_count} présent(s)</Text>
                  <Button
                    title={sheet.is_open ? 'Fermer la feuille' : 'Rouvrir la feuille'}
                    variant={sheet.is_open ? 'danger' : 'secondary'}
                    loading={busyId === sheet.id}
                    onPress={() => toggleSheet(sheet)}
                  />
                </>
              ) : (
                <Button title="Créer et ouvrir la feuille" loading={busyId === s.id} onPress={() => createAndOpen(s.id)} />
              )}
            </Card>
          )
        })
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: 16 },
  sessionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 8, textTransform: 'capitalize' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  code: { fontSize: 15, fontWeight: '800', color: colors.primaryDark, letterSpacing: 1 },
})

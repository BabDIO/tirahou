import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../store/authStore'
import { Button, Card, MenuLink, SectionTitle, colors } from '../../components/ui'

export default function TeacherProfile() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const onLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Profil</Text>

      <Card>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.first_name?.[0] ?? '?'}{user?.last_name?.[0] ?? ''}</Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.roleLabel}>Enseignant</Text>
      </Card>

      <SectionTitle>Services</SectionTitle>
      <MenuLink href="/notifications" icon="🔔" label="Notifications" />
      <MenuLink href="/library" icon="📚" label="Bibliothèque" />

      <View style={{ height: 8 }} />
      <Button title="Se déconnecter" onPress={onLogout} variant="danger" />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  roleLabel: { marginTop: 8, fontSize: 12, fontWeight: '700', color: colors.primary },
})

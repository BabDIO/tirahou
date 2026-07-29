import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../store/authStore'
import { Avatar, Button, Card, MenuLink, SectionTitle, colors } from '../../components/ui'

export default function StudentProfile() {
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

      <Card style={styles.profileCard}>
        <Avatar firstName={user?.first_name} lastName={user?.last_name} />
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleChip}>
          <Text style={styles.roleLabel}>Étudiant</Text>
        </View>
      </Card>

      <SectionTitle icon="apps-outline">Services</SectionTitle>
      <MenuLink href="/notifications" icon="notifications-outline" label="Notifications" />
      <MenuLink href="/assignments" icon="document-text-outline" label="Devoirs" />
      <MenuLink href="/virtual-classes" icon="videocam-outline" label="Classes virtuelles" />
      <MenuLink href="/finance" icon="card-outline" label="Mes paiements" />
      <MenuLink href="/library" icon="library-outline" label="Bibliothèque" />

      <View style={{ height: 8 }} />
      <Button title="Se déconnecter" onPress={onLogout} variant="danger" icon="log-out-outline" />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 14 },
  profileCard: { alignItems: 'center', paddingVertical: 22 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 12 },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  roleChip: { marginTop: 10, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  roleLabel: { fontSize: 12, fontWeight: '700', color: colors.primary },
})

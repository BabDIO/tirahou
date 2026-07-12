import { Redirect, Tabs } from 'expo-router'
import { Text } from 'react-native'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../components/ui'

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 18 }}>{emoji}</Text>
}

export default function StudentLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  if (!isAuthenticated) return <Redirect href="/login" />
  if (role !== 'etudiant') return <Redirect href="/" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: () => <TabIcon emoji="🏠" /> }} />
      <Tabs.Screen name="grades" options={{ title: 'Notes', tabBarIcon: () => <TabIcon emoji="📊" /> }} />
      <Tabs.Screen name="schedule" options={{ title: 'Emploi du temps', tabBarIcon: () => <TabIcon emoji="🗓️" /> }} />
      <Tabs.Screen name="attendance" options={{ title: 'Assiduité', tabBarIcon: () => <TabIcon emoji="✅" /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: () => <TabIcon emoji="👤" /> }} />
    </Tabs>
  )
}

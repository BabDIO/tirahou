import { Redirect, Tabs } from 'expo-router'
import { Text } from 'react-native'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../components/ui'

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 18 }}>{emoji}</Text>
}

export default function TeacherLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  if (!isAuthenticated) return <Redirect href="/login" />
  if (role !== 'enseignant') return <Redirect href="/" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: () => <TabIcon emoji="🏠" /> }} />
      <Tabs.Screen name="grades" options={{ title: 'Notes', tabBarIcon: () => <TabIcon emoji="📝" /> }} />
      <Tabs.Screen name="courses" options={{ title: 'Mes cours', tabBarIcon: () => <TabIcon emoji="📚" /> }} />
      <Tabs.Screen name="attendance" options={{ title: 'Présence', tabBarIcon: () => <TabIcon emoji="✅" /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: () => <TabIcon emoji="👤" /> }} />
    </Tabs>
  )
}

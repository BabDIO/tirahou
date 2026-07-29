import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { ColorValue } from 'react-native'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../components/ui'

type IconName = keyof typeof Ionicons.glyphMap

function tabIcon(active: IconName, inactive: IconName) {
  return ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color as string} />
  )
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { borderTopColor: colors.border, height: 60, paddingBottom: 8, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen name="grades" options={{ title: 'Notes', tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline') }} />
      <Tabs.Screen name="schedule" options={{ title: 'Emploi du temps', tabBarIcon: tabIcon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="attendance" options={{ title: 'Assiduité', tabBarIcon: tabIcon('checkmark-circle', 'checkmark-circle-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('person', 'person-outline') }} />
    </Tabs>
  )
}

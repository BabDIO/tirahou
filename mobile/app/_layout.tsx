import { useEffect } from 'react'
import { Stack, useRouter } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '../store/authStore'
import { setOnAuthExpired } from '../lib/api'
import { Loading } from '../components/ui'

export default function RootLayout() {
  const router = useRouter()
  const hydrate = useAuthStore((s) => s.hydrate)
  const isHydrating = useAuthStore((s) => s.isHydrating)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    hydrate()
    setOnAuthExpired(() => {
      logout()
      router.replace('/login')
    })
  }, [hydrate, logout, router])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {isHydrating ? (
          <Loading />
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(student)" />
            <Stack.Screen name="(teacher)" />
            <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
            <Stack.Screen name="library" options={{ presentation: 'card' }} />
            <Stack.Screen name="finance" options={{ presentation: 'card' }} />
          </Stack>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

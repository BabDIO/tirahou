import { Redirect } from 'expo-router'
import { useAuthStore } from '../store/authStore'

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  if (!isAuthenticated) return <Redirect href="/login" />
  if (role === 'enseignant') return <Redirect href="/(teacher)" />
  if (role === 'etudiant') return <Redirect href="/(student)" />
  // Rôle non pris en charge par l'app mobile (admin, scolarité, etc.)
  return <Redirect href="/login?unsupported=1" />
}

import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native'
import { useRouter } from 'expo-router'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { Button, colors } from '../components/ui'

const DEMO_ACCOUNTS = [
  { role: 'Étudiant', email: 'etudiant@tirahou.edu', password: 'Etudiant123!' },
  { role: 'Enseignant', email: 'enseignant@tirahou.edu', password: 'Enseignant123!' },
]

export default function LoginScreen() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login/', { email: email.trim(), password })
      const roleNames: string[] = data.user?.roles?.map((r: { name: string }) => r.name) ?? []
      if (!roleNames.includes('etudiant') && !roleNames.includes('enseignant')) {
        setError("Cette application mobile est réservée aux étudiants et enseignants. Utilisez la version web pour ce compte.")
        setLoading(false)
        return
      }
      await setAuth(data.user, data.access, data.refresh)
      router.replace('/')
    } catch (err: unknown) {
      const e = err as { isNetworkError?: boolean; response?: { status?: number; data?: Record<string, unknown> } }
      if (e?.isNetworkError || !e?.response) {
        setError('Serveur inaccessible. Vérifiez votre connexion.')
      } else if (e.response?.data && (e.response.data as Record<string, unknown>).mfa_required) {
        setError("La double authentification n'est pas encore prise en charge dans l'app mobile. Connectez-vous depuis le site web.")
      } else if (e.response?.status === 401 || e.response?.status === 400) {
        setError('Email ou mot de passe incorrect.')
      } else if (e.response?.status === 403) {
        setError('Compte désactivé. Contactez l’administration.')
      } else {
        setError('Erreur inattendue. Réessayez.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBlock}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>T</Text>
          </View>
          <Text style={styles.title}>TIRAHOU</Text>
          <Text style={styles.subtitle}>Espace étudiants & enseignants</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="prenom.nom@tirahou.edu"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
        />

        <Button title="Se connecter" onPress={onSubmit} loading={loading} />

        <View style={styles.demoBlock}>
          <Text style={styles.demoTitle}>Comptes de démonstration</Text>
          {DEMO_ACCOUNTS.map((acc) => (
            <Pressable key={acc.email} style={styles.demoItem} onPress={() => fillDemo(acc.email, acc.password)}>
              <Text style={styles.demoRole}>{acc.role}</Text>
              <Text style={styles.demoEmail}>{acc.email}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: '#f8fafc' },
  logoBlock: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
  },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, padding: 14, marginBottom: 8 },
  errorText: { color: '#b91c1c', fontSize: 13 },
  demoBlock: { marginTop: 28, gap: 8 },
  demoTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  demoItem: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#dbeafe' },
  demoRole: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  demoEmail: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
})

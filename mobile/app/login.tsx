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
import { LinearGradient } from 'expo-linear-gradient'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { Button, Icon, IconBadge, colors } from '../components/ui'

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
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null)

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
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBlock}>
          <LinearGradient colors={[colors.primary, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
            <Text style={styles.logoText}>T</Text>
          </LinearGradient>
          <Text style={styles.title}>TIRAHOU</Text>
          <Text style={styles.subtitle}>Espace étudiants & enseignants</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="alert-circle" size={18} color="#b91c1c" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Email</Text>
        <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused]}>
          <Icon name="mail-outline" size={18} color={focusedField === 'email' ? colors.primary : colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="prenom.nom@tirahou.edu"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        <Text style={styles.label}>Mot de passe</Text>
        <View style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocused]}>
          <Icon name="lock-closed-outline" size={18} color={focusedField === 'password' ? colors.primary : colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        <View style={{ marginTop: 8 }}>
          <Button title="Se connecter" onPress={onSubmit} loading={loading} icon="log-in-outline" />
        </View>

        <View style={styles.demoBlock}>
          <Text style={styles.demoTitle}>Comptes de démonstration</Text>
          {DEMO_ACCOUNTS.map((acc) => (
            <Pressable key={acc.email} style={({ pressed }) => [styles.demoItem, pressed && { opacity: 0.7 }]} onPress={() => fillDemo(acc.email, acc.password)}>
              <IconBadge name={acc.role === 'Étudiant' ? 'school-outline' : 'easel-outline'} color={colors.primary} boxSize={36} size={17} />
              <View style={{ flex: 1 }}>
                <Text style={styles.demoRole}>{acc.role}</Text>
                <Text style={styles.demoEmail}>{acc.email}</Text>
              </View>
              <Icon name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.bg },
  blobTop: {
    position: 'absolute', top: -120, right: -100, width: 260, height: 260, borderRadius: 130,
    backgroundColor: colors.primary, opacity: 0.08,
  },
  blobBottom: {
    position: 'absolute', bottom: -140, left: -110, width: 280, height: 280, borderRadius: 140,
    backgroundColor: colors.violet, opacity: 0.07,
  },
  logoBlock: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  logoText: { color: '#fff', fontSize: 30, fontWeight: '900' },
  title: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6, marginTop: 14 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  inputWrapFocused: { borderColor: colors.primary },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, padding: 14, marginBottom: 8,
  },
  errorText: { color: '#b91c1c', fontSize: 13, flex: 1, lineHeight: 18 },
  demoBlock: { marginTop: 28, gap: 8 },
  demoTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  demoItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.primaryLight, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#dbeafe',
  },
  demoRole: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  demoEmail: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
})

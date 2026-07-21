import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { useRouter } from 'expo-router'

export const colors = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  violet: '#7c3aed',
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  success: '#059669',
  danger: '#dc2626',
  warning: '#d97706',
}

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label && <Text style={styles.loadingLabel}>{label}</Text>}
    </View>
  )
}

export function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  )
}

export function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
  disabled,
}: {
  title: string
  onPress: () => void
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
        pressed && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonTextSecondary]}>{title}</Text>
      )}
    </Pressable>
  )
}

export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'danger' | 'warning' }) {
  const toneColor = { default: colors.primary, success: colors.success, danger: colors.danger, warning: colors.warning }[tone]
  return (
    <View style={[styles.badge, { backgroundColor: toneColor + '1a' }]}>
      <Text style={[styles.badgeText, { color: toneColor }]}>{label}</Text>
    </View>
  )
}

export function MenuLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const router = useRouter()
  return (
    <Pressable onPress={() => router.push(href as never)} style={({ pressed }) => [styles.menuLink, pressed && { opacity: 0.7 }]}>
      <Text style={styles.menuLinkIcon}>{icon}</Text>
      <Text style={styles.menuLinkLabel}>{label}</Text>
      <Text style={styles.menuLinkChevron}>›</Text>
    </Pressable>
  )
}

export function StatTile({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'success' | 'danger' | 'warning' }) {
  const toneColor = { default: colors.primary, success: colors.success, danger: colors.danger, warning: colors.warning }[tone]
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, { color: toneColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingLabel: { color: colors.textMuted, fontSize: 14 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  buttonTextSecondary: { color: colors.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  statTile: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 4, minWidth: '45%' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  menuLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 10,
  },
  menuLinkIcon: { fontSize: 18 },
  menuLinkLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  menuLinkChevron: { fontSize: 18, color: colors.textMuted },
})

import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

export type IconName = keyof typeof Ionicons.glyphMap

export const colors = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#eff6ff',
  violet: '#7c3aed',
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  success: '#059669',
  successLight: '#ecfdf5',
  danger: '#dc2626',
  dangerLight: '#fef2f2',
  warning: '#d97706',
  warningLight: '#fffbeb',
  shadow: '#0f172a',
}

const cardShadow = Platform.select({
  ios: { shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 2 },
  default: {},
})

const buttonShadow = Platform.select({
  ios: { shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  android: { elevation: 3 },
  default: {},
})

export function Icon({ name, size = 20, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />
}

export function IconBadge({
  name,
  size = 22,
  color = colors.primary,
  background,
  boxSize = 40,
}: {
  name: IconName
  size?: number
  color?: string
  background?: string
  boxSize?: number
}) {
  return (
    <View
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: boxSize * 0.32,
        backgroundColor: background ?? color + '1a',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={size} color={color} />
    </View>
  )
}

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: IconName }) {
  return (
    <View style={styles.sectionTitleRow}>
      {icon && <Icon name={icon} size={14} color={colors.textMuted} />}
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  )
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label && <Text style={styles.loadingLabel}>{label}</Text>}
    </View>
  )
}

export function EmptyState({ label, icon = 'file-tray-outline' }: { label: string; icon?: IconName }) {
  return (
    <View style={styles.empty}>
      <IconBadge name={icon} size={26} color={colors.textMuted} background={colors.border} boxSize={56} />
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
  icon,
}: {
  title: string
  onPress: () => void
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  icon?: IconName
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && buttonShadow,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
        pressed && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#fff'} />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <Icon name={icon} size={17} color={variant === 'secondary' ? colors.primary : '#fff'} />}
          <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonTextSecondary]}>{title}</Text>
        </View>
      )}
    </Pressable>
  )
}

const TONE_ICON: Record<'default' | 'success' | 'danger' | 'warning', IconName> = {
  default: 'ellipse',
  success: 'checkmark-circle',
  danger: 'close-circle',
  warning: 'alert-circle',
}

export function Badge({
  label,
  tone = 'default',
  icon,
}: {
  label: string
  tone?: 'default' | 'success' | 'danger' | 'warning'
  icon?: IconName | false
}) {
  const toneColor = { default: colors.primary, success: colors.success, danger: colors.danger, warning: colors.warning }[tone]
  const shownIcon = icon === false ? null : icon ?? TONE_ICON[tone]
  return (
    <View style={[styles.badge, { backgroundColor: toneColor + '1a' }]}>
      {shownIcon && <Icon name={shownIcon} size={12} color={toneColor} />}
      <Text style={[styles.badgeText, { color: toneColor }]}>{label}</Text>
    </View>
  )
}

export function MenuLink({ href, icon, label, tone = 'default' }: { href: string; icon: IconName; label: string; tone?: 'default' | 'danger' }) {
  const router = useRouter()
  const toneColor = tone === 'danger' ? colors.danger : colors.primary
  return (
    <Pressable onPress={() => router.push(href as never)} style={({ pressed }) => [styles.menuLink, pressed && { opacity: 0.7 }]}>
      <IconBadge name={icon} color={toneColor} boxSize={38} size={19} />
      <Text style={styles.menuLinkLabel}>{label}</Text>
      <Icon name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  )
}

export function StatTile({
  label,
  value,
  tone = 'default',
  icon,
}: {
  label: string
  value: string | number
  tone?: 'default' | 'success' | 'danger' | 'warning'
  icon?: IconName
}) {
  const toneColor = { default: colors.primary, success: colors.success, danger: colors.danger, warning: colors.warning }[tone]
  return (
    <View style={styles.statTile}>
      {icon && <IconBadge name={icon} color={toneColor} boxSize={34} size={17} />}
      <Text style={[styles.statValue, { color: toneColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export function Avatar({ firstName, lastName, size = 56 }: { firstName?: string; lastName?: string; size?: number }) {
  const initials = `${firstName?.[0] ?? '?'}${lastName?.[0] ?? ''}`
  return (
    <LinearGradient
      colors={[colors.primary, colors.violet]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.32 }}>{initials}</Text>
    </LinearGradient>
  )
}

export function ScreenHeader({
  title,
  count,
  rightLabel,
  onRightPress,
  rightBusy,
}: {
  title: string
  count?: number
  rightLabel?: string
  onRightPress?: () => void
  rightBusy?: boolean
}) {
  const router = useRouter()
  return (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Icon name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.backLabel}>Retour</Text>
        </Pressable>
        {rightLabel && (
          <Pressable onPress={onRightPress} disabled={rightBusy} hitSlop={8}>
            <Text style={styles.headerRight}>{rightBusy ? '...' : rightLabel}</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.headerTitle}>{title}{typeof count === 'number' && count > 0 ? ` (${count})` : ''}</Text>
    </View>
  )
}

export function HeroBanner({ eyebrow, title, subtitle, icon }: { eyebrow: string; title: string; subtitle?: string; icon?: IconName }) {
  return (
    <LinearGradient
      colors={[colors.primary, colors.violet]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.heroEyebrow}>{eyebrow}</Text>
        <Text style={styles.heroTitle}>{title}</Text>
        {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
      </View>
      {icon && (
        <View style={styles.heroIconWrap}>
          <Icon name={icon} size={26} color="#fff" />
        </View>
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    ...cardShadow,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.bg },
  loadingLabel: { color: colors.textMuted, fontSize: 14 },
  empty: { paddingVertical: 36, alignItems: 'center', gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonSecondary: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: '#bfdbfe' },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  buttonTextSecondary: { color: colors.primary },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  statTile: {
    flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 6, minWidth: '45%',
    ...cardShadow,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  menuLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: 10,
    ...cardShadow,
  },
  menuLinkLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  header: { marginBottom: 8 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  backLabel: { color: colors.primary, fontWeight: '600', fontSize: 14, marginLeft: 2 },
  headerRight: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 14 },
  hero: {
    borderRadius: 22, padding: 20, marginBottom: 20,
    flexDirection: 'row', alignItems: 'center',
    ...Platform.select({ ios: { shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }, android: { elevation: 4 }, default: {} }),
  },
  heroEyebrow: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  heroIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
})

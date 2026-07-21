import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import api from '../lib/api'
import { Badge, Button, Card, EmptyState, Loading, StatTile, colors } from '../components/ui'

interface Invoice {
  id: string
  invoice_number: string
  status: string
  status_display: string
  total_amount: string
  paid_amount: string
  discount_amount: string
  remaining_amount: string
  due_date: string | null
}

const STATUS_TONE: Record<string, 'default' | 'success' | 'danger' | 'warning'> = {
  payee: 'success',
  partiellement_payee: 'warning',
  emise: 'default',
  annulee: 'danger',
}

function formatFCFA(value: string | number) {
  const n = Math.round(Number(value) || 0)
  return `${n.toLocaleString('fr-FR')} FCFA`
}

export default function FinanceScreen() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [payTarget, setPayTarget] = useState<Invoice | null>(null)
  const [phone, setPhone] = useState('')
  const [operator, setOperator] = useState<'OM' | 'MOOV'>('OM')
  const [paying, setPaying] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/invoices/')
      setInvoices(data?.results ?? data ?? [])
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const totals = invoices.reduce(
    (acc, inv) => ({
      total: acc.total + Number(inv.total_amount || 0),
      paid: acc.paid + Number(inv.paid_amount || 0),
      remaining: acc.remaining + Number(inv.remaining_amount || 0),
    }),
    { total: 0, paid: 0, remaining: 0 }
  )

  const openPay = (invoice: Invoice) => {
    setPayTarget(invoice)
    setPhone('')
    setOperator('OM')
  }

  const submitPayment = async () => {
    if (!payTarget) return
    if (!phone.trim()) {
      Alert.alert('Numéro requis', 'Saisissez le numéro Mobile Money à débiter.')
      return
    }
    setPaying(true)
    try {
      const { data } = await api.post(`/invoices/${payTarget.id}/pay_online/`, { phone, operator })
      setPayTarget(null)
      if (data?.payment_url) {
        await Linking.openURL(data.payment_url)
      } else {
        Alert.alert('Paiement initié', 'Suivez les instructions reçues par SMS.')
      }
      load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      Alert.alert(
        'Paiement indisponible',
        e?.response?.data?.error ?? "Le paiement en ligne n'est pas configuré. Merci de payer directement à la caisse."
      )
    } finally {
      setPaying(false)
    }
  }

  if (loading) return <Loading label="Chargement de vos factures..." />

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Retour</Text>
      </Pressable>
      <Text style={styles.title}>Mes paiements</Text>

      {error ? (
        <EmptyState label="Erreur de chargement. Tirez vers le bas pour réessayer." />
      ) : (
        <>
          <View style={styles.statsGrid}>
            <StatTile label="Total facturé" value={formatFCFA(totals.total)} />
            <StatTile label="Payé" value={formatFCFA(totals.paid)} tone="success" />
            <StatTile label="Reste à payer" value={formatFCFA(totals.remaining)} tone={totals.remaining > 0 ? 'warning' : 'success'} />
          </View>

          {invoices.length === 0 ? (
            <EmptyState label="Aucune facture pour le moment." />
          ) : (
            invoices.map((inv) => (
              <Card key={inv.id}>
                <View style={styles.rowBetween}>
                  <Text style={styles.invNumber}>{inv.invoice_number}</Text>
                  <Badge label={inv.status_display} tone={STATUS_TONE[inv.status] ?? 'default'} />
                </View>
                <Text style={styles.invAmount}>{formatFCFA(inv.total_amount)}</Text>
                {inv.due_date && (
                  <Text style={styles.invDue}>Échéance : {new Date(inv.due_date).toLocaleDateString('fr-FR')}</Text>
                )}
                {Number(inv.remaining_amount) > 0 && (
                  <>
                    <Text style={styles.invRemaining}>Reste : {formatFCFA(inv.remaining_amount)}</Text>
                    <Button title="Payer en ligne (Mobile Money)" onPress={() => openPay(inv)} />
                  </>
                )}
              </Card>
            ))
          )}
        </>
      )}

      <Modal visible={!!payTarget} transparent animationType="slide" onRequestClose={() => setPayTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Payer {payTarget?.invoice_number}</Text>
            <Text style={styles.modalAmount}>{payTarget && formatFCFA(payTarget.remaining_amount)}</Text>

            <Text style={styles.inputLabel}>Opérateur</Text>
            <View style={styles.operatorRow}>
              {(['OM', 'MOOV'] as const).map((op) => (
                <Pressable
                  key={op}
                  onPress={() => setOperator(op)}
                  style={[styles.opChip, operator === op && styles.opChipActive]}
                >
                  <Text style={[styles.opChipText, operator === op && styles.opChipTextActive]}>
                    {op === 'OM' ? 'Orange Money' : 'Moov Money'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Numéro Mobile Money</Text>
            <TextInput
              style={styles.input}
              placeholder="+223 7X XX XX XX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <Button title="Annuler" variant="secondary" onPress={() => setPayTarget(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Confirmer" loading={paying} onPress={submitPayment} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  back: { color: colors.primary, fontWeight: '600', fontSize: 14, marginBottom: 6 },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  invNumber: { fontSize: 14, fontWeight: '700', color: colors.text },
  invAmount: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  invDue: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  invRemaining: { fontSize: 13, fontWeight: '700', color: colors.warning, marginTop: 4, marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 },
  modalAmount: { fontSize: 24, fontWeight: '900', color: colors.primary, marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  operatorRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  opChip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  opChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  opChipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  opChipTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, marginBottom: 18 },
  modalActions: { flexDirection: 'row', gap: 10 },
})

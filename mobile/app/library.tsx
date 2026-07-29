import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import api from '../lib/api'
import { Badge, Button, Card, EmptyState, Loading, ScreenHeader, colors } from '../components/ui'

interface LibraryDocument {
  id: string
  title: string
  author: string
  type: string
  domain: string
  year: number
  access_level: string
}

interface Borrowing {
  id: string
  document: string
  document_title?: string
  due_date: string
  status: string
  is_overdue?: boolean
}

type Tab = 'catalogue' | 'emprunts'

export default function LibraryScreen() {
  const [tab, setTab] = useState<Tab>('catalogue')
  const [search, setSearch] = useState('')
  const [documents, setDocuments] = useState<LibraryDocument[]>([])
  const [borrowings, setBorrowings] = useState<Borrowing[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [borrowingId, setBorrowingId] = useState<string | null>(null)

  const load = useCallback(async (searchTerm: string) => {
    try {
      const [docsRes, borrowRes] = await Promise.all([
        api.get('/library/', { params: searchTerm ? { search: searchTerm } : {} }),
        api.get('/library/my_borrowings/'),
      ])
      setDocuments(docsRes.data?.results ?? docsRes.data ?? [])
      setBorrowings(borrowRes.data?.results ?? borrowRes.data ?? [])
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load('')
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load(search)
  }

  const runSearch = () => {
    setLoading(true)
    load(search)
  }

  const borrow = async (doc: LibraryDocument) => {
    setBorrowingId(doc.id)
    try {
      await api.post(`/library/${doc.id}/borrow/`)
      Alert.alert('Emprunté', `"${doc.title}" a été ajouté à vos emprunts.`)
      load(search)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; detail?: string } } }
      Alert.alert('Erreur', e?.response?.data?.error ?? e?.response?.data?.detail ?? "Impossible d'emprunter ce document.")
    } finally {
      setBorrowingId(null)
    }
  }

  if (loading) return <Loading label="Chargement de la bibliothèque..." />

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Bibliothèque" />

      <View style={styles.tabRow}>
        <Pressable onPress={() => setTab('catalogue')} style={[styles.tabBtn, tab === 'catalogue' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'catalogue' && styles.tabTextActive]}>Catalogue</Text>
        </Pressable>
        <Pressable onPress={() => setTab('emprunts')} style={[styles.tabBtn, tab === 'emprunts' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'emprunts' && styles.tabTextActive]}>Mes emprunts ({borrowings.length})</Text>
        </Pressable>
      </View>

      {error && <EmptyState label="Erreur de chargement. Tirez vers le bas pour réessayer." icon="alert-circle-outline" />}

      {!error && tab === 'catalogue' && (
        <>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un titre, un auteur..."
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={runSearch}
              returnKeyType="search"
            />
            <Button title="OK" onPress={runSearch} />
          </View>
          {documents.length === 0 ? (
            <EmptyState label="Aucun document trouvé." icon="search-outline" />
          ) : (
            documents.map((doc) => (
              <Card key={doc.id}>
                <Text style={styles.docTitle}>{doc.title}</Text>
                <Text style={styles.docMeta}>{doc.author} · {doc.year}</Text>
                <View style={styles.badgeRow}>
                  <Badge label={doc.domain} icon="pricetag-outline" />
                  <Badge label={doc.type} tone="warning" icon="document-outline" />
                </View>
                <Button
                  title="Emprunter"
                  variant="secondary"
                  icon="add-circle-outline"
                  loading={borrowingId === doc.id}
                  onPress={() => borrow(doc)}
                />
              </Card>
            ))
          )}
        </>
      )}

      {!error && tab === 'emprunts' && (
        borrowings.length === 0 ? (
          <EmptyState label="Aucun emprunt en cours." icon="book-outline" />
        ) : (
          borrowings.map((b) => (
            <Card key={b.id}>
              <Text style={styles.docTitle}>{b.document_title ?? 'Document'}</Text>
              <Text style={styles.docMeta}>À rendre le {new Date(b.due_date).toLocaleDateString('fr-FR')}</Text>
              <Badge label={b.is_overdue ? 'En retard' : 'En cours'} tone={b.is_overdue ? 'danger' : 'success'} />
            </Card>
          ))
        )
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.text },
  tabTextActive: { color: '#fff' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', fontSize: 14 },
  docTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
  docMeta: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
})

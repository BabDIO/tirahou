import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

// expo-secure-store n'a pas d'implémentation web -- on utilise localStorage
// comme repli sur cette plateforme (uniquement utile pour la prévisualisation
// `expo start --web`, l'app native utilise toujours le Keychain/Keystore).
const isWeb = Platform.OS === 'web'

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb) return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
  return SecureStore.getItemAsync(key)
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
    return
  }
  return SecureStore.setItemAsync(key, value)
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
    return
  }
  return SecureStore.deleteItemAsync(key)
}

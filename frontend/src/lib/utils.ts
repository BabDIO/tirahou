import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import api from './axios'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Les documents sensibles (pièces d'identité, diplômes, justificatifs
// d'absence...) sont désormais servis par une vue authentifiée côté
// backend (voir apps/core/views.py protected_media_serve) — un simple
// <a href>/window.open ne fonctionne plus car le navigateur n'envoie pas
// le token JWT (stocké en localStorage, injecté seulement par l'intercepteur
// axios). On récupère donc le fichier via `api` (qui porte le token), puis
// on ouvre l'URL blob obtenue.
export async function openProtectedFile(url: string) {
  const res = await api.get(url, { responseType: 'blob' })
  const blobUrl = URL.createObjectURL(res.data)
  window.open(blobUrl, '_blank')
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}

export function formatDate(date: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('fr-FR', options ?? { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount)
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat('fr-FR').format(num)
}

export function formatGrade(grade: number | null) {
  if (grade === null || grade === undefined) return '—'
  return `${Number(grade).toFixed(2)}/20`
}

export function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'badge-green', actif: 'badge-green', valide: 'badge-green',
    validee: 'badge-green', admis: 'badge-green', inscrit: 'badge-green',
    publie: 'badge-green', payee: 'badge-green', present: 'badge-green',
    en_attente: 'badge-yellow', en_cours: 'badge-yellow', soumise: 'badge-yellow',
    en_instruction: 'badge-yellow', partiellement_payee: 'badge-yellow',
    refuse: 'badge-red', rejete: 'badge-red', exclu: 'badge-red',
    annule: 'badge-red', absent: 'badge-red',
    brouillon: 'badge-gray', archive: 'badge-gray', suspendu: 'badge-gray',
  }
  return map[status] ?? 'badge-gray'
}

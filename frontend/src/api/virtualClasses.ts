import api from '../lib/axios'

export type Session = {
  id: string
  title: string
  course_space: number | null
  scheduled_start: string
  scheduled_end: string
  status: string
  join_url?: string
}

export async function getSessions() {
  const res = await api.get<Session[]>('/virtual-sessions/')
  return res.data
}

export async function getSession(id: string) {
  const res = await api.get<Session>(`/virtual-sessions/${id}/`)
  return res.data
}

export async function joinSession(id: string) {
  const res = await api.post(`/virtual-sessions/${id}/join/`)
  return res.data
}

export type Participant = {
  id: number
  user: { id: number; email?: string; first_name?: string; last_name?: string }
  present: boolean
}

export async function getParticipants(sessionId: string) {
  const res = await api.get<Participant[]>(`/virtual-sessions/${sessionId}/participants/`)
  return res.data
}

export async function setParticipantPresence(sessionId: string, userId: number, present: boolean) {
  const res = await api.post(`/virtual-sessions/${sessionId}/participants/presence/`, {
    user_id: userId,
    present,
  })
  return res.data
}

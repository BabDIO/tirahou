import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, Trash2, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/').then(r => r.data),
    refetchInterval: 30000
  })

  const markAsRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/`, { is_read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] })
  })

  const deleteNotif = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Notification supprimée')
    }
  })

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/mark-all-read/'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] })
  })

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Tout marquer lu
                  </button>
                )}
                <button onClick={() => setOpen(false)}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {!notifications || notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  Aucune notification
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif: any) => (
                    <div
                      key={notif.id}
                      className={cn(
                        'px-4 py-3 hover:bg-gray-50 transition',
                        !notif.is_read && 'bg-blue-50/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{notif.created_at_display}</p>
                        </div>
                        <div className="flex gap-1">
                          {!notif.is_read && (
                            <button
                              onClick={() => markAsRead.mutate(notif.id)}
                              className="p-1 rounded hover:bg-gray-200"
                              title="Marquer comme lu"
                            >
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotif.mutate(notif.id)}
                            className="p-1 rounded hover:bg-gray-200"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

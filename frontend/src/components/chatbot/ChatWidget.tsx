import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, Loader2, Plus, Send, Sparkles, X } from 'lucide-react'
import { chatbotApi } from '../../api'
import { cn } from '../../lib/utils'
import type { ChatConversation, ChatMessage } from '../../types'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: conversations } = useQuery({
    queryKey: ['chatbot-conversations'],
    queryFn: () => chatbotApi.getConversations().then((r) => r.data.results),
    enabled: open,
  })

  const conversation = conversations?.find((c) => c.id === conversationId)
  const messages = conversation?.messages ?? []

  useEffect(() => {
    if (open && !conversationId && conversations && conversations.length > 0) {
      setConversationId(conversations[0].id)
    }
  }, [open, conversations, conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const createConversation = useMutation({
    mutationFn: () => chatbotApi.createConversation().then((r) => r.data),
    onSuccess: (newConv) => {
      queryClient.setQueryData<ChatConversation[]>(['chatbot-conversations'], (old) => [
        newConv,
        ...(old ?? []),
      ])
      setConversationId(newConv.id)
      setError(null)
    },
  })

  const sendMessage = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      chatbotApi.sendMessage(id, content).then((r) => r.data),
    onMutate: () => setError(null),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<ChatConversation[]>(['chatbot-conversations'], (old) =>
        (old ?? []).map((c) =>
          c.id === variables.id
            ? { ...c, messages: [...c.messages, data.user_message, data.assistant_message] }
            : c
        )
      )
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Erreur réseau — l'assistant est momentanément injoignable."
      setError(message)
    },
  })

  const handleOpen = async () => {
    setOpen(true)
    if (!conversationId && !conversations?.length) {
      const newConv = await createConversation.mutateAsync()
      setConversationId(newConv.id)
    }
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text || sendMessage.isPending) return
    let id = conversationId
    if (!id) {
      createConversation.mutate(undefined, {
        onSuccess: (newConv) => {
          id = newConv.id
          sendMessage.mutate({ id: newConv.id, content: text })
        },
      })
      setInput('')
      return
    }
    setInput('')
    // Affichage optimiste immédiat du message utilisateur pendant l'attente de la réponse
    queryClient.setQueryData<ChatConversation[]>(['chatbot-conversations'], (old) =>
      (old ?? []).map((c) =>
        c.id === id
          ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  id: `optimistic-${Date.now()}`,
                  role: 'user',
                  content: text,
                  tools_used: [],
                  created_at: new Date().toISOString(),
                } satisfies ChatMessage,
              ],
            }
          : c
      )
    )
    sendMessage.mutate({ id, content: text })
  }

  const handleNewConversation = () => {
    createConversation.mutate()
  }

  return (
    <>
      {!open && (
        <button
          onClick={handleOpen}
          aria-label="Ouvrir l'assistant IA"
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 shadow-xl shadow-primary-900/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-40 w-[380px] max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[calc(100vh-6rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-br from-primary-600 to-violet-700 text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold text-sm">Assistant IA TIRAHOU</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewConversation}
                title="Nouvelle conversation"
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                title="Fermer"
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !createConversation.isPending && (
              <div className="text-center text-sm text-gray-400 dark:text-slate-500 mt-8 px-4">
                <Bot className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                Posez une question sur TIRAHOU — vos notes, votre emploi du temps, votre assiduité, ou
                le fonctionnement de la plateforme.
              </div>
            )}
            {createConversation.isPending && messages.length === 0 && (
              <div className="flex justify-center pt-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words',
                    m.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-bl-sm'
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce" />
                </div>
              </div>
            )}
            {error && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Écrivez votre message..."
                disabled={sendMessage.isPending}
                className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary-400 text-gray-900 dark:text-slate-100 disabled:opacity-60"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sendMessage.isPending}
                aria-label="Envoyer"
                className="w-9 h-9 flex-shrink-0 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-primary-600 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { listMessages, sendMessage, subscribeToMessages } from '@/lib/db'
import type { Message } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { messageSchema } from '@/lib/validation'
import { Button, Spinner, Textarea, cn } from '@/components/ui'

// Realtime, booking-scoped chat embedded in the booking detail page. Loads
// history, then streams inserts via the Supabase channel returned by
// subscribeToMessages (which hands back an unsubscribe fn for cleanup).
// Owned by sub-agent D. Keep the exported name + `{ bookingId: string }` prop.
export function BookingChat({ bookingId }: { bookingId: string }) {
  const { profile } = useAuth()
  const myId = profile?.id ?? null
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Append while de-duping by id (our own insert + the realtime echo can race).
  const upsert = (incoming: Message) =>
    setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]))

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    listMessages(bookingId)
      .then((rows) => {
        if (active) setMessages(rows)
      })
      .catch(() => {
        if (active) setError('Could not load messages.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const unsubscribe = subscribeToMessages(bookingId, (m) => {
      if (active) upsert(m)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [bookingId])

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const canSend = text.trim().length > 0 && !sending

  const onSend = async () => {
    const parsed = messageSchema.safeParse({ text })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid message')
      return
    }
    setSending(true)
    setError(null)
    try {
      const saved = await sendMessage(bookingId, parsed.data.text)
      upsert(saved)
      setText('')
    } catch {
      setError('Could not send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  // Enter sends; Shift+Enter inserts a newline.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) void onSend()
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div
        ref={scrollRef}
        className="flex max-h-96 min-h-[8rem] flex-col gap-2 overflow-y-auto p-3"
      >
        {loading ? (
          <div className="grid flex-1 place-items-center py-8">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((m) => {
            const mine = myId != null && m.sender_id === myId
            return (
              <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm',
                    mine ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800',
                  )}
                >
                  {m.text}
                </div>
                <span className="mt-0.5 px-1 text-[11px] text-gray-400">
                  {mine ? 'You' : 'Them'} · {formatTime(m.sent_at)}
                </span>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-gray-100 p-2">
        {error && <p className="px-1 pb-1 text-xs text-red-600">{error}</p>}
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message…"
            aria-label="Message"
            className="max-h-32 resize-none"
          />
          <Button onClick={onSend} disabled={!canSend} loading={sending}>
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

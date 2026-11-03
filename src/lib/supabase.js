import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
export const rwf = (n) => new Intl.NumberFormat('en-RW').format(n || 0) + ' RWF'

// Call a database function; throws on technical errors, returns the {ok, reason...} result
export async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data
}

export async function ensureGuest() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session.user
  const { data: d, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return d.user
}

// Realtime: run onChange now and after every change to the given tables (RLS limits what arrives)
export function useLive(tables, onChange, onEvent) {
  const cb = useRef(onChange), ev = useRef(onEvent)
  cb.current = onChange; ev.current = onEvent
  useEffect(() => {
    cb.current()
    const ch = supabase.channel('live-' + Math.random().toString(36).slice(2))
    tables.forEach((t) =>
      ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, (p) => { ev.current?.(t, p); cb.current() }))
    ch.subscribe()
    const poll = setInterval(() => cb.current(), 8000) // safety net if the websocket drops
    return () => { clearInterval(poll); supabase.removeChannel(ch) }
  }, []) // eslint-disable-line
}

export function beep() {
  try {
    const c = new AudioContext(), o = c.createOscillator()
    o.connect(c.destination); o.frequency.value = 880; o.start(); o.stop(c.currentTime + 0.25)
  } catch {}
}

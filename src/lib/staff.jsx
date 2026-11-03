import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Signed-in, non-anonymous user who has a row in `staff`
export function useStaff() {
  const [staff, setStaff] = useState(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.is_anonymous) { setStaff(null); setReady(true); return }
      const { data } = await supabase.from('staff').select('*').eq('user_id', user.id).maybeSingle()
      setStaff(data); setReady(true)
    }
    load()
    const { data: sub } = supabase.auth.onAuthStateChange(() => load())
    return () => sub.subscription.unsubscribe()
  }, [])
  return { staff, ready }
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const go = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErr('Wrong email or password.')
  }
  return (
    <form className="pad login" onSubmit={go}>
      <h1>Staff sign in</h1>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="primary">Sign in</button>
      {err && <p className="err">{err}</p>}
    </form>
  )
}

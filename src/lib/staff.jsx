import { useEffect, useState } from 'react'
import { Navigate, NavLink } from 'react-router-dom'
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

export const roleHome = { manager: '/manager', waiter: '/staff', kitchen: '/kitchen' }
const NAV = {
  manager: [['/manager', 'Dashboard'], ['/staff', 'Room'], ['/kitchen', 'Kitchen'], ['/menu', 'Menu'], ['/qr', 'QR codes'], ['/branding', 'Branding']],
  waiter: [['/staff', 'Room']], kitchen: [['/kitchen', 'Kitchen']],
}

// Wrap a page: not signed in -> /login, wrong role -> that role's own home, else page + top bar
export function Protect({ roles, children }) {
  const { staff, ready } = useStaff()
  if (!ready) return <p className="pad muted">Loading…</p>
  if (!staff) return <Navigate to="/login" replace />
  if (!roles.includes(staff.role)) return <Navigate to={roleHome[staff.role]} replace />
  return (
    <div className="shell">
      <header className="topbar">
        <b className="brandmark">Table</b>
        <nav className="navlinks">{NAV[staff.role].map(([to, l]) => <NavLink key={to} to={to}>{l}</NavLink>)}</nav>
        <div className="who"><span className="chip">{staff.display_name} · {staff.role}</span>
          <button onClick={() => supabase.auth.signOut()}>Sign out</button></div>
      </header>
      {children}
    </div>
  )
}

export function LoginPage() {
  const { staff, ready } = useStaff()
  if (ready && staff) return <Navigate to={roleHome[staff.role]} replace />
  return <div className="loginwrap"><Login /></div>
}

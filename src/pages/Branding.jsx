import { useEffect, useState } from 'react'
import { supabase, rpc } from '../lib/supabase'
import { useStaff, Login } from '../lib/staff'
import { compress } from '../lib/image'
import Home, { brandVars } from '../components/Home'

export default function Branding() {
  const { staff, ready } = useStaff()
  if (!ready) return <p className="pad">Loading…</p>
  if (!staff) return <Login />
  if (staff.role !== 'manager') return <p className="pad">Only managers can edit branding.</p>
  return <Form rid={staff.restaurant_id} />
}

function Form({ rid }) {
  const [f, setF] = useState(null)
  const [msg, setMsg] = useState('')
  useEffect(() => { supabase.from('restaurants').select('*').eq('id', rid).maybeSingle().then(({ data: r }) =>
    setF({ name: r.name, welcome: r.welcome_text || '', primary: r.theme?.primary || '#0f766e', accent: r.theme?.accent || '#f59e0b', logo: r.logo_url || '' })) }, [rid])
  if (!f) return <p className="pad">Loading…</p>
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const logo = async (file) => {
    if (!file) return
    const blob = await compress(file, 400)
    const path = `${rid}/logo-${Date.now()}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
    const { error } = await supabase.storage.from('menu-photos').upload(path, blob, { contentType: blob.type })
    if (!error) setF({ ...f, logo: supabase.storage.from('menu-photos').getPublicUrl(path).data.publicUrl })
  }
  const save = async () => {
    const r = await rpc('update_branding', { p_name: f.name, p_welcome: f.welcome, p_primary: f.primary, p_accent: f.accent, p_logo_url: f.logo || null })
    setMsg(r.ok ? 'Saved. Guests see it the next time they scan.' : 'Could not save. Check the colors and logo.')
  }
  return (
    <main className="pad wide">
      <div className="row between"><h1>Branding</h1><a href="/staff">Back to room</a></div>
      <div className="split">
        <div className="fields">
          <label>Restaurant name<input value={f.name} onChange={set('name')} /></label>
          <label>Welcome message<textarea rows={2} maxLength={200} value={f.welcome} onChange={set('welcome')} /></label>
          <div className="row">
            <label>Main color <input type="color" value={f.primary} onChange={set('primary')} /></label>
            <label>Accent color <input type="color" value={f.accent} onChange={set('accent')} /></label>
          </div>
          <label>Logo <input type="file" accept="image/*" onChange={(e) => logo(e.target.files[0])} /></label>
          <button className="primary" onClick={save}>Save</button>
          {msg && <p className="note">{msg}</p>}
        </div>
        <div className="preview" style={brandVars({ primary: f.primary, accent: f.accent })}>
          <Home name={f.name} logo={f.logo} welcome={f.welcome} table="5" showSoon onMenu={() => {}} />
        </div>
      </div>
    </main>
  )
}

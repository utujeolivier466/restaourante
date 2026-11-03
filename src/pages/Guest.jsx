import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, rpc, rwf, ensureGuest, useLive } from '../lib/supabase'
import Home, { brandVars } from '../components/Home'

const REASONS = {
  table_busy: 'Someone is already seated here. Ask them for the table code.',
  already_seated: 'You already have an open table.',
  wrong_code: 'Wrong code.', locked: 'Too many tries. Ask your waiter for a new code.',
  no_open_table: 'This table is not open yet.', session_not_active: 'This table is not open.',
  too_many_pending: 'Please wait, your waiter has not accepted your earlier orders yet.',
}

export default function Guest() {
  const { slug, table } = useParams()
  const [rest, setRest] = useState(null)
  const [menu, setMenu] = useState({ cats: [], items: [] })
  const [tableId, setTableId] = useState(null)
  const [session, setSession] = useState(null)
  const [orders, setOrders] = useState([])
  const [code, setCode] = useState(null)
  const [total, setTotal] = useState(0)
  const [cart, setCart] = useState({})
  const [joinCode, setJoinCode] = useState('')
  const [msg, setMsg] = useState('')
  const [view, setView] = useState('home')
  useEffect(() => { if (session) setView('menu') }, [session?.id]) // eslint-disable-line

  useEffect(() => { (async () => {
    const { data: r } = await supabase.from('restaurants').select('*').eq('slug', slug).maybeSingle()
    if (!r) return setMsg('Restaurant not found.')
    setRest(r)
    const [{ data: cats }, { data: items }, { data: t }] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('restaurant_id', r.id).order('sort_order'),
      supabase.from('menu_items').select('*').eq('restaurant_id', r.id).order('sort_order'),
      supabase.from('restaurant_tables').select('id').eq('restaurant_id', r.id).eq('number', table).maybeSingle(),
    ])
    setMenu({ cats: cats || [], items: items || [] }); setTableId(t?.id)
    await ensureGuest()
  })() }, [slug, table])

  const refresh = useCallback(async () => {
    if (!tableId) return
    const { data: s } = await supabase.from('table_sessions').select('*').eq('table_id', tableId)
      .in('status', ['pending', 'active', 'bill_requested']).maybeSingle()
    setSession(s)
    if (!s) return setOrders([])
    const { data: o } = await supabase.from('orders').select('*, order_items(*)').eq('session_id', s.id).order('created_at')
    setOrders(o || [])
    const { data: c } = await supabase.from('session_secrets').select('join_code').eq('session_id', s.id).maybeSingle()
    setCode(c?.join_code || null)
    setTotal(await rpc('session_total', { p_session_id: s.id }))
  }, [tableId])

  useEffect(() => { if (tableId) ensureGuest().then(() => refresh()) }, [tableId, refresh])
  useLive(['table_sessions', 'orders', 'waiter_calls'], refresh)

  const act = async (fn, args) => {
    setMsg('')
    try { const r = await rpc(fn, args); if (r && r.ok === false) setMsg(REASONS[r.reason] || 'Something went wrong.'); await refresh(); return r }
    catch { setMsg('Could not reach the server. Check your connection.') }
  }

  const lines = useMemo(() => Object.entries(cart).filter(([, q]) => q > 0), [cart])
  const cartTotal = lines.reduce((s, [id, q]) => s + q * menu.items.find((i) => i.id === id).price, 0)
  const place = async () => {
    const r = await act('place_order', { p_session_id: session.id, p_items: lines.map(([id, qty]) => ({ menu_item_id: id, qty })) })
    if (r?.ok) setCart({})
  }

  if (!rest) return <p className="pad">{msg || 'Loading…'}</p>
  if (!tableId) return <p className="pad">Table {table} does not exist.</p>
  const status = session?.status
  const brand = brandVars(rest.theme)
  if (view === 'home' && !session) return (
    <div style={brand}><Home name={rest.name} logo={rest.logo_url} welcome={rest.welcome_text} table={table} features={rest.theme?.features} onMenu={() => setView('menu')} /></div>)

  return (
    <div style={brand}><main className="pad">
      <h1>{rest.name}</h1>
      <p className="muted">Table {table}</p>
      {msg && <p className="err">{msg}</p>}

      {!session && (<section>
        <button className="primary big" onClick={() => act('request_table', { p_slug: slug, p_table: table })}>I'm at this table</button>
        <p className="muted">Already seated with friends? Enter the table code:</p>
        <div className="row">
          <input inputMode="numeric" maxLength={6} placeholder="6-digit code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
          <button onClick={() => act('join_session', { p_slug: slug, p_table: table, p_code: joinCode })}>Join</button>
        </div>
      </section>)}

      {status === 'pending' && <p className="note">Waiting for your waiter to confirm your table…</p>}

      {(status === 'active' || status === 'bill_requested') && (<>
        {code && <p className="note">Friends can join with code <b className="code">{code}</b></p>}

        {(status === 'active' || !session) && menu.cats.map((c) => (
          <section key={c.id}><h2>{c.name}</h2>
            {menu.items.filter((i) => i.category_id === c.id).map((i) => (
              <div className="item" key={i.id}>
                {i.photo_url && <img className="thumb" loading="lazy" src={i.photo_url} alt={i.name} />}<div style={{ flex: 1 }}><b>{i.name}</b><br /><span className="muted">{i.description}</span><br />{rwf(i.price)}</div>
                {i.is_available ? (status !== 'active' ? null :
                  <div className="qty">
                    <button onClick={() => setCart({ ...cart, [i.id]: Math.max(0, (cart[i.id] || 0) - 1) })}>−</button>
                    <span>{cart[i.id] || 0}</span>
                    <button onClick={() => setCart({ ...cart, [i.id]: (cart[i.id] || 0) + 1 })}>+</button>
                  </div>) : <span className="muted">Sold out</span>}
              </div>))}
          </section>))}

        {lines.length > 0 && <div className="bar"><button className="primary big" onClick={place}>Send order · {rwf(cartTotal)}</button></div>}

        <h2>Your orders</h2>
        {orders.length === 0 && <p className="muted">Nothing ordered yet.</p>}
        {orders.map((o) => (
          <div className="item" key={o.id}>
            <div>{o.order_items.map((x) => `${x.qty}× ${x.name}`).join(', ')}<br /><span className={'tag ' + o.status}>{o.status === 'pending' ? 'waiting for waiter' : o.status}</span></div>
            {o.status === 'pending' && <button onClick={() => act('cancel_order', { p_order_id: o.id })}>Cancel</button>}
          </div>))}

        <h2>Bill: {rwf(total)}</h2>
        <div className="row">
          <button onClick={() => act('call_waiter', { p_session_id: session.id })}>Call waiter</button>
          {status === 'active' && <button onClick={() => act('request_bill', { p_session_id: session.id })}>Ask for the bill</button>}
        </div>
        {status === 'bill_requested' && (<>
          <p className="muted">Choose how you will pay. Your waiter confirms the payment.</p>
          <div className="row">
            {['momo', 'card', 'cash'].map((m) => <button key={m} className="primary" onClick={() => act('start_payment', { p_session_id: session.id, p_method: m })}>{m === 'momo' ? 'MoMo' : m[0].toUpperCase() + m.slice(1)}</button>)}
          </div>
        </>)}
      </>)}
    </main></div>
  )
}

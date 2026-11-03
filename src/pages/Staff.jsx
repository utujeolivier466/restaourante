import { useCallback, useState } from 'react'
import { supabase, rpc, rwf, useLive, beep } from '../lib/supabase'
import { useStaff, Login } from '../lib/staff'

export default function Staff() {
  const { staff, ready } = useStaff()
  if (!ready) return <p className="pad">Loading…</p>
  if (!staff) return <Login />
  return <Room staff={staff} />
}

function Room({ staff }) {
  const [rows, setRows] = useState([])
  const [selId, setSelId] = useState(null)
  const load = useCallback(async () => {
    const { data } = await supabase.from('room_status').select('*').eq('restaurant_id', staff.restaurant_id)
    setRows((data || []).sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })))
  }, [staff])
  useLive(['table_sessions', 'orders', 'waiter_calls', 'payments'], load,
    (t, p) => { if (p.eventType === 'INSERT' && t !== 'payments') beep() })
  const sel = rows.find((r) => r.table_id === selId)

  return (
    <main className="pad wide">
      <div className="row between"><h1>Room</h1>{staff.role === 'manager' && <><a href="/manager">Edit menu</a><a href="/qr">QR codes</a><a href="/branding">Branding</a></>}<button onClick={() => supabase.auth.signOut()}>Sign out</button></div>
      <div className="grid">
        {rows.map((r) => {
          const cls = r.open_calls > 0 ? 'call' : r.session_status === 'pending' ? 'wait' : r.session_status === 'bill_requested' ? 'bill' : r.session_status ? 'on' : 'free'
          return (
            <button key={r.table_id} className={'tile ' + cls + (r.table_id === selId ? ' sel' : '')} onClick={() => setSelId(r.table_id)}>
              <b>{r.number}</b>
              <span>{r.open_calls > 0 ? 'calling' : r.session_status === 'pending' ? 'confirm?' : r.session_status === 'bill_requested' ? 'bill' : r.session_status ? rwf(r.total) : 'free'}</span>
              {r.pending_orders > 0 && <i className="dot">{r.pending_orders}</i>}
            </button>)
        })}
      </div>
      {sel?.session_id && <Panel key={sel.session_id} row={sel} />}
    </main>
  )
}

function Panel({ row }) {
  const [orders, setOrders] = useState([])
  const [calls, setCalls] = useState([])
  const [code, setCode] = useState(null)
  const load = useCallback(async () => {
    const [o, c, s] = await Promise.all([
      supabase.from('orders').select('*, order_items(*)').eq('session_id', row.session_id).order('created_at'),
      supabase.from('waiter_calls').select('*').eq('session_id', row.session_id).eq('status', 'open'),
      supabase.from('session_secrets').select('join_code').eq('session_id', row.session_id).maybeSingle(),
    ])
    setOrders(o.data || []); setCalls(c.data || []); setCode(s.data?.join_code || null)
  }, [row.session_id])
  useLive(['orders', 'waiter_calls', 'table_sessions'], load)
  const go = async (fn, args) => { await rpc(fn, args) }

  return (
    <section className="panel">
      <h2>Table {row.number} · {row.session_status}</h2>
      {row.session_status === 'pending' && (
        <div className="row">
          <button className="primary" onClick={() => go('accept_session', { p_session_id: row.session_id })}>Accept table</button>
          <button onClick={() => go('reject_session', { p_session_id: row.session_id })}>Nobody here</button>
        </div>)}
      {code && <p>Table code: <b className="code">{code}</b> <button onClick={() => go('regenerate_code', { p_session_id: row.session_id })}>New code</button></p>}
      {calls.map((c) => <div className="item" key={c.id}><b>Calling: {c.reason}</b><button onClick={() => go('resolve_call', { p_call_id: c.id })}>Done</button></div>)}
      {orders.map((o) => (
        <div className="item" key={o.id}>
          <div>{o.order_items.map((x) => `${x.qty}× ${x.name}`).join(', ')}<br /><span className={'tag ' + o.status}>{o.status}</span></div>
          {o.status === 'pending' && <button className="primary" onClick={() => go('accept_order', { p_order_id: o.id })}>Accept</button>}
          {o.status === 'ready' && <button onClick={() => go('set_order_status', { p_order_id: o.id, p_status: 'served' })}>Served</button>}
        </div>))}
      {(row.session_status === 'active' || row.session_status === 'bill_requested') && (<>
        <h3>Bill: {rwf(row.total)}</h3>
        <div className="row">
          {['cash', 'momo', 'card'].map((m) => <button key={m} onClick={() => go('close_session', { p_session_id: row.session_id, p_method: m })}>Paid · {m === 'momo' ? 'MoMo' : m}</button>)}
        </div>
      </>)}
    </section>
  )
}

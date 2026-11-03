import { useCallback, useState } from 'react'
import { supabase, rpc, useLive, beep } from '../lib/supabase'
import { useStaff, Login } from '../lib/staff'

export default function Kitchen() {
  const { staff, ready } = useStaff()
  if (!ready) return <p className="pad">Loading…</p>
  if (!staff) return <Login />
  return <Tickets staff={staff} />
}

function Tickets({ staff }) {
  const [orders, setOrders] = useState([])
  const load = useCallback(async () => {
    const { data } = await supabase.from('orders')
      .select('*, order_items(*), table_sessions(restaurant_tables(number))')
      .eq('restaurant_id', staff.restaurant_id).in('status', ['accepted', 'preparing']).order('accepted_at')
    setOrders(data || [])
  }, [staff])
  useLive(['orders', 'order_items'], load, (t, p) => { if (p.eventType === 'UPDATE' && p.new?.status === 'accepted') beep() })
  const set = (id, s) => rpc('set_order_status', { p_order_id: id, p_status: s })

  return (
    <main className="pad wide">
      <div className="row between"><h1>Kitchen</h1><button onClick={() => supabase.auth.signOut()}>Sign out</button></div>
      {orders.length === 0 && <p className="muted">No orders in the kitchen.</p>}
      <div className="tickets">
        {orders.map((o) => (
          <div className={'ticket ' + o.status} key={o.id}>
            <h2>Table {o.table_sessions?.restaurant_tables?.number}</h2>
            {o.order_items.map((x) => <p key={x.id}><b>{x.qty}×</b> {x.name}{x.note ? ` (${x.note})` : ''}</p>)}
            {o.note && <p className="muted">{o.note}</p>}
            {o.status === 'accepted' && <button className="primary" onClick={() => set(o.id, 'preparing')}>Start cooking</button>}
            {o.status === 'preparing' && <button className="primary" onClick={() => set(o.id, 'ready')}>Ready</button>}
          </div>))}
      </div>
    </main>
  )
}

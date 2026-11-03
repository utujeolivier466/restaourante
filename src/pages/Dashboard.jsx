import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, useLive } from '../lib/supabase'
import { useStaff } from '../lib/staff'

const money = (n) => new Intl.NumberFormat('en-RW').format(n || 0)
const LINKS = [
  ['/staff', 'Live room', 'Tables, requests and calls'],
  ['/kitchen', 'Kitchen', 'Orders being cooked'],
  ['/menu', 'Menu and photos', 'Items, prices, availability'],
  ['/branding', 'Branding', 'Logo, colors, welcome text'],
  ['/qr', 'QR codes', 'Print one card per table'],
]

export default function Dashboard() {
  const { staff } = useStaff()
  const [s, setS] = useState({ open: 0, calls: 0, orders: 0, sales: 0 })
  const load = useCallback(async () => {
    if (!staff) return
    const d = new Date(); d.setHours(0, 0, 0, 0)
    const [r, o] = await Promise.all([
      supabase.from('room_status').select('session_status,open_calls').eq('restaurant_id', staff.restaurant_id),
      supabase.from('orders').select('order_items(unit_price,qty)').eq('restaurant_id', staff.restaurant_id)
        .gte('created_at', d.toISOString()).neq('status', 'cancelled'),
    ])
    const rows = r.data || [], ord = o.data || []
    setS({
      open: rows.filter((x) => x.session_status).length,
      calls: rows.reduce((n, x) => n + (x.open_calls || 0), 0),
      orders: ord.length,
      sales: ord.reduce((n, x) => n + x.order_items.reduce((m, i) => m + i.unit_price * i.qty, 0), 0),
    })
  }, [staff])
  useLive(['table_sessions', 'orders', 'waiter_calls'], load)

  return (
    <main className="pad wide">
      <h1>Good day, {staff?.display_name}</h1>
      <p className="muted">Today at a glance. Updates live.</p>
      <div className="statgrid">
        <div className="stat"><span>Open tables</span><b>{s.open}</b></div>
        <div className="stat"><span>Waiter calls</span><b>{s.calls}</b></div>
        <div className="stat"><span>Orders today</span><b>{s.orders}</b></div>
        <div className="stat"><span>Sales today</span><b>{money(s.sales)}</b><small>RWF</small></div>
      </div>
      <div className="linkcards">
        {LINKS.map(([to, t, d]) => <Link key={to} to={to} className="linkcard"><b>{t}</b><span>{d}</span></Link>)}
      </div>
    </main>
  )
}

import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import { useStaff, Login } from '../lib/staff'

export default function QrSheet() {
  const { staff, ready } = useStaff()
  if (!ready) return <p className="pad">Loading…</p>
  if (!staff) return <Login />
  if (staff.role !== 'manager') return <p className="pad">Only managers can print QR codes.</p>
  return <Sheet staff={staff} />
}

const byNumber = (a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })

function Sheet({ staff }) {
  const [rest, setRest] = useState(null)
  const [tables, setTables] = useState([])
  const [qr, setQr] = useState({})
  const [base, setBase] = useState(window.location.origin) // set this to your live website address before printing
  const [count, setCount] = useState(10)

  const load = useCallback(async () => {
    const { data: r } = await supabase.from('restaurants').select('*').eq('id', staff.restaurant_id).maybeSingle()
    const { data: t } = await supabase.from('restaurant_tables').select('*').eq('restaurant_id', staff.restaurant_id).eq('is_active', true)
    setRest(r); setTables((t || []).sort(byNumber))
  }, [staff])
  useEffect(() => { load() }, [load])

  const link = (n) => `${base.replace(/\/$/, '')}/r/${rest.slug}/t/${encodeURIComponent(n)}`

  useEffect(() => {
    if (!rest) return
    ;(async () => {
      const out = {}
      for (const t of tables) out[t.number] = await QRCode.toDataURL(link(t.number), { margin: 1, width: 480, errorCorrectionLevel: 'M' })
      setQr(out)
    })()
  }, [rest, tables, base]) // eslint-disable-line

  const makeTables = async () => {
    const have = new Set(tables.map((t) => t.number))
    const rows = []
    for (let n = 1; n <= count; n++) if (!have.has(String(n))) rows.push({ restaurant_id: rest.id, number: String(n), label: 'Table ' + n })
    if (rows.length) await supabase.from('restaurant_tables').insert(rows)
    load()
  }

  if (!rest) return <p className="pad">Loading…</p>
  return (
    <main className="pad wide">
      <div className="noprint">
        <div className="row between"><h1>QR codes</h1><a href="/staff">Back to room</a></div>
        <p className="muted">One card per table. Print at 100% scale on A4 (6 per page), then cut, laminate and place on each table.</p>
        <label className="muted">Website address used in the QR codes</label>
        <input style={{ width: '100%' }} value={base} onChange={(e) => setBase(e.target.value)} />
        <p className="muted">Before printing, replace this with your live address, not localhost. Then scan one with your phone to test.</p>
        <div className="row">
          <span>Create tables 1 to</span>
          <input type="number" min="1" max="200" style={{ width: '5rem' }} value={count} onChange={(e) => setCount(+e.target.value)} />
          <button onClick={makeTables}>Add missing tables</button>
          <button className="primary" onClick={() => window.print()}>Print</button>
        </div>
      </div>
      <div className="sheet">
        {tables.map((t) => (
          <div className="qrcard" key={t.id}>
            <h2>{rest.name}</h2>
            <p className="scan">Scan to order</p>
            {qr[t.number] ? <img src={qr[t.number]} alt={`QR code for table ${t.number}`} /> : <div className="qrph" />}
            <p className="tno">Table {t.number}</p>
            <p className="small">No app. No account. Your waiter confirms your table.</p>
            <p className="small url">{link(t.number)}</p>
          </div>))}
      </div>
    </main>
  )
}

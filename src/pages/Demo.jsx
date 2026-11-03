import { useMemo, useState } from 'react'
import Home, { brandVars } from '../components/Home'

// Standalone demo: no database needed. Open /demo on any phone to show how the guest experience looks.
const pic = (e, bg) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' fill='${bg}'/><text x='60' y='80' font-size='58' text-anchor='middle'>${e}</text></svg>`)
const money = (n) => new Intl.NumberFormat('en-RW').format(n) + ' RWF'

const MENU = [
  { cat: 'Drinks', items: [
    ['Primus 50cl', 'Cold local beer', 1500, '🍺', '#fde68a'],
    ['Fresh passion juice', 'Freshly squeezed', 2500, '🍹', '#fed7aa'],
    ['Soda 30cl', 'Coca-Cola, Fanta or Sprite', 1000, '🥤', '#fecaca'],
    ['House cocktail', 'Ask for today’s mix', 6000, '🍸', '#ddd6fe'],
    ['Spiced milk tea', 'Rwandan style, hot', 1200, '🍵', '#bbf7d0'] ] },
  { cat: 'Starters', items: [
    ['Samosas (4)', 'Beef or vegetable, chili sauce', 2500, '🥟', '#fde68a'],
    ['French fries', 'Crispy, lightly salted', 2500, '🍟', '#fef08a'],
    ['Avocado salad', 'Local avocado, tomato, lime', 3000, '🥑', '#bbf7d0'] ] },
  { cat: 'Mains', items: [
    ['Goat brochettes', 'Grilled, served with plantain', 3500, '🍢', '#fdba74'],
    ['Grilled tilapia', 'Whole fish, chips and salad', 9000, '🐟', '#bae6fd'],
    ['Chicken and chips', 'Half chicken, house sauce', 7500, '🍗', '#fed7aa'],
    ['Vegetarian platter', 'Beans, rice, avocado, greens', 5000, '🥗', '#bbf7d0'],
    ['Beef stew', 'Slow cooked, with ugali', 6500, '🍲', '#fecaca', false] ] },
  { cat: 'Desserts', items: [
    ['Ice cream', 'Two scoops', 3000, '🍨', '#fbcfe8'],
    ['Fruit plate', 'Seasonal fruit', 3500, '🍉', '#fecdd3'] ] },
]
const LABEL = { waiting: 'Waiting for waiter', accepted: 'Sent to kitchen', cooking: 'Cooking', ready: 'Ready, on its way' }

export default function Demo() {
  const items = useMemo(() => MENU.flatMap((g) => g.items.map((x, i) => ({
    id: g.cat + i, cat: g.cat, name: x[0], desc: x[1], price: x[2], img: pic(x[3], x[4]), ok: x[5] !== false }))), [])
  const [view, setView] = useState('home')
  const [seat, setSeat] = useState('none') // none | waiting | ok
  const [cat, setCat] = useState('Drinks')
  const [cart, setCart] = useState({})
  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('menu')
  const [toast, setToast] = useState('')
  const brand = brandVars({ primary: '#0f766e', accent: '#f59e0b' })

  const lines = Object.entries(cart).filter(([, q]) => q > 0).map(([id, q]) => ({ item: items.find((i) => i.id === id), q }))
  const cartTotal = lines.reduce((s, l) => s + l.q * l.item.price, 0)
  const bill = orders.reduce((s, o) => s + o.total, 0)
  const say = (t) => { setToast(t); setTimeout(() => setToast(''), 2200) }
  const add = (id, d) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + d) }))
  const sit = () => { setSeat('waiting'); setTimeout(() => setSeat('ok'), 2200) }
  const send = () => {
    const id = Date.now()
    setOrders((p) => [...p, { id, lines, total: cartTotal, status: 'waiting' }])
    setCart({}); setTab('orders')
    ;['accepted', 'cooking', 'ready'].forEach((s, n) =>
      setTimeout(() => setOrders((p) => p.map((o) => (o.id === id ? { ...o, status: s } : o))), 2500 * (n + 1)))
  }

  if (view === 'home') return (
    <div style={brand}><Home name="Demo Lounge Kigali" welcome="Fresh food, cold drinks, good music." table="5" showSoon onMenu={() => setView('menu')} /></div>)

  return (
    <div style={brand}><main className="pad">
      <div className="row between"><h1>Demo Lounge Kigali</h1><button onClick={() => setView('home')}>Home</button></div>
      {seat === 'none' && <div className="note"><p>Sitting at table 5? Order from your phone.</p><button className="primary" onClick={sit}>I'm at this table</button></div>}
      {seat === 'waiting' && <p className="note">Waiting for your waiter to confirm your table…</p>}
      {seat === 'ok' && <p className="note">Table 5 confirmed. Friends can join with code <b className="code">482913</b></p>}
      {toast && <p className="toast">{toast}</p>}

      {tab === 'menu' && (<>
        <div className="chips">{MENU.map((g) => (
          <button key={g.cat} className={cat === g.cat ? 'primary' : ''} onClick={() => setCat(g.cat)}>{g.cat}</button>))}</div>
        <div className="cards">
          {items.filter((i) => i.cat === cat).map((i) => (
            <div className={'card' + (i.ok ? '' : ' off')} key={i.id}>
              <img src={i.img} alt={i.name} />
              <b>{i.name}</b><span className="muted">{i.desc}</span>
              <div className="row between">
                <span>{money(i.price)}</span>
                {!i.ok ? <span className="muted">Sold out</span> : seat !== 'ok' ? null : cart[i.id] > 0
                  ? <span className="qty"><button onClick={() => add(i.id, -1)}>−</button><span>{cart[i.id]}</span><button onClick={() => add(i.id, 1)}>+</button></span>
                  : <button className="primary" onClick={() => add(i.id, 1)}>Add</button>}
              </div>
            </div>))}
        </div>
        {lines.length > 0 && <div className="bar"><button className="primary big" onClick={send}>Send order · {money(cartTotal)}</button></div>}
      </>)}

      {tab === 'orders' && (<>
        <h2>Your orders</h2>
        {orders.length === 0 && <p className="muted">Nothing ordered yet.</p>}
        {orders.map((o) => (
          <div className="item" key={o.id}>
            <div>{o.lines.map((l) => `${l.q}× ${l.item.name}`).join(', ')}<br /><span className={'tag ' + o.status}>{LABEL[o.status]}</span></div>
            <b>{money(o.total)}</b>
          </div>))}
        <h2>Bill: {money(bill)}</h2>
        <div className="row">
          <button onClick={() => say('Your waiter was notified for table 5.')}>Call waiter</button>
          <button onClick={() => say('Bill requested. Choose how to pay.')}>Ask for the bill</button>
        </div>
        <div className="row" style={{ marginTop: '.6rem' }}>
          {['MoMo', 'Card', 'Cash'].map((m) => <button key={m} className="primary" onClick={() => say(`Demo: ${m} payment sent to your waiter.`)}>{m}</button>)}
        </div>
      </>)}

      {seat === 'ok' && <nav className="tabs">
        <button className={tab === 'menu' ? 'primary' : ''} onClick={() => setTab('menu')}>Menu</button>
        <button className={tab === 'orders' ? 'primary' : ''} onClick={() => setTab('orders')}>Orders and bill{orders.length ? ` (${orders.length})` : ''}</button>
      </nav>}
    </main></div>)
}

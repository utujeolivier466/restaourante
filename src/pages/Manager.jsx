import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStaff, Login } from '../lib/staff'
import { compress } from '../lib/image'

export default function Manager() {
  const { staff, ready } = useStaff()
  if (!ready) return <p className="pad">Loading…</p>
  if (!staff) return <Login />
  if (staff.role !== 'manager') return <p className="pad">Only managers can edit the menu.</p>
  return <Editor rid={staff.restaurant_id} />
}

function Editor({ rid }) {
  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [paste, setPaste] = useState('')
  const [msg, setMsg] = useState('')
  const load = useCallback(async () => {
    const [c, i] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('restaurant_id', rid).order('sort_order'),
      supabase.from('menu_items').select('*').eq('restaurant_id', rid).order('sort_order'),
    ])
    setCats(c.data || []); setItems(i.data || [])
  }, [rid])
  useEffect(() => { load() }, [load])

  const addCat = async () => {
    const name = prompt('Category name'); if (!name) return
    await supabase.from('menu_categories').insert({ restaurant_id: rid, name, sort_order: cats.length + 1 }); load()
  }
  const delCat = async (c) => {
    if (items.some((i) => i.category_id === c.id)) return alert('Delete or move this category’s items first.')
    await supabase.from('menu_categories').delete().eq('id', c.id); load()
  }
  const addItem = async (cid) => {
    await supabase.from('menu_items').insert({ restaurant_id: rid, category_id: cid, name: 'New item', price: 0, sort_order: items.length + 1 }); load()
  }

  // Paste rows from Excel/Sheets or type:  Category | Name | Price | Description
  const importMenu = async () => {
    const rows = paste.split('\n').map((l) => l.split(/\t|\|/).map((s) => s.trim()))
      .filter((r) => r.length >= 3 && r[0] && r[1] && parseInt(r[2].replace(/\D/g, '')) >= 0)
    if (!rows.length) return setMsg('No valid rows. Use: Category | Name | Price | Description')
    const ids = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]))
    for (const name of [...new Set(rows.map((r) => r[0]))]) {
      if (ids.has(name.toLowerCase())) continue
      const { data } = await supabase.from('menu_categories').insert({ restaurant_id: rid, name, sort_order: ids.size + 1 }).select().single()
      ids.set(name.toLowerCase(), data.id)
    }
    await supabase.from('menu_items').insert(rows.map((r, n) => ({
      restaurant_id: rid, category_id: ids.get(r[0].toLowerCase()), name: r[1],
      price: parseInt(r[2].replace(/\D/g, '')), description: r[3] || null, sort_order: items.length + n + 1,
    })))
    setPaste(''); setMsg(`Imported ${rows.length} items. Now add photos.`); load()
  }

  return (
    <main className="pad wide">
      <div className="row between"><h1>Menu</h1></div>
      {msg && <p className="note">{msg}</p>}
      <details>
        <summary>Import many items at once</summary>
        <p className="muted">One item per line: Category | Name | Price | Description</p>
        <textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Drinks | Primus 50cl | 1500 | Cold local beer'} />
        <button className="primary" onClick={importMenu}>Import</button>
      </details>
      {cats.map((c) => (
        <section key={c.id}>
          <div className="row between"><h2>{c.name}</h2><button onClick={() => delCat(c)}>Delete category</button></div>
          {items.filter((i) => i.category_id === c.id).map((i) => <ItemRow key={i.id} item={i} rid={rid} onGone={load} />)}
          <button onClick={() => addItem(c.id)}>Add item</button>
        </section>))}
      <p><button className="primary" onClick={addCat}>Add category</button></p>
    </main>
  )
}

function ItemRow({ item, rid, onGone }) {
  const [f, setF] = useState(item)
  const [busy, setBusy] = useState(false)
  const save = async (patch) => { setF((p) => ({ ...p, ...patch })); await supabase.from('menu_items').update(patch).eq('id', item.id) }
  const photo = async (file) => {
    if (!file) return
    setBusy(true)
    const blob = await compress(file)
    const path = `${rid}/${item.id}-${Date.now()}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
    const { error } = await supabase.storage.from('menu-photos').upload(path, blob, { contentType: blob.type })
    if (!error) await save({ photo_url: supabase.storage.from('menu-photos').getPublicUrl(path).data.publicUrl })
    setBusy(false)
  }
  const del = async () => { if (confirm(`Delete "${f.name}"?`)) { await supabase.from('menu_items').delete().eq('id', item.id); onGone() } }
  return (
    <div className="mrow">
      <label className="ph">
        {f.photo_url ? <img src={f.photo_url} alt="" /> : <span>{busy ? 'Uploading…' : 'Add photo'}</span>}
        <input type="file" accept="image/*" hidden onChange={(e) => photo(e.target.files[0])} />
      </label>
      <div className="fields">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} onBlur={() => save({ name: f.name })} />
        <input value={f.description || ''} placeholder="Description" onChange={(e) => setF({ ...f, description: e.target.value })} onBlur={() => save({ description: f.description })} />
        <div className="row">
          <input type="number" min="0" style={{ width: '7rem' }} value={f.price} onChange={(e) => setF({ ...f, price: +e.target.value })} onBlur={() => save({ price: f.price })} /> RWF
          <label><input type="checkbox" checked={f.is_available} onChange={(e) => save({ is_available: e.target.checked })} /> Available</label>
          <button onClick={del}>Delete</button>
        </div>
      </div>
    </div>
  )
}

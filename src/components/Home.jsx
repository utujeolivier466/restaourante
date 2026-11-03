// Landing screen after the QR scan. Add a feature later = add a tile here + turn it on in theme.features.
const TILES = [
  { key: 'wifi', icon: '📶', label: 'Wi-Fi' },
  { key: 'games', icon: '🎮', label: 'Play games' },
  { key: 'review', icon: '⭐', label: 'Leave a review' },
]
export const brandVars = (theme) => ({ '--brand': theme?.primary || '#0f766e', '--accent': theme?.accent || '#f59e0b' })

export default function Home({ name, logo, welcome, table, features = {}, showSoon = false, onMenu, onTile }) {
  return (
    <main className="pad home">
      {logo ? <img className="logo" src={logo} alt="" /> : <div className="logo mark">{(name || '?')[0]}</div>}
      <h1>{name}</h1>
      <p className="muted">{welcome || 'Welcome! Enjoy your visit.'}</p>
      <p className="tabletag">Table {table}</p>
      <button className="primary big" onClick={onMenu}>View menu</button>
      <div className="tiles">
        {TILES.filter((t) => features[t.key] || showSoon).map((t) => (
          <button key={t.key} className="tile2" disabled={!features[t.key]} onClick={() => onTile?.(t.key)}>
            <span>{t.icon}</span>{t.label}{!features[t.key] && <small>Coming soon</small>}
          </button>))}
      </div>
    </main>
  )
}

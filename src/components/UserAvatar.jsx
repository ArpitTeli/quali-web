const COLORS = [
  '#4ade80', '#60a5fa', '#f472b6', '#a78bfa',
  '#fbbf24', '#34d399', '#f87171', '#818cf8',
  '#2dd4bf', '#fb923c', '#e879f9', '#22d3ee',
]

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getColor(name) {
  return COLORS[hashCode(name || '') % COLORS.length]
}

export default function UserAvatar({ name, size = 32 }) {
  const initials = getInitials(name)
  const bg = getColor(name)

  return (
    <div
      className="user-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: bg,
      }}
    >
      {initials}
    </div>
  )
}

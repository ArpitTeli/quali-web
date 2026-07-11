export function detectColumns(headers) {
  const aliases = {
    name: ['name', 'lead name', 'company name', 'business name', 'firm name', 'contact name'],
    query: ['query', 'search', 'search term', 'search query'],
    website: ['website', 'url', 'site', 'web', 'webpage'],
    company_phone: ['company_phone', 'company phone', 'phone', 'telephone', 'contact number', 'mobile', 'phone number', 'cell', 'tel'],
    email: ['email', 'e-mail', 'mail', 'contact email', 'email address']
  }
  const mapping = {}
  const normalized = headers.map(h => ({ original: h, norm: String(h).toLowerCase().trim().replace(/[\s_-]+/g, ' ') }))
  for (const [col, aliasList] of Object.entries(aliases)) {
    const found = normalized.find(n => aliasList.some(a => n.norm === a || n.norm.includes(a)))
    mapping[col] = found ? found.original : null
  }
  return mapping
}

export function mapRowData(row, mapping) {
  const mapped = {}
  for (const [col, sourceCol] of Object.entries(mapping)) {
    mapped[col] = sourceCol && row[sourceCol] != null ? String(row[sourceCol]).trim() : ''
  }
  return mapped
}

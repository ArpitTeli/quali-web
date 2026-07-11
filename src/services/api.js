const AUTH_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby2uJSX2B_U2mhhHbddDinjogb_EgfGO0rw2jo266A1qYhTIysL0Smsky-ovxqnMUI3zg/exec'
const CLOUD_MASTER_URL = 'https://script.google.com/macros/s/AKfycbzzdnjM8crblZhT7Fpw_yoRpS465ZGV9pRGJEkiFad0FB4lEfh_u3FY9Oi4ze683TgB6A/exec'
const PUSH_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykxuCQoi6WnnTXKdid4Ql6mwET2C68sMKZCvh7frIcGz5Wxe5lW8YR6c7Yo2s1qhPx/exec'

// Per-user master sheet Apps Script
const MASTER_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwMetWVPRS0chdQzHKtPuk5ZUTJbeFIxgV13JDsw7QFthlOBGvwaoKebdQMTFzABRs/exec'

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  try {
    const parsed = JSON.parse(text)
    return parsed
  } catch {
    console.error('[API] Non-JSON response:', text.substring(0, 500))
    return { error: 'Invalid response from server' }
  }
}

export async function login(uid, password) {
  return post(AUTH_SCRIPT_URL, { action: 'login', uid, password })
}

export async function fetchCloudMaster() {
  return post(CLOUD_MASTER_URL, { action: 'getTaggedNames' })
}

export async function addTag({ name, phone, taggedBy, tag }) {
  return post(CLOUD_MASTER_URL, { action: 'addTag', name, phone, taggedBy, tag })
}

export async function readMasterSheet(sheetId) {
  return post(MASTER_SCRIPT_URL, { action: 'readMaster', sheetId })
}

export async function updateMasterRow(sheetId, rowKey, field, value) {
  return post(MASTER_SCRIPT_URL, { action: 'updateMasterRow', sheetId, name: rowKey.name, website: rowKey.website, field, value })
}

export async function discardMasterRow(sheetId, rowKey) {
  return post(MASTER_SCRIPT_URL, { action: 'discardMasterRow', sheetId, name: rowKey.name, website: rowKey.website })
}

export async function addMasterLead(sheetId, row) {
  return post(MASTER_SCRIPT_URL, { action: 'addMasterLead', sheetId, row })
}

export async function getMasterStats(sheetId) {
  return post(MASTER_SCRIPT_URL, { action: 'getMasterStats', sheetId })
}

export async function pushLead(data) {
  return post(PUSH_SCRIPT_URL, data)
}

export async function getLeaderboard() {
  return post(PUSH_SCRIPT_URL, { action: 'leaderboard' })
}

export async function cloudMasterDebug() {
  return post(CLOUD_MASTER_URL, { action: 'getTaggedNames' })
}

function normalizePhone(raw) {
  if (!raw) return ''
  let str = String(raw).trim()
  if (str.startsWith('+91')) str = str.slice(3)
  let digits = str.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(-10)
}

export { CLOUD_MASTER_URL, AUTH_SCRIPT_URL, PUSH_SCRIPT_URL, MASTER_SCRIPT_URL, normalizePhone }

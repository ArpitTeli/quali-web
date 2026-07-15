const AUTH_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDTPJExdQGRYcYsk32bll-1u-9Y8ofcD-ZkM3ITsTE-3jKnKpXBgRMVJ6nHnp3NsBGKg/exec'
const CLOUD_MASTER_URL = 'https://script.google.com/macros/s/AKfycbzzdnjM8crblZhT7Fpw_yoRpS465ZGV9pRGJEkiFad0FB4lEfh_u3FY9Oi4ze683TgB6A/exec'
const PUSH_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykxuCQoi6WnnTXKdid4Ql6mwET2C68sMKZCvh7frIcGz5Wxe5lW8YR6c7Yo2s1qhPx/exec'

// Per-user master sheet Apps Script
const MASTER_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw4mIswXp7eGcze1rb8QWWY8Wi7Q2tw1gwc_Q-f5YAtwVoIoByrLHaY39QvsWxpPNU9/exec'

// LDS (Lead Distribution System) Apps Script
const LDS_SCRIPT_URL = 'REPLACE_WITH_LDS_URL'

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

export async function getFileTree(userId) {
  return post(LDS_SCRIPT_URL, { action: 'getFileTree', userId })
}

export async function claimFile(userId, fileId) {
  return post(LDS_SCRIPT_URL, { action: 'claimFile', userId, fileId })
}

export async function saveProgress(assignmentId, progressData) {
  return post(LDS_SCRIPT_URL, { action: 'saveProgress', assignmentId, progressData })
}

export async function loadProgress(assignmentId) {
  return post(LDS_SCRIPT_URL, { action: 'loadProgress', assignmentId })
}

export async function markSheetComplete(assignmentId) {
  return post(LDS_SCRIPT_URL, { action: 'markComplete', assignmentId })
}

export async function getLdsStats(userId) {
  return post(LDS_SCRIPT_URL, { action: 'getQueueStats', userId })
}

function normalizePhone(raw) {
  if (!raw) return ''
  let str = String(raw).trim()
  if (str.startsWith('+91')) str = str.slice(3)
  let digits = str.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(-10)
}

export { CLOUD_MASTER_URL, AUTH_SCRIPT_URL, PUSH_SCRIPT_URL, MASTER_SCRIPT_URL, LDS_SCRIPT_URL, normalizePhone }

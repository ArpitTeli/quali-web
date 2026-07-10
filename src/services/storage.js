const PREFIX = 'quali_'

export function saveConfig(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) { /* ignore */ }
}

export function getConfig(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}

export function removeConfig(key) {
  localStorage.removeItem(PREFIX + key)
}

export function saveSession(data) {
  saveConfig('session', data)
}

export function getSession() {
  return getConfig('session')
}

export function clearSession() {
  removeConfig('session')
}

export function saveActivities(activities) {
  saveConfig('activities', activities)
}

export function getActivities() {
  return getConfig('activities') || []
}

export function saveTodos(todos) {
  saveConfig('todos', todos)
}

export function getTodos() {
  return getConfig('todos') || []
}

export function savePushedByName(name) {
  saveConfig('pushedByName', name)
}

export function getPushedByName() {
  return getConfig('pushedByName') || ''
}

export function saveScriptUrl(url) {
  saveConfig('scriptUrl', url)
}

export function getScriptUrl() {
  return getConfig('scriptUrl') || ''
}

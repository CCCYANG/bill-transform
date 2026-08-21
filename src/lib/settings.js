const KEY_ENABLED = 'bill-transform:smart-classify'
const KEY_API = 'bill-transform:deepseek-api-key'

export function getSmartClassifyEnabled () {
  return localStorage.getItem(KEY_ENABLED) === '1'
}

export function setSmartClassifyEnabled (on) {
  localStorage.setItem(KEY_ENABLED, on ? '1' : '0')
}

export function getDeepseekApiKey () {
  return localStorage.getItem(KEY_API) || ''
}

export function setDeepseekApiKey (key) {
  const trimmed = (key || '').trim()
  if (!trimmed) localStorage.removeItem(KEY_API)
  else localStorage.setItem(KEY_API, trimmed)
}

/**
 * Dev uses Vite proxy to avoid CORS.
 * Production (GitHub Pages) calls DeepSeek directly; may fail if CORS blocked.
 */
export function getDeepseekChatUrl () {
  if (import.meta.env.DEV) return '/deepseek/chat/completions'
  return 'https://api.deepseek.com/chat/completions'
}

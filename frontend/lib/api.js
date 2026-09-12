const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'

export async function apiRequest(path, options = {}) {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('tf_token') : null
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
  } catch (error) {
    if (typeof window !== 'undefined' && options.body && options.method && options.method !== 'GET') {
      window.localStorage.setItem('tf_pending_request', JSON.stringify({ path, options }))
    }
    throw new Error('You appear to be offline. Your input is saved and can be retried when you reconnect.')
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`)
  return data
}

export { API_BASE_URL }

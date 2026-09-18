let sessionRequest: Promise<{ sessionId: string }> | null = null
let sessionExpiresAt = 0

export function createSession(force = false): Promise<{ sessionId: string }> {
  if (!force && sessionRequest && Date.now() < sessionExpiresAt) return sessionRequest
  sessionExpiresAt = Date.now() + 5 * 60 * 1000
  sessionRequest = (async () => {
    const response = await fetch('/api/session', { method: 'POST', credentials: 'include' })
    if (!response.ok) throw new Error('Failed to create session')
    return response.json()
  })().catch((error) => {
    sessionRequest = null
    sessionExpiresAt = 0
    throw error
  })
  return sessionRequest
}

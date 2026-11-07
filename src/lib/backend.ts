let sessionRequest: Promise<{ sessionId: string }> | null = null
let sessionExpiresAt = 0

async function requestSession(eventType: string): Promise<{ sessionId: string }> {
  const response = await fetch('/api/session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: eventType }),
  })
  if (!response.ok) throw new Error('Failed to create session')
  return response.json()
}

export function createSession(
  force = false,
  eventType: string = 'visited',
): Promise<{ sessionId: string }> {
  // Events other than "visited" (like generated_portfolio) must always reach the server
  if (eventType !== 'visited') return requestSession(eventType)

  if (!force && sessionRequest && Date.now() < sessionExpiresAt) return sessionRequest
  sessionExpiresAt = Date.now() + 5 * 60 * 1000
  sessionRequest = requestSession(eventType).catch((error) => {
    sessionRequest = null
    sessionExpiresAt = 0
    throw error
  })
  return sessionRequest
}

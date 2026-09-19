import { createSession } from './backend'
import { photoReference } from './photoReference'

export interface PhotoCrop { zoom: number; x: number; y: number }

export function getPhotoCrop(width: number, height: number, crop: PhotoCrop) {
  const size = Math.min(width, height) / crop.zoom
  return { x: (width - size) * crop.x / 100, y: (height - size) * crop.y / 100, size }
}

export async function uploadProfilePhoto(image: string): Promise<string> {
  await createSession()
  const upload = () => fetch('/api/profile-photo', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }),
  })
  let response = await upload()
  if (response.status === 401) {
    await createSession(true)
    response = await upload()
  }
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error || 'Could not upload your photo. Run the app with Vercel and try again.')
  const url = result?.url
  if (typeof url !== 'string' || !/^\/api\/profile-photo\?id=[a-f0-9-]{36}$/i.test(url)) {
    throw new Error('The uploaded photo URL could not be read.')
  }
  return url
}

export async function deleteProfilePhoto(avatarUrl: string): Promise<void> {
  const reference = photoReference(avatarUrl)
  if (!reference) throw new Error('This is your GitHub photo, not an uploaded photo.')
  let id = reference.id
  if (!id && reference.legacy) {
    const response = await fetch('/api/profile-photo?mine=1', { credentials: 'include', cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Could not find this photo.')
    id = result.photos?.find((photo: { id: string; legacy_url?: string }) => photo.legacy_url === reference.legacy)?.id
  }
  if (!id) throw new Error('This photo is not available in your current browser session.')
  const response = await fetch(`/api/profile-photo?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Could not delete this photo. Try again.')
}

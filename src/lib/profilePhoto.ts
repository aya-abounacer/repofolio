import { createSession } from './backend'

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
  const url = typeof result?.url === 'string' ? new URL(result.url) : null
  if (!url || url.protocol !== 'https:' || !url.hostname.endsWith('.public.blob.vercel-storage.com')) {
    throw new Error('The uploaded photo URL could not be read.')
  }
  return url.href
}

export const PHOTO_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export function isBlobPhotoUrl(value: string): boolean {
  try { return new URL(value).hostname.endsWith('.blob.vercel-storage.com') } catch { return false }
}

export function photoReference(value: string): { id?: string; legacy?: string } | null {
  if (isBlobPhotoUrl(value)) return { legacy: value }
  if (!value.startsWith('/api/profile-photo?')) return null
  const params = new URLSearchParams(value.split('?')[1])
  const id = params.get('id')
  if (id && PHOTO_ID.test(id)) return { id }
  const legacy = params.get('legacy')
  return legacy && isBlobPhotoUrl(legacy) ? { legacy } : null
}

// Old local drafts must also use the access-checked endpoint after migration.
export function protectedPhotoUrl(value: string): string {
  return isBlobPhotoUrl(value) ? `/api/profile-photo?legacy=${encodeURIComponent(value)}` : value
}

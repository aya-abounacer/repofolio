import { useEffect, useRef, useState } from 'react'
import { getPhotoCrop, uploadProfilePhoto, type PhotoCrop } from '../lib/profilePhoto'

interface Props {
  avatarUrl: string
  githubAvatarUrl: string
  onChange: (url: string) => void
  onBusyChange: (busy: boolean) => void
}

export function ProfilePhotoEditor({ avatarUrl, githubAvatarUrl, onChange, onBusyChange }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const selection = useRef(0)
  const [photo, setPhoto] = useState<ImageBitmap | null>(null)
  const [crop, setCrop] = useState<PhotoCrop>({ zoom: 1, x: 50, y: 50 })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => () => { photo?.close() }, [photo])
  useEffect(() => () => { selection.current += 1 }, [])
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!photo || !ctx) return
    const area = getPhotoCrop(photo.width, photo.height, crop)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 512, 512)
    ctx.drawImage(photo, area.x, area.y, area.size, area.size, 0, 0, 512, 512)
  }, [photo, crop])

  async function choosePhoto(file?: File) {
    if (!file) return
    const request = ++selection.current
    setError('')
    setMessage('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP photo.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Choose a photo smaller than 10 MB.')
      return
    }
    setLoading(true)
    try {
      const bitmap = await createImageBitmap(file)
      if (request !== selection.current) { bitmap.close(); return }
      if (bitmap.width * bitmap.height > 40_000_000) {
        bitmap.close()
        throw new Error('Choose a photo under 40 megapixels.')
      }
      setPhoto(bitmap)
      setCrop({ zoom: 1, x: 50, y: 50 })
    } catch (caught) {
      if (request === selection.current) setError(caught instanceof Error ? caught.message : 'This image could not be opened. Choose another photo.')
    } finally {
      if (request === selection.current) setLoading(false)
    }
  }

  async function applyPhoto() {
    if (!canvas.current || uploading) return
    setUploading(true)
    onBusyChange(true)
    setError('')
    try {
      const image = canvas.current.toDataURL('image/jpeg', 0.88).split(',')[1]
      const url = await uploadProfilePhoto(image)
      onChange(url)
      setPhoto(null)
      setMessage('Photo saved. Copy a new portfolio link to share this version.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not upload the photo. Try again.')
    } finally {
      setUploading(false)
      onBusyChange(false)
    }
  }

  return <div className="space-y-3">
    <span className="studio-label">Profile photo</span>
    <div className="flex items-center gap-3">
      <img src={avatarUrl || githubAvatarUrl} alt="Current profile photo" className="h-16 w-16 shrink-0 rounded-xl border border-white/15 object-cover" />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="studio-mini-button" disabled={uploading || loading} onClick={() => input.current?.click()}>{loading ? 'Opening…' : 'Upload photo'}</button>
        <button type="button" className="studio-mini-button" disabled={uploading || loading || (!photo && avatarUrl === githubAvatarUrl)} onClick={() => { setPhoto(null); setError(''); onChange(githubAvatarUrl); setMessage('GitHub photo restored. Copy a new link to share this version.') }}>Use GitHub photo</button>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a profile photo" hidden onChange={(event) => { void choosePhoto(event.target.files?.[0]); event.target.value = '' }} />
    </div>
    <p className="text-xs leading-5 text-zinc-400">JPG, PNG, or WebP, up to 10 MB. Uploaded photos are public and can appear in your shared portfolio.</p>
    {photo ? <div className="space-y-3 rounded-xl border border-white/15 bg-white/[0.025] p-3">
      <p className="text-sm font-medium text-zinc-200">Crop your photo</p>
      <canvas ref={canvas} width={512} height={512} role="img" aria-label="Square photo crop preview" className="mx-auto block aspect-square w-full max-w-56 rounded-lg" />
      <fieldset disabled={uploading} className="space-y-2">
        {([
          ['zoom', 'Zoom', 1, 3, 0.01], ['x', 'Left / right', 0, 100, 1], ['y', 'Up / down', 0, 100, 1],
        ] as const).map(([key, label, min, max, step]) => <label key={key} className="block text-xs text-zinc-300">
          {label}<input type="range" min={min} max={max} step={step} value={crop[key]} onChange={(event) => setCrop({ ...crop, [key]: Number(event.target.value) })} className="mt-1 block w-full accent-white" />
        </label>)}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="studio-primary-button" disabled={uploading || loading} onClick={() => void applyPhoto()}>{uploading ? 'Uploading…' : 'Save photo'}</button>
        <button type="button" className="studio-mini-button" disabled={uploading} onClick={() => { setPhoto(null); setError('') }}>Cancel</button>
      </div>
    </div> : null}
    {error ? <p role="alert" className="text-xs text-amber-300">{error}</p> : null}
    {message ? <p role="status" className="text-xs text-zinc-300">{message}</p> : null}
  </div>
}

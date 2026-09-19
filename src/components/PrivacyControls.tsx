import { useState } from 'react'

interface SavedItem { id: string; created_at: string; name?: string; username?: string; deleted_at?: string; legacy_url?: string }

export function PrivacyControls({ kind, username = '', onRemoved }: {
  kind: 'photos' | 'links'; username?: string; onRemoved: (item: SavedItem) => void
}) {
  const [items, setItems] = useState<SavedItem[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const endpoint = kind === 'photos' ? '/api/profile-photo' : '/api/portfolios'

  async function load() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${endpoint}?mine=1&username=${encodeURIComponent(username)}`, { credentials: 'include', cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not load your saved items.')
      setItems(kind === 'photos' ? result.photos : result.portfolios)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load saved items.') }
    finally { setBusy(false) }
  }

  async function remove(item: SavedItem) {
    if (!window.confirm(kind === 'photos'
      ? 'Permanently delete this uploaded photo? It will disappear from every portfolio using it. Downloaded copies cannot be recalled.'
      : 'Unpublish this link? Visitors will no longer be able to open it. Your draft and other links will remain.')) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${endpoint}?id=${item.id}`, { method: 'DELETE', credentials: 'include' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not complete the request. Try again.')
      setItems(current => current?.filter(saved => saved.id !== item.id) || [])
      onRemoved(item)
      if (kind === 'links') setMessage('Link unpublished.')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not complete the request.') }
    finally { setBusy(false) }
  }

  return <div className="space-y-3">
    <button type="button" className="studio-mini-button" disabled={busy} onClick={() => void load()}>{busy ? 'Working…' : kind === 'photos' ? 'Past uploads' : 'Load my shared links'}</button>
    {items?.length === 0 ? <p className="text-xs text-zinc-400">No {kind === 'photos' ? 'uploaded photos' : 'active shared links'} in this session.</p> : null}
    <div className="max-h-72 space-y-2 overflow-y-auto">
      {items?.map(item => <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/15 p-2">
        {kind === 'photos' && !item.deleted_at ? <img src={`/api/profile-photo?id=${item.id}`} alt="Uploaded profile photo" className="h-10 w-10 rounded object-cover" /> : null}
        <div className="min-w-0 flex-1 text-xs text-zinc-300">
          {kind === 'links' ? <a className="underline" href={`/p/${encodeURIComponent(item.username || username)}/${item.id}`} target="_blank" rel="noreferrer">{item.name || 'View portfolio'}</a> : <span>{item.deleted_at ? 'Deletion pending' : 'Uploaded photo'}</span>}
          <p className="mt-1 text-zinc-400">{new Date(item.created_at).toLocaleString()}</p>
        </div>
        <button type="button" disabled={busy} className="studio-mini-button" onClick={() => void remove(item)}>{kind === 'links' ? 'Unpublish' : item.deleted_at ? 'Retry deletion' : 'Delete'}</button>
      </div>)}
    </div>
    {error ? <p role="alert" className="text-xs text-amber-300">{error}</p> : null}
    {message ? <p role="status" className="text-xs text-zinc-300">{message}</p> : null}
  </div>
}

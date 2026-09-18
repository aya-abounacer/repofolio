import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { fetchGithubPortfolioSource } from '../lib/github'
import { createPortfolioData, decodePortfolio } from '../lib/portfolio'
import { usePageMeta } from '../lib/seo'
import type { PortfolioData } from '../types'
import { loadSharedPortfolio } from '../lib/sharing'
import { loadPortfolioDraft } from '../lib/draft'
import { PortfolioView } from './PortfolioView'

export function PublicPortfolioPage({ username = '', shareId, localPreview = false }: { username?: string; shareId?: string; localPreview?: boolean }) {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const printMode = searchParams.get('print') === '1'
  const [data, setData] = useState<PortfolioData | null>(() => {
    if (shareId || localPreview) return null
    const encoded = searchParams.get('data')
    return encoded ? decodePortfolio(encoded) : null
  })
  const [loading, setLoading] = useState(!data)
  const [error, setError] = useState('')

  usePageMeta({
    title: data ? `${data.name} — Developer portfolio` : `@${username} — Developer portfolio`,
    description: data?.bio || `Developer portfolio for @${username}, generated with RepoFolio.`,
    path: shareId ? `/p/${encodeURIComponent(data?.username || username)}/${shareId}` : localPreview ? `/preview/${encodeURIComponent(username)}` : `/portfolio/${encodeURIComponent(username)}`,
    themeColor: data?.appearance.mode === 'light' ? '#f5f3ed' : '#11130f',
    robots: printMode || localPreview || Boolean(shareId) ? 'noindex,nofollow' : 'index,follow',
  })

  useEffect(() => {
    if (data) return
    void (async () => {
      try {
        if (shareId) {
          setData(await loadSharedPortfolio(shareId))
        } else if (localPreview) {
          const draft = loadPortfolioDraft(username)
          if (!draft) throw new Error('This preview is only available on the device where you edited it. Use Copy link in the editor to share it.')
          setData(draft.portfolio)
        } else {
          const source = await fetchGithubPortfolioSource(username)
          setData(createPortfolioData(source.user, source.repos))
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not load this portfolio.')
      } finally {
        setLoading(false)
      }
    })()
  }, [data, username, shareId, localPreview])

  useEffect(() => {
    if (!printMode || !data) return
    let cancelled = false

    void (async () => {
      if (document.fonts?.ready) await document.fonts.ready
      const images = Array.from(document.images)
      await Promise.all(images.map((image) => {
        if (image.complete) return Promise.resolve()
        return new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true })
          image.addEventListener('error', () => resolve(), { once: true })
        })
      }))
      await new Promise((resolve) => window.setTimeout(resolve, 180))
      if (!cancelled) window.print()
    })()

    return () => { cancelled = true }
  }, [data, printMode])

  if (loading) {
    return (
      <main className="public-state-page">
        <div className="public-state-card" role="status" aria-live="polite">
          <div className="public-state-icon"><LoaderCircle className="animate-spin" size={22} /></div>
          <p className="public-state-kicker">RepoFolio</p>
          <h1>{shareId ? 'Opening saved portfolio' : `Opening @${username}`}</h1>
          <p>Loading your portfolio.</p>
        </div>
      </main>
    )
  }

  if (!data || error) {
    return (
      <main className="public-state-page">
        <div className="public-state-card">
          <div className="public-state-icon"><ArrowLeft size={19} /></div>
          <p className="public-state-kicker">Portfolio unavailable</p>
          <h1>We couldn’t open this portfolio.</h1>
          <p>{error || 'The shared portfolio data could not be read.'}</p>
          <div className="public-state-actions">
            <a href="/" className="studio-primary-button">Build your own</a>
            <a href="/example" className="studio-secondary-button">View example</a>
          </div>
        </div>
      </main>
    )
  }

  return <PortfolioView data={data} />
}

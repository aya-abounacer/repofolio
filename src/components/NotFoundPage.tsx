import { ArrowLeft, Eye } from 'lucide-react'
import { usePageMeta } from '../lib/seo'

export function NotFoundPage() {
  usePageMeta({
    title: 'Page not found — RepoFolio',
    description: 'The RepoFolio page you requested could not be found.',
    robots: 'noindex,nofollow',
  })

  return (
    <main className="public-state-page">
      <div className="public-state-card">
        <p className="public-state-kicker">404</p>
        <h1>That page doesn’t exist.</h1>
        <p>Build a portfolio from a GitHub profile or open the example to see what RepoFolio generates.</p>
        <div className="public-state-actions">
          <a href="/" className="studio-primary-button"><ArrowLeft size={15} /> Home</a>
          <a href="/example" className="studio-secondary-button"><Eye size={15} /> Example</a>
        </div>
      </div>
    </main>
  )
}

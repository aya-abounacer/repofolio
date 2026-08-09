import { ArrowLeft, WandSparkles } from 'lucide-react'
import { EXAMPLE_PORTFOLIO } from '../lib/example'
import { usePageMeta } from '../lib/seo'
import { PortfolioView } from './PortfolioView'

export function ExamplePortfolioPage() {
  usePageMeta({
    title: 'Example developer portfolio — RepoFolio',
    description: 'See what RepoFolio can generate from a GitHub profile, including projects, experience, skills, and a recruiter-ready portfolio layout.',
    path: '/example',
  })

  return (
    <main className="example-page-shell">
      <div className="example-demo-bar">
        <a href="/" className="example-demo-back"><ArrowLeft size={15} /> RepoFolio</a>
        <p>Example portfolio · generated and customized with RepoFolio</p>
        <a href="/#generator" className="example-demo-cta"><WandSparkles size={15} /> Build yours</a>
      </div>
      <PortfolioView data={EXAMPLE_PORTFOLIO} />
    </main>
  )
}

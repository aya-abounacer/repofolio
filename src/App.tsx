import { ExamplePortfolioPage } from './components/ExamplePortfolioPage'
import { LandingPage } from './components/LandingPage'
import { NotFoundPage } from './components/NotFoundPage'
import { PublicPortfolioPage } from './components/PublicPortfolioPage'
import { StudioPage } from './components/StudioPage'

function App() {
  const parts = window.location.pathname.split('/').filter(Boolean)
  const [route, username] = parts

  if (route === 'studio' && username) {
    return <StudioPage username={decodeURIComponent(username)} />
  }

  if (route === 'portfolio' && username) {
    return <PublicPortfolioPage username={decodeURIComponent(username)} />
  }

  if (route === 'example') {
    return <ExamplePortfolioPage />
  }

  if (parts.length > 0) return <NotFoundPage />

  return <LandingPage />
}

export default App

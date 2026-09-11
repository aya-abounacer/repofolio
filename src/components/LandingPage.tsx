import { FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Copy, Eye, Github, Link2, Send, SlidersHorizontal } from 'lucide-react'
import { EXAMPLE_PORTFOLIO } from '../lib/example'
import { normalizeGithubUsername } from '../lib/portfolio'
import { usePageMeta } from '../lib/seo'
import TextAnimator from './animata/text/text-animator'
import KineticGrid from './ui/kinetic-grid'
import { ScrollProgressBar } from './ScrollProgressBar'
import { TiltedCard } from './TiltedCard'
import TextLoop from './TextLoop'

export function LandingPage() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  usePageMeta({
    title: 'RepoFolio — Build your developer portfolio from GitHub',
    description: 'Turn your public GitHub profile and repositories into a polished, editable developer portfolio in about 60 seconds. No signup required.',
    path: '/',
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const normalized = normalizeGithubUsername(username)
    if (!normalized) {
      setError('Enter a GitHub username or profile URL to continue.')
      return
    }
    window.location.href = `/studio/${encodeURIComponent(normalized)}`
  }

  return (
    <KineticGrid className="landing-shell text-white">
      <ScrollProgressBar color="#e3a66f" height={3} />
      <main className="min-h-screen overflow-hidden">
      <a className="skip-link" href="#generator">Skip to generator</a>

      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-6 lg:px-8">
        <a href="/" className="landing-brand">
          <img src="/favicon.svg" alt="RepoFolio" className="landing-brand-logo" />
          <span>RepoFolio</span>
        </a>
        <div className="flex items-center gap-4 text-sm">
          <a href="#how-it-works" className="hidden text-zinc-500 transition hover:text-white sm:inline">How it works</a>
          <a href="/example" className="landing-nav-example"><Eye size={15} /> Example</a>
        </div>
      </nav>

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-5 pb-20 pt-2 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-4">
        <div className="max-w-2xl">
          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.75rem] lg:leading-[0.98]">
            <span className="sr-only">Your GitHub already tells a story. Make it look worth opening.</span>
            <TextAnimator
              samples={[
                'Your GitHub already tells a story.',
                'Make it look worth opening.',
              ]}
              titleClassName="landing-hero-animation-title"
              holdMs={1000}
              className="landing-hero-text-animation"
            />
          </h1>
          <p className="mt-4 max-w-lg text-pretty text-lg leading-9 text-zinc-300 sm:text-xl">
            Turn your public profile and repositories into a professional portfolio you can customize, share with recruiters, and export as PDF.
          </p>

          <form id="generator" onSubmit={handleSubmit} className="mt-9 max-w-xl scroll-mt-6">
            <label htmlFor="github-username" className="mb-2 block text-xs font-medium uppercase tracking-[0.13em] text-zinc-600">GitHub profile</label>
            <div className="landing-generator group">
              <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
                <Github size={18} className="shrink-0 text-zinc-500" aria-hidden="true" />
                <input
                  id="github-username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    setError('')
                  }}
                  aria-describedby={error ? 'github-error github-help' : 'github-help'}
                  aria-invalid={Boolean(error)}
                  placeholder="github.com/username"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="h-12 w-full bg-transparent text-base text-white outline-none placeholder:text-zinc-600"
                />
              </div>
              <button type="submit" className="landing-generate-button">
                Generate portfolio <ArrowRight size={16} />
              </button>
            </div>
            {error ? <p id="github-error" role="alert" className="mt-3 text-sm text-rose-300">{error}</p> : null}
            <p id="github-help" className="mt-3 text-xs leading-5 text-zinc-600">Public GitHub data only. Your edits stay in your browser until you share them.</p>
          </form>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500">
            {['3 portfolio templates', 'Autosaved editing', 'Share + PDF export'].map((item) => (
              <span key={item} className="inline-flex items-center gap-2"><Check size={14} className="text-emerald-400" /> {item}</span>
            ))}
          </div>

          <a href="/example" className="landing-example-link"><Eye size={15} /> Not ready to use your profile? Open the example portfolio.</a>
        </div>

        <ExamplePortfolio />
      </section>

      <section className="landing-audience-strip" aria-label="Who RepoFolio is for">
        <p className="landing-audience-label">Built for</p>
        <TextLoop
          text="Students · Junior developers · Recent graduates · Freelancers · Job seekers"
          separator="✦"
          speed={62}
          mobileSpeed={420}
          mobileFontSize={132}
          curviness={30}
          fontSize={24}
          fontWeight={650}
          letterSpacing={1.5}
          color="#d8eaff"
          ribbonColor="#14263a"
          ribbonWidth={62}
        />
      </section>

      <section id="how-it-works" className="border-t border-white/8 bg-black/10 scroll-mt-8">
        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">From your GitHub to a professional portfolio.</h2>
            <p className="mt-3 text-sm text-zinc-500">Just your GitHub link. RepoFolio does the rest.</p>
          </div>
          <StepsJourney />
        </div>
      </section>

      <section className="landing-final-cta border-t border-white/8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-16 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">One useful portfolio first</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Make recruiters curious enough to click the project.</h2>
          </div>
          <a href="#generator" className="landing-bottom-cta">Build yours <ArrowRight size={16} /></a>
        </div>
      </section>

      <footer className="landing-footer" aria-labelledby="landing-footer-title">
        <div className="landing-footer-inner">
          <div className="landing-footer-signal" aria-hidden="true">
            <span className="landing-footer-signal-node" />
            <i />
            <span className="landing-footer-signal-node landing-footer-signal-node-active" />
            <i />
            <span className="landing-footer-signal-node" />
          </div>

          <div className="landing-footer-main">
            <div className="landing-footer-copy">
              <p className="landing-footer-kicker">GitHub profile / portfolio output</p>
              <h2 id="landing-footer-title">Make your GitHub<br /><span>worth clicking.</span></h2>
              <p className="landing-footer-description">RepoFolio uses your public GitHub profile to make a portfolio people want to open.</p>
            </div>
            <a href="#generator" className="landing-bottom-cta">Build yours <ArrowRight size={16} /></a>
          </div>

          <div className="landing-footer-wordmark" aria-hidden="true">REPOFOLIO</div>

          <div className="landing-footer-base">
            <nav className="landing-footer-links" aria-label="Footer navigation">
              <a href="#how-it-works">How it works <ArrowRight size={13} /></a>
            </nav>
            <p>© {new Date().getFullYear()} RepoFolio <span>·</span> Built from public GitHub data.</p>
          </div>
        </div>
      </footer>
      </main>
    </KineticGrid>
  )
}

const stepDetails = [
  {
    number: '01',
    title: 'Connect',
    description: 'Enter your GitHub username. RepoFolio fetches your public repositories, languages, and project data.',
  },
  {
    number: '02',
    title: 'Generate',
    description: 'RepoFolio organizes your GitHub data into a polished portfolio with your projects, skills, and profile information.',
  },
  {
    number: '03',
    title: 'Get your portfolio',
    description: 'Review, customize, and share your portfolio with recruiters, clients, or anyone you want.',
  },
]

function StepsJourney() {
  const [activeStep, setActiveStep] = useState(0)
  const [copied, setCopied] = useState(false)
  const laptopRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const journey = document.querySelector('.landing-flow')
    if (!journey) return undefined
    let frame = 0
    const updateScrollProgress = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
          const laptopBounds = laptopRef.current?.getBoundingClientRect()
          if (!laptopBounds) return
          const startAt = window.innerHeight * 0.72
          const endAt = window.innerHeight * 0.22
          const progress = Math.min(1, Math.max(0, (startAt - laptopBounds.top) / (startAt - endAt)))
        laptopRef.current?.style.setProperty('--portfolio-scroll', String(progress))
      })
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setActiveStep(0)
    }, { threshold: 0.35 })
    observer.observe(journey)
    window.addEventListener('scroll', updateScrollProgress, { passive: true })
    updateScrollProgress()
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', updateScrollProgress)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText('https://repofolio-ochre.vercel.app/username')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={`landing-flow landing-flow-active-${activeStep}`}>
      <svg className="landing-flow-route landing-flow-route-desktop" viewBox="0 0 1000 260" fill="none" aria-hidden="true">
        <path className="landing-route-base" d="M38 178 C178 178 185 80 322 80 S470 275 613 180 S815 178 962 178" />
        <path className="landing-route-progress" pathLength="1" d="M38 178 C178 178 185 80 322 80 S470 275 613 180 S815 178 962 178" />
        <circle className="landing-route-particle landing-route-particle-one" cx="0" cy="0" r="3" />
        <circle className="landing-route-particle landing-route-particle-two" cx="0" cy="0" r="2.5" />
      </svg>
      <svg className="landing-flow-route landing-flow-route-mobile" viewBox="0 0 100 900" fill="none" aria-hidden="true">
        <path className="landing-route-base" d="M50 30 C50 180 22 190 50 300 S78 470 50 600 S22 760 50 870" />
        <path className="landing-route-progress" pathLength="1" d="M50 30 C50 180 22 190 50 300 S78 470 50 600 S22 760 50 870" />
        <circle className="landing-route-particle landing-route-particle-one" cx="0" cy="0" r="3" />
        <circle className="landing-route-particle landing-route-particle-two" cx="0" cy="0" r="2.5" />
      </svg>

      <div className="landing-flow-visuals">
        <article className={`landing-flow-visual landing-flow-connect ${activeStep === 0 ? 'landing-flow-visual-active' : ''}`} tabIndex={0} onMouseEnter={() => setActiveStep(0)} onFocus={() => setActiveStep(0)}>
          <Github size={19} aria-hidden="true" />
          <div className="landing-connect-visual" aria-hidden="true">
            <div className="landing-github-mini-top"><span className="landing-github-avatar">M</span><strong>maya-chen</strong><small>Public profile</small></div>
            <div className="landing-github-mini-tabs"><span>Overview</span><b>Repositories</b><span>Projects</span><span>Packages</span></div>
            <div className="landing-github-repositories"><span><i className="landing-language-blue" /> weather-app <em>TypeScript</em><strong>›</strong></span><span><i className="landing-language-orange" /> expense-tracker <em>React</em><strong>›</strong></span><span><i className="landing-language-yellow" /> movie-search <em>JavaScript</em><strong>›</strong></span></div>
          </div>
          <div className="landing-flow-step-copy"><div className="landing-flow-copy-heading"><span>{stepDetails[0].number}</span><i /></div><h3>{stepDetails[0].title}</h3><p>{stepDetails[0].description}</p></div>
        </article>

        <article className={`landing-flow-visual landing-flow-generate ${activeStep === 1 ? 'landing-flow-visual-active' : ''}`} tabIndex={0} onMouseEnter={() => setActiveStep(1)} onFocus={() => setActiveStep(1)}>
          <SlidersHorizontal size={19} aria-hidden="true" />
          <div className="landing-processing-visual" aria-label="Repository processing preview">
            <div className="landing-generation-flow"><span>repositories</span><i /><span>languages</span><i /><span>profile</span></div>
            <div className="landing-generation-layout"><span /><span /><span /><span /></div>
            <div className="landing-generation-footer"><b>projects</b><b>skills</b><b>experience</b></div>
          </div>
          <div className="landing-generation-caption" aria-hidden="true"><span /> organizing your GitHub data</div>
          <div className="landing-flow-step-copy"><div className="landing-flow-copy-heading"><span>{stepDetails[1].number}</span><i /></div><h3>{stepDetails[1].title}</h3><p>{stepDetails[1].description}</p></div>
        </article>

        <article className={`landing-flow-visual landing-flow-result ${activeStep === 2 ? 'landing-flow-visual-active' : ''}`} tabIndex={0} onMouseEnter={() => setActiveStep(2)} onFocus={() => setActiveStep(2)}>
          <Send size={19} aria-hidden="true" />
          <div ref={laptopRef} className="landing-laptop-wrap">
            <div className="landing-laptop-screen">
              <div className="landing-laptop-browser"><span /><span /><span /><small>repofolio-ochre.vercel.app/maya-chen</small></div>
              <div className="landing-laptop-page">
                <header><small> MAYA CHEN / DEVELOPER</small><nav>Work&nbsp;&nbsp; About&nbsp;&nbsp; Contact</nav></header>
                <section className="landing-laptop-hero"><small>FULL-STACK DEVELOPER</small><strong>Hi, I'm Maya Chen.</strong><p>Building useful things for the web.</p><i /></section>
                <section className="landing-laptop-project-section"><small>SELECTED WORK</small><div><article><b>01</b><strong>Weather App</strong><span>React / TypeScript</span></article><article><b>02</b><strong>Expense Tracker</strong><span>React / PostgreSQL</span></article><article><b>03</b><strong>Movie Search</strong><span>JavaScript</span></article></div></section>
                <section className="landing-laptop-about"><small>ABOUT</small><p>A practical portfolio for showing the work behind the profile.</p></section>
              </div>
            </div>
            <div className="landing-laptop-base" />
          </div>
          <div className="landing-portfolio-actions"><span><Link2 size={12} /> Shareable portfolio link</span><button type="button" onClick={copyLink} aria-label="Copy portfolio link"><Copy size={12} /> {copied ? 'Copied' : 'Copy link'}</button></div>
          <div className="landing-flow-step-copy"><div className="landing-flow-copy-heading"><span>{stepDetails[2].number}</span><i /></div><h3>{stepDetails[2].title}</h3><p>{stepDetails[2].description}</p></div>
        </article>
      </div>
    </div>
  )
}

function ExamplePortfolio() {
  const nameParts = EXAMPLE_PORTFOLIO.name.split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ')

  return (
      <TiltedCard
        captionText={EXAMPLE_PORTFOLIO.name}
        className="landing-example-tilt mx-auto w-full max-w-2xl lg:ml-auto"
      >
        <a href="/example" aria-label="Open example RepoFolio portfolio" className="landing-example-card group relative">
          <div className="landing-browser-frame">
            <div className="flex items-center gap-1.5 border-b border-white/8 px-4 py-3.5 sm:px-5">
              <span className="size-2 rounded-full bg-white/15" />
              <span className="size-2 rounded-full bg-white/10" />
              <span className="size-2 rounded-full bg-white/10" />
              <span className="ml-3 truncate rounded-md bg-white/[0.04] px-3 py-1 text-[10px] text-zinc-600">repofolio-ochre.vercel.app/{EXAMPLE_PORTFOLIO.username}</span>
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-zinc-500 transition group-hover:text-zinc-300">View portfolio <ArrowRight size={11} /></span>
            </div>
            <div className="landing-example-preview">
              <div className="landing-preview-topline">
                <div className="landing-preview-kicker">{EXAMPLE_PORTFOLIO.hero.eyebrow} / {EXAMPLE_PORTFOLIO.location}</div>
                <span className="landing-preview-status"><i /> {EXAMPLE_PORTFOLIO.hero.status}</span>
              </div>
              <div className="landing-preview-heading">
                <div className="landing-preview-name"><span>{firstName}</span><span>{lastName}</span></div>
                <div className="landing-preview-profile">
                  <img src={EXAMPLE_PORTFOLIO.avatarUrl} alt={`${EXAMPLE_PORTFOLIO.name} profile`} />
                </div>
              </div>
              <div className="landing-preview-intro">
                <p>{EXAMPLE_PORTFOLIO.headline}</p>
                <span>01 / 04</span>
              </div>
              <div className="landing-preview-rule" />
              <div className="landing-preview-section-label">{EXAMPLE_PORTFOLIO.sections.projects.title}</div>
              <div className="landing-preview-projects">
                {EXAMPLE_PORTFOLIO.projects.slice(0, 3).map((project, index) => (
                  <div key={project.id}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{project.title}</strong>
                    <small>{project.description}</small>
                    <em>{project.language}</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </a>
      </TiltedCard>
  )
}

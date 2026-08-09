import { FormEvent, useState } from 'react'
import { ArrowRight, Check, Eye, Github, Sparkles, WandSparkles } from 'lucide-react'
import { normalizeGithubUsername } from '../lib/portfolio'
import { usePageMeta } from '../lib/seo'

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
    <main className="landing-shell min-h-screen overflow-hidden text-white">
      <a className="skip-link" href="#generator">Skip to generator</a>

      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
          <span className="landing-logo-mark"><WandSparkles size={16} /></span>
          RepoFolio
        </a>
        <div className="flex items-center gap-4 text-sm">
          <a href="#how-it-works" className="hidden text-zinc-500 transition hover:text-white sm:inline">How it works</a>
          <a href="/example" className="inline-flex items-center gap-2 text-zinc-300 transition hover:text-white"><Eye size={15} /> Example</a>
        </div>
      </nav>

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-5 pb-20 pt-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-20">
        <div className="max-w-2xl">
          <div className="landing-eyebrow"><Sparkles size={14} /> No signup · no setup · editable in seconds</div>
          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.75rem] lg:leading-[0.98]">
            Your GitHub already tells a story. Make it look worth opening.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-zinc-400 sm:text-xl">
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
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 text-xs uppercase tracking-[0.13em] text-zinc-600 sm:px-6 lg:px-8">
          <span>Built for</span>
          <span>Students</span>
          <span>Junior developers</span>
          <span>Recent graduates</span>
          <span>Freelancers</span>
          <span>Job seekers</span>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-white/8 bg-black/10 scroll-mt-8">
        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">Three steps</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">From GitHub profile to something you can actually send.</h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 md:grid-cols-3">
            {[
              ['01', 'Generate', 'Enter a username. RepoFolio ranks public repositories and builds the first version automatically.'],
              ['02', 'Curate', 'Choose the projects that matter, edit your story, add experience, and switch between three presentation styles.'],
              ['03', 'Send it', 'Review the clean final version, copy the share link, or export a portfolio PDF for applications.'],
            ].map(([number, title, body]) => (
              <article key={number} className="bg-[#0c0e11] p-6 sm:p-7">
                <span className="text-xs font-mono text-zinc-600">{number}</span>
                <h3 className="mt-10 text-lg font-medium text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{body}</p>
              </article>
            ))}
          </div>
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

      <footer className="border-t border-white/8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-7 text-xs text-zinc-700 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>RepoFolio · GitHub to developer portfolio.</span>
          <span>No account required for this version.</span>
        </div>
      </footer>
    </main>
  )
}

function ExamplePortfolio() {
  return (
    <a href="/example" aria-label="Open example RepoFolio portfolio" className="landing-example-card group relative mx-auto w-full max-w-2xl lg:ml-auto">
      <div className="landing-browser-frame">
        <div className="flex items-center gap-1.5 border-b border-white/8 px-4 py-3.5 sm:px-5">
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/10" />
          <span className="size-2 rounded-full bg-white/10" />
          <span className="ml-3 truncate rounded-md bg-white/[0.04] px-3 py-1 text-[10px] text-zinc-600">repofolio.dev/alex</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-zinc-500 transition group-hover:text-zinc-300">Open <ArrowRight size={11} /></span>
        </div>
        <div className="landing-example-preview">
          <div className="landing-preview-kicker">FULL-STACK DEVELOPER / BARCELONA</div>
          <div className="landing-preview-name"><span>ALEX</span><span>MORGAN</span></div>
          <div className="landing-preview-columns">
            <p>Building focused products for real people with TypeScript, React, Node.js, and Python.</p>
            <div className="landing-preview-profile"><span>AM</span></div>
          </div>
          <div className="landing-preview-rule" />
          <div className="landing-preview-projects">
            <div><span>01</span><strong>Realtime Board</strong><small>TypeScript / React / WebSockets</small></div>
            <div><span>02</span><strong>Deploy CLI</strong><small>Go / Docker / GitHub Actions</small></div>
            <div><span>03</span><strong>Open Notes</strong><small>React / TypeScript / IndexedDB</small></div>
          </div>
        </div>
      </div>
    </a>
  )
}

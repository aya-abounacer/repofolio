import { useEffect, useLayoutEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import type { PortfolioData } from '../../types'
import { VisibleNav } from './shared'
import '@fontsource-variable/geist'
import './refined.css'

/** Fit whole words to the actual text column, including embedded mobile previews. */
export function RefinedName({ name, font, className = '' }: { name: string; font: PortfolioData['appearance']['font']; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    const heading = ref.current
    if (!heading) return
    let frame = 0
    let disposed = false
    const fit = () => {
      if (disposed) return
      heading.style.removeProperty('--fitted-name-size')
      const available = heading.clientWidth - 2
      const widest = Math.max(1, ...Array.from(heading.querySelectorAll<HTMLElement>('.refined-name-word'), word => word.offsetWidth))
      if (available > 0 && widest > available) {
        heading.style.setProperty('--fitted-name-size', `${parseFloat(getComputedStyle(heading).fontSize) * available / widest}px`)
      }
    }
    const observer = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit) })
    observer.observe(heading)
    fit()
    void document.fonts.ready.then(fit)
    const loadingDone = () => fit()
    document.fonts.addEventListener('loadingdone', loadingDone)
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); document.fonts.removeEventListener('loadingdone', loadingDone) }
  }, [name, font])
  return <h1 ref={ref} className={`refined-name ${className}`} aria-label={name}>
    {name.trim().split(/\s+/).map((word, index) => <span key={`${index}-${word}`}><span className="refined-name-word" aria-hidden="true">{word}</span>{' '}</span>)}
  </h1>
}

export function RefinedNav({ data }: { data: PortfolioData }) {
  const links: [string, string][] = []
  if (data.sections.projects.visible) links.push(['projects', data.sections.projects.title])
  if (data.sections.about.visible) links.push(['about', data.sections.about.title])
  if (data.sections.skills.visible) links.push(['skills', data.sections.skills.title])
  for (const id of ['experience', 'education', 'certifications', 'achievements'] as const) {
    if (data.sections[id].visible) links.push([id, data.sections[id].title])
  }
  if (data.sections.contact.visible) links.push(['contact', 'Contact'])
  if (!links.length) return null
  return <>
    <div className="refined-desktop-nav"><VisibleNav data={data} links={links} /></div>
    <details className="refined-mobile-nav">
      <summary>Explore <ChevronDown size={15} aria-hidden="true" /></summary>
      <div onClick={event => {
        if ((event.target as HTMLElement).closest('a')) event.currentTarget.closest('details')?.removeAttribute('open')
      }}><VisibleNav data={data} links={links} /></div>
    </details>
  </>
}

export function useRefinedMotion(identity: string) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    let disposed = false
    let cleanup = () => {}
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (disposed) return
      gsap.registerPlugin(ScrollTrigger)
      let scroller: HTMLElement | undefined
      for (let parent = root.parentElement; parent; parent = parent.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight + 2) { scroller = parent; break }
      }
      const media = gsap.matchMedia()
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const context = gsap.context(() => {
          gsap.from('.refined-name-word', { y: 22, opacity: .2, duration: .95, stagger: .09, ease: 'power3.out', clearProps: 'transform,opacity' })
          gsap.utils.toArray<HTMLElement>('article').forEach(card => {
            gsap.from(card, { y: 20, duration: .7, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: card, scroller, start: 'top 94%', once: true } })
          })
          gsap.utils.toArray<HTMLElement>('.refined-portrait').forEach(photo => {
            gsap.fromTo(photo, { scale: .94 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: photo, scroller, start: 'top 95%', end: 'center 40%', scrub: .7 } })
          })
        }, root)
        return () => context.revert()
      })
      cleanup = () => media.revert()
    }).catch(() => undefined)
    return () => { disposed = true; cleanup() }
  }, [identity])
  return ref
}

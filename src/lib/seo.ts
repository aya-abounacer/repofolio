import { useEffect } from 'react'

export interface PageMeta {
  title: string
  description: string
  path?: string
  image?: string
  themeColor?: string
  robots?: string
}

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.content = content
}

function setCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = url
}

export function applyPageMeta({ title, description, path = window.location.pathname, image = '/og-preview.png', themeColor = '#0b0d10', robots = 'index,follow' }: PageMeta) {
  const canonicalUrl = new URL(path, window.location.origin).toString()
  const imageUrl = new URL(image, window.location.origin).toString()

  document.title = title
  setMeta('meta[name="description"]', 'name', 'description', description)
  setMeta('meta[name="theme-color"]', 'name', 'theme-color', themeColor)
  setMeta('meta[name="robots"]', 'name', 'robots', robots)
  setMeta('meta[property="og:title"]', 'property', 'og:title', title)
  setMeta('meta[property="og:description"]', 'property', 'og:description', description)
  setMeta('meta[property="og:type"]', 'property', 'og:type', 'website')
  setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl)
  setMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl)
  setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image')
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
  setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl)
  setCanonical(canonicalUrl)
}

export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    applyPageMeta(meta)
  }, [meta.title, meta.description, meta.path, meta.image, meta.themeColor, meta.robots])
}

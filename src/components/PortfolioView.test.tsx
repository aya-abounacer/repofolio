import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createPortfolioData } from '../lib/portfolio'
import type { GitHubRepo, GitHubUser, PortfolioTemplate } from '../types'
import { PortfolioView } from './PortfolioView'

const user: GitHubUser = {
  login: 'dev', avatar_url: 'avatar.jpg', html_url: 'https://github.com/dev', name: 'Dev User', bio: 'Builder', location: 'Morocco', blog: '', email: 'dev@example.com', public_repos: 1, followers: 0, following: 0,
}
const repos: GitHubRepo[] = [{ id: 1, name: 'project', description: 'A project', html_url: 'https://github.com/dev/project', homepage: 'https://demo.example.com', language: 'TypeScript', stargazers_count: 3, forks_count: 1, fork: false, archived: false, pushed_at: '2026-08-01T00:00:00Z', topics: ['react'] }]

describe('PortfolioView templates', () => {
  it.each([['#ed996f', '#000000'], ['#000000', '#ffffff'], ['#ffffff', '#000000'], ['#222266', '#ffffff']])('keeps Studio featured text readable with accent %s', (accent, ink) => {
    const data = createPortfolioData(user, repos)
    data.appearance = { template: 'studio', mode: 'dark', accent, font: 'sans' }
    const html = renderToStaticMarkup(<PortfolioView data={data} />)
    expect(html).toContain(`--workshop-feature-ink:${ink}`)
    expect(html).toContain(`--portfolio-accent:${accent}`)
    expect(html).toContain('workshop-project-featured')
  })
  for (const template of ['minimal', 'modern', 'creative', 'editorial', 'studio', 'technical', 'brutalist'] as PortfolioTemplate[]) {
    it(`renders the ${template} presentation from the same portfolio model`, () => {
      const data = createPortfolioData(user, repos)
      data.appearance.template = template
      const html = renderToStaticMarkup(<PortfolioView data={data} />)
      expect(html).toContain(`${template}-template`)
      expect(html).toContain('Dev User')
      expect(html).toContain('project')
      expect(html).toContain('dev%40example.com')
      expect(html).toContain('Live demo')
    })
  }

  it.each(['editorial', 'studio', 'technical'] as const)('puts selected work first in %s, preserves project order and includes every selection', (template) => {
    const data = createPortfolioData(user, repos)
    data.appearance.template = template
    data.sections.about = { visible: true, title: 'About my work', text: 'My approach to building software.' }
    data.projects = Array.from({ length: 7 }, (_, index) => ({
      ...data.projects[0], id: index + 1, title: `Work ${index + 1}`, featured: index === 2, selected: index !== 1,
    }))
    const originalProjects = JSON.stringify(data.projects)
    const html = renderToStaticMarkup(<PortfolioView data={data} />)
    expect(html.indexOf('id="projects"')).toBeLessThan(html.indexOf('id="about"'))
    expect(html.indexOf('Work 3')).toBeLessThan(html.indexOf('Work 1'))
    expect(html.indexOf('Work 1')).toBeLessThan(html.indexOf('Work 4'))
    expect(html).not.toContain('Work 2')
    expect(html).toContain('Work 7')
    if (template === 'technical') expect(html.match(/aria-pressed="(?:true|false)"/g)).toHaveLength(6)
    else expect(html.match(/<article /g)).toHaveLength(6)
    expect(JSON.stringify(data.projects)).toBe(originalProjects)
  })

  it('omits empty sections and their navigation without publishing editor instructions', () => {
    const data = createPortfolioData(user, [])
    data.appearance.template = 'editorial'
    data.sections.about = { visible: true, title: 'About', text: '  ' }
    data.skills = []
    data.sections.experience.visible = true
    data.sections.experience.items = [{ id: 'empty', title: '', subtitle: '', meta: '', description: '' }]
    data.sections.education.visible = true
    data.sections.education.items = [{ id: 'degree', title: 'Computer science', subtitle: 'University', meta: '2024', description: 'Software engineering.' }]
    data.sections.contact.visible = false
    const html = renderToStaticMarkup(<PortfolioView data={data} />)
    for (const id of ['projects', 'about', 'skills', 'experience', 'contact']) {
      expect(html).not.toContain(`id="${id}"`)
      expect(html).not.toContain(`href="#${id}"`)
    }
    expect(html).toContain('id="education"')
    expect(html).toContain('href="#education"')
    expect(html).toContain('Computer science')
    expect(html).not.toContain('Add entries')
    expect(html).not.toContain('Select at least one')
  })

  it.each(['editorial', 'studio', 'technical'] as const)('respects image, availability, appearance and optional section controls in %s', (template) => {
    const data = createPortfolioData(user, repos)
    data.appearance = { template, mode: 'light', accent: '#ff6b6b', font: 'editorial' }
    data.hero.showImage = false
    data.hero.status = 'Open to work'
    data.hero.showStatus = true
    data.hero.availabilityConfirmed = false
    data.sections.projects.visible = false
    let html = renderToStaticMarkup(<PortfolioView data={data} />)
    expect(html).toContain('portfolio-mode-light')
    expect(html).toContain('portfolio-font-editorial')
    expect(html).toContain('--portfolio-accent:#ff6b6b')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('Open to work')
    expect(html).not.toContain('id="projects"')
    data.hero.showImage = true
    data.hero.availabilityConfirmed = true
    html = renderToStaticMarkup(<PortfolioView data={data} />)
    expect(html).toContain('src="avatar.jpg"')
    expect(html).toContain('Open to work')
    if (template === 'editorial') expect(html).toContain('<summary>Contents')
  })

  it('omits empty Studio content, preserves real timeline entries and never invents featured work', () => {
    const data = createPortfolioData(user, repos)
    data.appearance.template = 'studio'
    data.projects[0].featured = false
    data.projects[0].description = ''
    data.projects[0].homepage = ''
    data.sections.about = { visible: true, title: 'About', text: '  ' }
    data.skills = ['  ']
    data.sections.experience.visible = true
    data.sections.experience.items = [{ id: 'empty', title: '', subtitle: '', meta: '', description: '' }]
    data.sections.education.visible = true
    data.sections.education.items = [{ id: 'degree', title: 'Computer science', subtitle: 'University', meta: '2024', description: 'Software engineering.' }]
    data.sections.contact.visible = false
    const html = renderToStaticMarkup(<PortfolioView data={data} />)
    for (const id of ['about', 'skills', 'experience', 'contact']) {
      expect(html).not.toContain(`id="${id}"`)
      expect(html).not.toContain(`href="#${id}"`)
    }
    expect(html).toContain('Computer science')
    expect(html).toContain('2024')
    expect(html).toContain('href="https://github.com/dev/project"')
    expect(html).not.toContain('Featured project')
    expect(html).not.toContain('Live demo')
    expect(html).not.toContain('Add entries')
    expect(html).not.toContain('Add a short description')
  })

  it('shows only real engineering metadata in Technical projects', () => {
    const data = createPortfolioData(user, repos)
    data.appearance.template = 'technical'
    data.projects[0].homepage = ''
    data.projects[0].stars = 0
    data.projects[0].forks = 0
    const html = renderToStaticMarkup(<PortfolioView data={data} />)
    expect(html).toContain('Primary')
    expect(html).toContain('Stack')
    expect(html).not.toContain('Live link available')
    expect(html).not.toContain('<dt>Stars</dt>')
    expect(html).not.toContain('<dt>Forks</dt>')
    expect(html).not.toContain('<dt>Role</dt>')
    expect(html).not.toContain('<dt>Year</dt>')
    expect(html).not.toContain('<dt>Status</dt>')
  })

  it('removes Technical location UI when the profile has no location', () => {
    const data = createPortfolioData({ ...user, location: null }, repos)
    data.appearance.template = 'technical'
    const html = renderToStaticMarkup(<PortfolioView data={data} />)
    expect(html).toContain('technical-editor-tabs')
    expect(html).toContain('floating-3d-particles')
    expect(html).toContain('folder-float')
    expect(html).not.toContain('<dt>Location</dt>')
    expect(html).not.toContain('technical-index-meta')
  })
})

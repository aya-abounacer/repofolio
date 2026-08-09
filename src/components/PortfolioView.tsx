import type { CSSProperties } from 'react'
import type { PortfolioData } from '../types'
import { CreativeTemplate } from './templates/CreativeTemplate'
import { MinimalTemplate } from './templates/MinimalTemplate'
import { ModernTemplate } from './templates/ModernTemplate'

interface PortfolioViewProps {
  data: PortfolioData
  embedded?: boolean
}

export function PortfolioView({ data, embedded = false }: PortfolioViewProps) {
  const style = { '--portfolio-accent': data.appearance.accent } as CSSProperties
  const className = [
    'portfolio-root',
    `portfolio-mode-${data.appearance.mode}`,
    `portfolio-font-${data.appearance.font}`,
    embedded ? 'portfolio-embedded' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={className} style={style} data-template={data.appearance.template}>
      {!embedded ? <a className="skip-link" href="#top">Skip to portfolio content</a> : null}
      {data.appearance.template === 'minimal' ? <MinimalTemplate data={data} /> : null}
      {data.appearance.template === 'modern' ? <ModernTemplate data={data} /> : null}
      {data.appearance.template === 'creative' ? <CreativeTemplate data={data} /> : null}
    </div>
  )
}

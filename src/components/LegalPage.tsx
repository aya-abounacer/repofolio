import { ArrowLeft, Mail } from 'lucide-react'
import { usePageMeta } from '../lib/seo'

type LegalPageKind = 'privacy' | 'terms' | 'contact'

const CONTACT_EMAIL = 'ayaabounacer1@gmail.com'

export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const content = {
    privacy: {
      title: 'Privacy policy — RepoFolio',
      description: 'How RepoFolio handles GitHub profile data, drafts, sessions, shared portfolios, and profile photos.',
      heading: 'Privacy policy',
    },
    terms: {
      title: 'Terms of use — RepoFolio',
      description: 'The terms for using RepoFolio to generate, edit, preview, and share developer portfolios.',
      heading: 'Terms of use',
    },
    contact: {
      title: 'Contact RepoFolio',
      description: 'Contact Aya Abounacer about RepoFolio support, privacy requests, and content reports.',
      heading: 'Contact RepoFolio',
    },
  }[kind]

  usePageMeta({ title: content.title, description: content.description, path: `/${kind}` })

  return (
    <main className="legal-page">
      <div className="legal-page-inner">
        <a href="/" className="legal-back-link"><ArrowLeft size={15} /> RepoFolio</a>
        <header className="legal-page-header">
          <p className="legal-kicker">RepoFolio · Aya Abounacer · Morocco</p>
          <h1>{content.heading}</h1>
          <p className="legal-updated">Last updated: November 6, 2026</p>
        </header>

        {kind === 'privacy' ? <PrivacyContent /> : null}
        {kind === 'terms' ? <TermsContent /> : null}
        {kind === 'contact' ? <ContactContent /> : null}

        <footer className="legal-page-footer">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/contact">Contact</a>
          <span>© {new Date().getFullYear()} RepoFolio</span>
        </footer>
      </div>
    </main>
  )
}

function PrivacyContent() {
  return (
    <div className="legal-prose">
      <p>RepoFolio is operated by Aya Abounacer as an individual from Morocco. This policy explains how the current RepoFolio application handles information when you use the website.</p>

      <h2>Information RepoFolio handles</h2>
      <p><strong>GitHub profile and repository data.</strong> When you enter a public GitHub username or profile URL, RepoFolio requests public profile, repository, language, and project information from GitHub. RepoFolio does not request or access private repositories through this application.</p>
      <p><strong>Local drafts.</strong> Your edits are saved in your browser&apos;s local storage under a username-specific key. These drafts remain on that device and are not sent to RepoFolio unless you use a sharing or upload feature.</p>
      <p><strong>Sessions and shared portfolios.</strong> Sharing and profile-photo features use an anonymous browser session. The server may store a session identifier, IP address, user-agent string, and country information supplied by the hosting platform. When you select Copy link, the selected portfolio snapshot is stored so that anyone with its link can view it until you unpublish it.</p>
      <p><strong>Profile photos.</strong> If you upload a photo, RepoFolio stores the processed image in private Vercel Blob storage and keeps the reference needed to display it to you or to an active shared portfolio. You can delete uploaded photos from the browser session that created them.</p>

      <h2>Why this information is used</h2>
      <p>RepoFolio uses this information to generate portfolios, preserve local edits, create requested shared links, authenticate access to your own saved items, and provide requested profile-photo functionality. The current website does not use advertising, analytics, or an AdSense script.</p>

      <h2>Third-party services</h2>
      <p>The current application communicates with GitHub for public profile data and uses Vercel hosting, Vercel serverless functions, Vercel Blob storage, and PostgreSQL storage for server-backed features. Those providers process information according to their own terms and privacy policies.</p>

      <h2>Cookies and browser storage</h2>
      <p>RepoFolio uses a browser session cookie for requested server-backed features and local storage for drafts. The current application does not set advertising cookies. If advertising is introduced later, this policy will be updated and a compliant consent mechanism will be implemented before applicable advertising storage or personalized advertising is used.</p>

      <h2>Sharing and deletion</h2>
      <p>A shared portfolio is public to anyone who has its link. You can use the editor&apos;s published-links controls to unpublish links created in the current browser session. Clearing browser data or changing devices can remove access to session-owned management controls. Contact us if you need help with a privacy or removal request.</p>

      <h2>Contact</h2>
      <p>For privacy questions or requests, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. RepoFolio is currently operated from Morocco, and privacy requests are handled by the individual operator.</p>
    </div>
  )
}

function TermsContent() {
  return (
    <div className="legal-prose">
      <p>These terms apply to your use of RepoFolio, which is operated by Aya Abounacer as an individual from Morocco.</p>

      <h2>The service</h2>
      <p>RepoFolio generates editable developer portfolios from public GitHub data. The service includes local editing, previews, PDF printing, optional shared snapshots, and optional profile-photo uploads. Features may change, be unavailable, or be removed as the product develops.</p>

      <h2>Your content and links</h2>
      <p>You are responsible for the text, images, links, and other information that you add or publish. Do not upload or publish content that you do not have permission to use, that impersonates another person, that violates another person&apos;s rights, or that is unlawful, abusive, deceptive, or harmful.</p>
      <p>Only publish a portfolio link when you understand that anyone who receives the link may view the shared snapshot. You are responsible for checking the accuracy of generated and edited content before sharing it.</p>

      <h2>GitHub data</h2>
      <p>RepoFolio uses public GitHub data and is not affiliated with or endorsed by GitHub. GitHub content remains subject to GitHub&apos;s terms and the rights of its respective owners.</p>

      <h2>Availability and limitations</h2>
      <p>RepoFolio is provided on an as-available basis. GitHub rate limits, hosting outages, browser storage restrictions, network failures, and other third-party issues can prevent generation or sharing. Do not rely on RepoFolio as the only copy of your portfolio content.</p>

      <h2>Reports and removal</h2>
      <p>To report copyright concerns, impersonation, unlawful content, or a portfolio that should be removed, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the relevant URL and a description of the issue. We may restrict or remove content when appropriate.</p>

      <h2>Changes and contact</h2>
      <p>These terms may be updated as RepoFolio changes. The date at the top indicates when this page was last updated. Questions can be sent to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </div>
  )
}

function ContactContent() {
  return (
    <div className="legal-prose">
      <p>RepoFolio is operated by Aya Abounacer as an individual from Morocco.</p>
      <p>For support, privacy requests, copyright concerns, content reports, or questions about a shared portfolio, email:</p>
      <p className="legal-contact-card"><Mail size={18} /><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
      <p>Please include the relevant RepoFolio URL, GitHub username, or shared portfolio link when it helps explain the request. Do not send passwords, private keys, or other sensitive credentials by email.</p>
    </div>
  )
}

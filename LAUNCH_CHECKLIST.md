# RepoFolio launch checklist

## Before deploy

- [ ] `npm run check` passes locally
- [ ] Generate portfolios for a valid GitHub user, an invalid username, a zero-repository user, and a repository-heavy user
- [ ] Refresh the studio and confirm the local draft restores
- [ ] Reset to GitHub and confirm the draft is discarded
- [ ] Open Minimal, Modern, and Creative on desktop and mobile preview
- [ ] Open `/example` directly in a fresh tab
- [ ] Copy a portfolio link and open it in a private/incognito window
- [ ] Export a dark and light portfolio to PDF
- [ ] In Chrome PDF settings, turn off **Headers and footers** if the browser URL/date are shown

## Vercel

- [ ] Push the repository to GitHub
- [ ] Import it in Vercel
- [ ] Confirm framework preset: Vite
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Add the production domain
- [ ] Verify direct navigation to `/example`, `/studio/<username>`, and `/portfolio/<username>?data=...`

## Public polish

- [ ] Confirm favicon loads
- [ ] Confirm `/og-preview.png` is publicly reachable
- [ ] Paste the production homepage into a social-preview debugger before announcing the launch
- [ ] Test the landing page on a real phone
- [ ] Test keyboard-only navigation through the generator and editor header
- [ ] Confirm the **Made with RepoFolio** footer returns to the production homepage

## First-user test

Ask 10–20 developers to complete one task without guidance:

> Create a portfolio you would be willing to put on a CV or LinkedIn profile.

Track manually for the first test:

- Did they finish generation?
- Did they edit anything?
- Which template did they choose?
- Did they open Final preview?
- Did they copy the link or export the PDF?
- What stopped them from sharing it?

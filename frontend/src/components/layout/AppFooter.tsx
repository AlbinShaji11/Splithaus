import LogoMark from './LogoMark'

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-accent'

function GH() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  )
}

export default function AppFooter() {
  return (
    <footer role="contentinfo" className="border-t border-rule bg-paper py-10 text-[13px] text-ink-2">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-8">
        <div className="flex items-center gap-3">
          <a href="/" aria-label="SplitHaus home"
            className={`flex items-center gap-2 font-display text-[17px] font-semibold tracking-tight text-ink ${FOCUS}`}>
            <LogoMark />
            SplitHaus
          </a>
          <span className="text-ink-3" aria-hidden="true">·</span>
          <span>The smartest way to split share house expenses.</span>
        </div>
        <nav className="flex items-center gap-6" aria-label="Footer">
          <a href="#" className={`inline-flex min-h-[44px] items-center transition hover:text-ink ${FOCUS}`}>
            Built by <span className="ml-1 font-medium text-ink">Albin Shaji</span>
          </a>
          <a href="https://github.com/AlbinShaji11/Splithaus"
            className={`inline-flex min-h-[44px] items-center gap-1.5 transition hover:text-ink ${FOCUS}`}>
            <GH /><span className="ml-1">GitHub</span>
          </a>
        </nav>
      </div>
    </footer>
  )
}

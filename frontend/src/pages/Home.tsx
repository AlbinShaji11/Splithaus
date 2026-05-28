// frontend/src/pages/Home.tsx
import { useState, useEffect, useCallback, type FC, type ReactNode, type CSSProperties } from 'react';
import SharedLogoMark from '../components/layout/LogoMark';
import AppFooter from '../components/layout/AppFooter';

/* ─── Focus ring ────────────────────────────────────────────────── */
const FOCUS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-[var(--primary)] focus-visible:ring-offset-paper';

/* ─── Inline-style helpers ──────────────────────────────────────── */
const primaryBg: CSSProperties = {
  background: 'var(--primary)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 6px 20px var(--primary-glow)',
};

const gradientText: CSSProperties = {
  background: 'linear-gradient(120deg, var(--primary), #C84B31)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

/* ─── SVG icons ─────────────────────────────────────────────────── */
const Arrow: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);
const MoonIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const SunIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);
const CameraIcon: FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const UsersIcon: FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <circle cx="17" cy="7" r="3" /><path d="M21 21v-1a3 3 0 0 0-2-2.83" />
  </svg>
);
const ShareIcon: FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);
const GlobeIcon: FC = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" />
  </svg>
);
const ChevronDown: FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/* ─── Logo mark ─────────────────────────────────────────────────── */
const LogoMark: FC = () => <SharedLogoMark />;

/* ─── Navbar ────────────────────────────────────────────────────── */
interface NavProps {
  dark: boolean;
  onToggle: () => void;
}
const Navbar: FC<NavProps> = ({ dark, onToggle }) => (
  <header
    className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-rule px-8"
    role="banner"
    style={{
      background: 'color-mix(in oklab, #FAF7F1 80%, transparent)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    }}
  >
    <div className="flex items-center gap-8">
      <a
        href="/"
        aria-label="SplitHaus home"
        className={'flex items-center gap-2 font-display font-semibold text-[17px] tracking-tight text-ink ' + FOCUS}
      >
        <LogoMark />
        SplitHaus
      </a>
      <nav className="hidden items-center gap-6 text-[14px] text-ink-2 sm:flex" aria-label="Primary">
        <a href="/split"         className={'transition-colors hover:text-ink ' + FOCUS}>Split a receipt</a>
        <a href="/history"       className={'transition-colors hover:text-ink ' + FOCUS}>History</a>
        <a href="/how-it-works"  className={'transition-colors hover:text-ink ' + FOCUS}>How it works</a>
      </nav>
    </div>

    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={'inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-2 transition-all hover:bg-card hover:text-ink ' + FOCUS}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>
      <a
        href="/split"
        className={'inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-[13px] font-semibold text-white transition-all hover:brightness-110 hover:-translate-y-px active:translate-y-0 ' + FOCUS}
        style={primaryBg}
      >
        Try it now
      </a>
    </div>
  </header>
);

/* ─── Person avatar ─────────────────────────────────────────────── */
type PersonVar = '--p1' | '--p2' | '--p3' | '--p4';

interface AvatarProps {
  pVar: PersonVar;
  initial: string;
  size?: 'sm' | 'md' | 'lg';
  offset?: boolean;
}
const Avatar: FC<AvatarProps> = ({ pVar, initial, size = 'md', offset = false }) => {
  const sizeCls =
    size === 'sm' ? 'h-[22px] w-[22px] text-[10px]' :
    size === 'lg' ? 'h-10 w-10 text-[14px]' :
    'h-7 w-7 text-[12px]';
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white ${sizeCls} ${offset ? '-ml-2' : ''}`}
      style={{ background: `var(${pVar})`, boxShadow: '0 0 0 2px #FAF7F1' }}
    >
      {initial}
    </span>
  );
};

/* ─── Split pill (mock UI) ──────────────────────────────────────── */
type PillVariant = 'everyone' | 'solo1' | 'solo2' | 'subset';

interface SplitPillProps {
  variant: PillVariant;
  label: string;
}
const SplitPill: FC<SplitPillProps> = ({ variant, label }) => {
  const base = 'inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-full border text-[11.5px] cursor-default';
  const styles: Record<PillVariant, string> = {
    everyone: 'border-rule bg-card-2 text-ink-2',
    solo1:    'border-[color-mix(in_oklab,var(--p2)_30%,transparent)] bg-[color-mix(in_oklab,var(--p2)_18%,transparent)] text-ink',
    solo2:    'border-[color-mix(in_oklab,var(--p3)_30%,transparent)] bg-[color-mix(in_oklab,var(--p3)_18%,transparent)] text-ink',
    subset:   'border-[color-mix(in_oklab,var(--p4)_30%,transparent)] bg-[color-mix(in_oklab,var(--p4)_18%,transparent)] text-ink',
  };
  return (
    <span className={`${base} ${styles[variant]}`}>
      {variant === 'everyone' && <GlobeIcon />}
      {variant === 'solo1' && (
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-semibold text-white"
              style={{ background: 'var(--p2)' }}>S</span>
      )}
      {variant === 'solo2' && (
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-semibold text-white"
              style={{ background: 'var(--p3)' }}>M</span>
      )}
      {variant === 'subset' && (
        <span className="inline-flex">
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-semibold text-white"
                style={{ background: 'var(--p1)', marginRight: '-3px' }}>A</span>
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-semibold text-white"
                style={{ background: 'var(--p4)' }}>J</span>
        </span>
      )}
      {label}
    </span>
  );
};

/* ─── Browser mockup ────────────────────────────────────────────── */
const BrowserMockup: FC = () => (
  <div className="relative z-10 mx-auto mt-16 max-w-[1040px] px-6">
    <div
      className="overflow-hidden rounded-lg border border-rule bg-card"
      style={{
        boxShadow: '0 30px 72px rgba(30,25,20,0.14), 0 6px 16px rgba(30,25,20,0.06), 0 0 0 1px #E9E3D6',
        transform: 'perspective(1800px) rotateX(2deg)',
      }}
    >
      {/* Browser chrome */}
      <div className="flex h-[38px] items-center gap-2 border-b border-rule bg-paper-2 px-3.5">
        <span className="inline-flex gap-1.5">
          <i className="block h-2.5 w-2.5 rounded-full bg-rule-strong not-italic" />
          <i className="block h-2.5 w-2.5 rounded-full bg-rule-strong not-italic" />
          <i className="block h-2.5 w-2.5 rounded-full bg-rule-strong not-italic" />
        </span>
        <span className="ml-3 flex h-[22px] max-w-[380px] flex-1 items-center gap-1.5 rounded-full bg-paper-2 px-3 font-mono text-[11.5px] text-ink-2">
          <span className="text-[9px] opacity-70">🔒</span>
          splithaus.app/split
        </span>
      </div>

      {/* Two-column body */}
      <div className="grid min-h-[460px] grid-cols-[1.4fr_1fr] bg-paper max-[860px]:grid-cols-1">
        {/* Left — receipt */}
        <div className="border-r border-rule p-6">
          <div className="mb-[18px] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg font-display text-[14px] font-bold text-white"
                   style={{ background: 'linear-gradient(135deg, #00a651, #008543)' }}>
                W
              </div>
              <div>
                <p className="font-display text-[15px] font-semibold tracking-tight text-ink">Woolworths Carlton</p>
                <p className="text-[11.5px] text-ink-2">Sat 24 May · 11:42</p>
              </div>
            </div>
            <span className="inline-flex h-7 items-center rounded-full border border-rule bg-card px-3 font-mono text-[11px] text-ink-2">
              42 items
            </span>
          </div>

          {/* People bar */}
          <div className="mb-[18px] flex items-center gap-2.5 rounded-md border border-rule bg-card px-3.5 py-3">
            <span className="inline-flex">
              <Avatar pVar="--p1" initial="A" size="sm" />
              <Avatar pVar="--p2" initial="S" size="sm" offset />
              <Avatar pVar="--p3" initial="M" size="sm" offset />
              <Avatar pVar="--p4" initial="J" size="sm" offset />
            </span>
            <span className="flex-1 text-[12.5px] text-ink-2">Albin · Sarah · Mei · Jay</span>
            <button type="button" className={`h-6 rounded-xs px-2 text-[11px] text-ink-2 hover:bg-paper-2 ${FOCUS}`}>+ Add</button>
          </div>

          {/* Items */}
          <div className="flex flex-col gap-1">
            {([
              { name: 'Full cream milk 2L',      pill: 'everyone' as PillVariant, pillLabel: 'Everyone', price: '$4.20' },
              { name: 'Tim Tams (Chewy Caramel)', pill: 'solo1'    as PillVariant, pillLabel: 'Sarah',    price: '$5.50' },
              { name: 'Avocados ×3',              pill: 'everyone' as PillVariant, pillLabel: 'Everyone', price: '$8.97' },
              { name: 'Oat milk barista',         pill: 'solo2'    as PillVariant, pillLabel: 'Mei',      price: '$6.00' },
              { name: 'Coopers Pale Ale ×6',      pill: 'subset'   as PillVariant, pillLabel: 'Albin, Jay', price: '$22.00' },
              { name: 'Pasta sauce',              pill: 'everyone' as PillVariant, pillLabel: 'Everyone', price: '$3.80' },
            ] as const).map((item) => (
              <div key={item.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-sm px-3 py-2.5 transition-colors hover:bg-card">
                <span className="text-[13.5px] text-ink">{item.name}</span>
                <SplitPill variant={item.pill} label={item.pillLabel} />
                <span className="min-w-[48px] text-right font-mono text-[13px] tabular-nums text-ink">{item.price}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 flex flex-col gap-1.5 border-t border-dashed border-rule pt-3.5 text-[12.5px]">
            <div className="flex justify-between text-ink-2"><span>Subtotal</span><span className="font-mono">$87.42</span></div>
            <div className="flex justify-between text-ink-2"><span>GST</span><span className="font-mono">$2.85</span></div>
            <div className="flex justify-between pt-1.5 font-display text-[16px] font-semibold text-ink">
              <span>Total</span><span className="font-mono">$90.27</span>
            </div>
          </div>
        </div>

        {/* Right — summary */}
        <div className="bg-paper-2 p-6">
          <h4 className="mb-3.5 font-mono text-[11px] font-medium uppercase tracking-wider text-ink-2">Who owes what</h4>
          {([
            { pVar: '--p1' as PersonVar, initial: 'A', name: 'Albin',  amt: '$24.40' },
            { pVar: '--p2' as PersonVar, initial: 'S', name: 'Sarah',  amt: '$26.92' },
            { pVar: '--p3' as PersonVar, initial: 'M', name: 'Mei',    amt: '$24.95' },
            { pVar: '--p4' as PersonVar, initial: 'J', name: 'Jay',    amt: '$14.00' },
          ]).map((p) => (
            <div key={p.name} className="flex items-center gap-3 border-b border-rule py-3 last:border-b-0">
              <Avatar pVar={p.pVar} initial={p.initial} />
              <span className="flex-1 text-[14px] text-ink">{p.name}</span>
              <span className="font-mono text-[15px] font-medium tabular-nums text-ink">{p.amt}</span>
            </div>
          ))}

          <div className="mt-5 flex flex-col gap-2.5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-2">Who paid?</p>
            <button type="button" className={`flex w-full items-center justify-between rounded-sm border border-rule-strong bg-card px-3 py-2 text-[13px] text-ink hover:bg-paper-2 transition-colors ${FOCUS}`}>
              <span className="flex items-center gap-2">
                <Avatar pVar="--p1" initial="A" size="sm" />
                Albin paid
              </span>
              <ChevronDown />
            </button>
            <button
              type="button"
              className={`mt-1 w-full rounded-sm py-2.5 text-[14px] font-semibold text-white transition-all hover:brightness-110 ${FOCUS}`}
              style={primaryBg}
            >
              Calculate settlements
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Hero ──────────────────────────────────────────────────────── */
const Hero: FC = () => (
  <section className="relative overflow-hidden pb-16 pt-24 text-center" aria-labelledby="hero-heading">
    {/* Gradient blobs */}
    <div
      className="pointer-events-none absolute inset-0 z-0"
      aria-hidden="true"
      style={{
        background:
          'radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 70%),' +
          'radial-gradient(40% 30% at 85% 30%, color-mix(in oklab, #C84B31 12%, transparent) 0%, transparent 70%)',
      }}
    />
    {/* Subtle grid */}
    <div
      className="pointer-events-none absolute inset-0 z-0 opacity-35"
      aria-hidden="true"
      style={{
        backgroundImage:
          'linear-gradient(to right, #E9E3D6 1px, transparent 1px),' +
          'linear-gradient(to bottom, #E9E3D6 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, black 30%, transparent 75%)',
      }}
    />

    <div className="relative z-10 mx-auto max-w-[880px] px-6">
      {/* Eyebrow pill */}
      <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-rule bg-card/70 px-3.5 py-0 text-[12.5px] text-ink-2"
           style={{ height: '30px', backdropFilter: 'blur(8px)' }}>
        <span className="h-1.5 w-1.5 rounded-full bg-accent" style={{ boxShadow: '0 0 8px #C84B31' }} aria-hidden="true" />
        Built for Australian share houses
      </div>

      {/* Headline */}
      <h1
        id="hero-heading"
        className="mb-6 font-display text-[clamp(40px,7vw,76px)] font-semibold leading-[1.02] tracking-display text-ink"
      >
        Scan the receipt.<br />
        <span style={gradientText}>Split it in seconds.</span>
      </h1>

      <p className="mx-auto mb-9 max-w-[560px] text-[clamp(16px,1.6vw,19px)] leading-[1.6] text-ink-2">
        SplitHaus reads your receipts, lets you tag who got what, and tells everyone
        exactly how much they owe. No accounts, no math, no group-chat drama.
      </p>

      {/* CTA row */}
      <div className="inline-flex flex-wrap justify-center gap-3">
        <a
          href="/split"
          className={'inline-flex h-[52px] items-center gap-2 rounded-md px-7 text-[15px] font-semibold text-white transition-all hover:-translate-y-px hover:brightness-108 active:translate-y-0 ' + FOCUS}
          style={primaryBg}
        >
          Split a receipt <Arrow />
        </a>
        <a
          href="/how-it-works"
          className={'inline-flex h-[52px] items-center gap-2 rounded-md border border-rule-strong bg-card px-7 text-[15px] font-medium text-ink transition-colors hover:bg-paper-2 ' + FOCUS}
        >
          See how it works
        </a>
      </div>

    </div>

    <BrowserMockup />
  </section>
);

/* ─── Proof bar ─────────────────────────────────────────────────── */
interface StoreEntry {
  readonly name: string;
  readonly color: string;
}
const STORES: readonly StoreEntry[] = [
  { name: 'Woolworths', color: '#00a651' },
  { name: 'Coles',      color: '#e0001b' },
  { name: 'Kmart',      color: '#e1251b' },
  { name: 'Costco',     color: '#005daa' },
] as const;

const ProofBar: FC = () => (
  <div className="mt-16 border-b border-t border-rule bg-paper-2 py-7" aria-label="Supported stores">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-[18px] gap-y-3 px-8">
      <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-ink-3">
        Works with receipts from
      </span>
      <div className="flex flex-wrap items-center gap-6">
        {STORES.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 font-display text-[16px] font-semibold tracking-tight text-ink-2">
            <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: s.color }} aria-hidden="true" />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  </div>
);

/* ─── How it works ──────────────────────────────────────────────── */
interface StepEntry {
  readonly num: string;
  readonly icon: ReactNode;
  readonly title: string;
  readonly body: string;
}
const STEPS: readonly StepEntry[] = [
  {
    num: '01',
    icon: <CameraIcon />,
    title: 'Snap your receipt',
    body:  'Take a photo of any receipt — paper, PDF, or screenshot. SplitHaus reads every line item, price, and tax automatically.',
  },
  {
    num: '02',
    icon: <UsersIcon />,
    title: 'Tag who got what',
    body:  'Tap items to assign them. Beers to the drinkers, oat milk to one housemate, groceries split four ways. Done.',
  },
  {
    num: '03',
    icon: <ShareIcon />,
    title: 'Share with the house',
    body:  'SplitHaus drafts a friendly summary you can paste straight into the group chat. Everyone sees exactly who owes who.',
  },
] as const;

const HowItWorks: FC = () => (
  <section aria-labelledby="steps-heading" className="py-24">
    <div className="mx-auto max-w-6xl px-8">
      <p className="mb-4 font-mono text-[12px] font-semibold uppercase tracking-wider text-[var(--primary)]">
        How it works
      </p>
      <h2 id="steps-heading" className="mb-4 font-display text-[clamp(28px,4vw,44px)] font-semibold tracking-heading text-ink">
        Three taps. No spreadsheet required.
      </h2>
      <p className="mb-14 max-w-[560px] text-[17px] leading-[1.6] text-ink-2">
        From receipt to "settled" in under a minute. Even if half your housemates are still in pyjamas.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STEPS.map((step) => (
          <article
            key={step.num}
            className="rounded-lg border border-rule bg-card p-8 transition-all duration-200 hover:-translate-y-0.5 hover:border-rule-strong"
          >
            <p className="mb-4 font-mono text-[12px] text-ink-3">{step.num}</p>
            <div
              className="mb-[18px] flex h-11 w-11 items-center justify-center rounded-md"
              style={{
                background: 'color-mix(in oklab, var(--primary) 14%, transparent)',
                border: '1px solid color-mix(in oklab, var(--primary) 24%, transparent)',
                color: 'var(--primary)',
              }}
            >
              {step.icon}
            </div>
            <h3 className="mb-2 font-display text-[19px] font-semibold tracking-tight text-ink">{step.title}</h3>
            <p className="m-0 text-[14.5px] leading-[1.55] text-ink-2">{step.body}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

/* ─── Features ──────────────────────────────────────────────────── */
const Features: FC = () => (
  <section
    aria-labelledby="features-heading"
    className="border-b border-t border-rule bg-paper-2 py-24"
  >
    <div className="mx-auto max-w-6xl px-8">
      <p className="mb-4 font-mono text-[12px] font-semibold uppercase tracking-wider text-[var(--primary)]">
        Why SplitHaus
      </p>
      <h2 id="features-heading" className="mb-4 font-display text-[clamp(28px,4vw,44px)] font-semibold tracking-heading text-ink">
        Built for the awkward stuff.
      </h2>
      <p className="mb-14 max-w-[560px] text-[17px] leading-[1.6] text-ink-2">
        The little frictions that turn grocery night into a group-chat fight. We took care of them.
      </p>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Feature 1 */}
        <article className="rounded-lg border border-rule bg-card p-7">
          <div className="relative mb-5 h-[120px] overflow-hidden rounded-md border border-rule bg-paper-2">
            <div className="absolute inset-3.5 flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                <Badge>📄 PDF</Badge>
                <Badge>📷 Photo</Badge>
              </div>
              <div className="flex gap-1.5">
                <Badge>🖼 Screenshot</Badge>
                <Badge>📧 Email</Badge>
              </div>
              <p className="mt-auto font-mono text-[10px] text-ink-3">→ parsed in &lt;3s</p>
            </div>
          </div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-accent">Any format</p>
          <h3 className="mb-2.5 font-display text-[20px] font-semibold tracking-tight text-ink">Photo, PDF, or screenshot</h3>
          <p className="text-[14px] leading-[1.55] text-ink-2">
            Crumpled paper receipts, online order PDFs, or that screenshot from the Woolies app. We read them all.
          </p>
        </article>

        {/* Feature 2 */}
        <article className="rounded-lg border border-rule bg-card p-7">
          <div className="relative mb-5 h-[120px] overflow-hidden rounded-md border border-rule bg-paper-2">
            <div className="absolute inset-3.5 flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between rounded-xs bg-card px-2 py-1.5">
                <span className="text-ink">Oat milk</span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-semibold text-white" style={{ background: 'var(--p3)' }}>M</span>
                  <span className="text-ink-2">Mei</span>
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xs bg-card px-2 py-1.5">
                <span className="text-ink">Bread</span>
                <span className="font-mono text-[10px] text-ink-2">÷ 4</span>
              </div>
              <div className="flex items-center justify-between rounded-xs bg-card px-2 py-1.5">
                <span className="text-ink">Beers</span>
                <span className="inline-flex">
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-semibold text-white" style={{ background: 'var(--p1)', marginRight: '-3px' }}>A</span>
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-semibold text-white" style={{ background: 'var(--p4)' }}>J</span>
                </span>
              </div>
            </div>
          </div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-accent">Per-item splits</p>
          <h3 className="mb-2.5 font-display text-[20px] font-semibold tracking-tight text-ink">Not just totals</h3>
          <p className="text-[14px] leading-[1.55] text-ink-2">
            You didn't drink the oat milk? Don't pay for it. SplitHaus splits per line item, not per receipt.
          </p>
        </article>

        {/* Feature 3 */}
        <article className="rounded-lg border border-rule bg-card p-7">
          <div className="relative mb-5 h-[120px] overflow-hidden rounded-md border border-rule bg-paper-2">
            <div className="absolute inset-3.5 rounded-xs bg-card p-2.5 font-mono text-[10px] leading-[1.6] text-ink-2">
              <p>📋 Tonight&apos;s Woolies run:</p>
              <p>• Albin owes Sarah $12.40</p>
              <p>• Mei owes Sarah $14.95</p>
              <p>• Jay owes Sarah $4.00</p>
              <p className="mt-1 text-accent">Copied to clipboard ✓</p>
            </div>
          </div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-accent">One-tap share</p>
          <h3 className="mb-2.5 font-display text-[20px] font-semibold tracking-tight text-ink">Instant group chat summary</h3>
          <p className="text-[14px] leading-[1.55] text-ink-2">
            Tap "Share" and we draft the message. Paste into WhatsApp, iMessage, or Discord — done in 2 seconds.
          </p>
        </article>
      </div>
    </div>
  </section>
);

const Badge: FC<{ children: ReactNode }> = ({ children }) => (
  <span className="inline-flex h-[22px] items-center rounded-full border border-rule bg-card px-3 font-mono text-[10px] text-ink-2">
    {children}
  </span>
);

/* ─── CTA banner ────────────────────────────────────────────────── */
const CTABanner: FC = () => (
  <section aria-labelledby="cta-heading" className="py-24">
    <div className="mx-auto max-w-6xl px-8">
      <div
        className="relative overflow-hidden rounded-xl border border-rule px-8 py-16 text-center"
        style={{
          background:
            'radial-gradient(80% 100% at 50% 0%, color-mix(in oklab, var(--primary) 28%, transparent) 0%, transparent 70%), white',
        }}
      >
        <h2
          id="cta-heading"
          className="mb-3 font-display text-[clamp(28px,4vw,44px)] font-semibold tracking-heading text-ink"
        >
          Ready to stop arguing about who owes what?
        </h2>
        <p className="mx-auto mb-7 max-w-[480px] text-[17px] leading-[1.6] text-ink-2">
          Your housemates will thank you. Or at least pay you back faster.
        </p>
        <a
          href="/split"
          className={'inline-flex h-[52px] items-center gap-2 rounded-md px-7 text-[15px] font-semibold text-white transition-all hover:-translate-y-px hover:brightness-108 ' + FOCUS}
          style={primaryBg}
        >
          Split a receipt now <Arrow />
        </a>
      </div>
    </div>
  </section>
);



/* ─── Skip link ─────────────────────────────────────────────────── */
const SkipLink: FC = () => (
  <a
    href="#main-content"
    className={
      'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 ' +
      'z-50 rounded-xs bg-ink px-4 py-3 font-mono text-[12px] font-medium uppercase tracking-wide text-white ' + FOCUS
    }
  >
    Skip to main content
  </a>
);

/* ─── Page ──────────────────────────────────────────────────────── */
export default function Home(): JSX.Element {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sh-theme');
    if (saved === 'dark') {
      setDark(true);
      document.documentElement.dataset.theme = 'dark';
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.dataset.theme = next ? 'dark' : '';
      localStorage.setItem('sh-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-paper font-sans text-ink antialiased">
      <SkipLink />
      <Navbar dark={dark} onToggle={toggleTheme} />
      <main id="main-content">
        <Hero />
        <ProofBar />
        <HowItWorks />
        <Features />
        <CTABanner />
      </main>
      <AppFooter />
    </div>
  );
}

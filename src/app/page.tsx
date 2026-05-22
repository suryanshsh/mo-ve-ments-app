import type { Metadata } from 'next'
import Link from 'next/link'

const description =
  'Mo(ve)ments builds your slides and writes your speaker script, grounded in your documents, timed to your duration, and adapted to your audience.'

export const metadata: Metadata = {
  title: 'Mo(ve)ments | Your next presentation, nailed.',
  description,
  openGraph: {
    title: 'Your next presentation, nailed.',
    description,
    siteName: 'Mo(ve)ments',
    type: 'website',
    images: [
      {
        url: 'https://mo-ve-ments.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Mo(ve)ments presentation workspace preview',
      },
    ],
  },
}

const steps = [
  {
    eyebrow: '01',
    title: 'Upload your material',
    body: 'PDFs, docs, notes — anything that contains your content. Mo(ve)ments reads it all.',
  },
  {
    eyebrow: '02',
    title: 'AI builds your moments',
    body: 'Each moment is a slide + a speaker script + timing + emotional beat. Not just slides — a complete performance.',
  },
  {
    eyebrow: '03',
    title: 'Edit, refine, export',
    body: 'Edit any slide or script inline. Ask the AI agent to revise. Export to PowerPoint when you\'re ready.',
  },
]

const differentiators = [
  {
    title: 'Source-grounded scripts',
    body: 'Every claim traces back to your documents, so your talk feels prepared instead of improvised around pretty slides.',
  },
  {
    title: 'Emotional arc',
    body: 'See the narrative shape of your entire presentation before you step into the room.',
  },
  {
    title: 'Per-moment timing',
    body: 'Know exactly how long to spend on each section, and where the pace needs to breathe.',
  },
]

const pricing = [
  {
    name: 'Free',
    price: '$0',
    description: 'A focused way to draft your first presentations.',
    details: ['2 presentations', '3 generations/day', 'No PPTX export'],
    cta: 'Get started',
    href: '/register',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$15/month',
    description: 'For people who present often and need the whole performance ready.',
    details: ['Unlimited presentations + generations', 'PPTX + PDF export', 'Priority support'],
    cta: 'Start free trial',
    href: '/register',
    featured: true,
  },
]

function WorkspaceMockup() {
  return (
    <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[8px] border border-border bg-surface shadow-[0_30px_90px_rgba(58,71,90,0.12)]">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div>
          <p className="font-serif text-lg text-text">Launch narrative</p>
          <div className="mt-2 flex gap-1.5">
            <span className="h-1.5 w-14 rounded-full bg-[#3A7BD5]" />
            <span className="h-1.5 w-20 rounded-full bg-[#D85A30]" />
            <span className="h-1.5 w-16 rounded-full bg-[#1D9E75]" />
            <span className="h-1.5 w-24 rounded-full bg-accent" />
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-full bg-bgAlt px-3 py-1 text-xs font-medium text-textMid">8 moments</span>
          <span className="rounded-full bg-bgAlt px-3 py-1 text-xs font-medium text-textMid">18 min</span>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
        <div className="bg-bg px-4 py-5 sm:px-6 sm:py-7">
          <div className="space-y-4">
            {[
              { title: 'Name the room', emotion: 'Hook', color: '#3A7BD5', active: false },
              { title: 'Turn research into stakes', emotion: 'Reveal', color: '#1D9E75', active: true },
              { title: 'Make the proof memorable', emotion: 'Proof', color: '#2A8C5E', active: false },
            ].map((moment, index) => (
              <div
                key={moment.title}
                className={`grid gap-4 rounded-[8px] border bg-surface p-4 shadow-sm transition-all sm:grid-cols-[132px_1fr] ${
                  moment.active ? 'border-accent/30 shadow-[0_18px_45px_rgba(58,71,90,0.08)]' : 'border-border'
                }`}
              >
                <div className="aspect-video rounded-[6px] bg-[#1E293B] p-3 text-white">
                  <div className="mb-4 h-2 w-16 rounded-full bg-[#F59E0B]" />
                  <div className="space-y-2">
                    <div className="h-1.5 rounded-full bg-white/70" />
                    <div className="h-1.5 w-4/5 rounded-full bg-white/45" />
                    <div className="h-1.5 w-2/3 rounded-full bg-white/35" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textLight">
                      Moment {index + 1}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ backgroundColor: `${moment.color}18`, color: moment.color }}
                    >
                      {moment.emotion}
                    </span>
                    <span className="rounded-full bg-bgAlt px-2.5 py-1 text-[11px] font-semibold text-textMid">
                      {index === 1 ? '3m 20s' : '2m 10s'}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl leading-7 text-text">{moment.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-textMid">
                    The slide shows the idea. The script carries the argument. The timing keeps it moving.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="border-t border-border bg-surface p-5 lg:border-l lg:border-t-0">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textLight">Agent</p>
              <p className="mt-1 font-serif text-xl text-text">Co-director</p>
            </div>
            <span className="h-2.5 w-2.5 rounded-full bg-[#1D9E75] shadow-[0_0_0_5px_rgba(29,158,117,0.12)]" />
          </div>
          <div className="space-y-3">
            <div className="rounded-[8px] bg-bgAlt px-3 py-3 text-sm leading-6 text-textMid">
              Tighten the reveal and make the transition less formal.
            </div>
            <div className="ml-auto rounded-[8px] bg-accent px-3 py-3 text-sm leading-6 text-white">
              Give this moment more contrast.
            </div>
            <div className="rounded-[8px] bg-bgAlt px-3 py-3 text-sm leading-6 text-textMid">
              Updated the script and kept the same timing.
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function ComparisonGraphic() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[8px] border border-border bg-surface p-6">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-textLight">Traditional</p>
        <div className="grid min-h-64 place-items-center rounded-[8px] bg-bgAlt p-8">
          <div className="aspect-video w-full max-w-xs rounded-[8px] border border-border bg-surface p-5 shadow-sm">
            <div className="mb-5 h-3 w-28 rounded-full bg-border" />
            <div className="space-y-3">
              <div className="h-2 rounded-full bg-border" />
              <div className="h-2 w-5/6 rounded-full bg-border" />
              <div className="h-2 w-2/3 rounded-full bg-border" />
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-textMid">A slide deck asks you to invent the performance later.</p>
      </div>

      <div className="rounded-[8px] border border-accent/25 bg-accent-soft p-6 shadow-[0_22px_70px_rgba(108,155,217,0.14)]">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-brand">Mo(ve)ments</p>
        <div className="grid min-h-64 gap-4 rounded-[8px] bg-surface p-4 sm:grid-cols-[1fr_0.9fr]">
          <div className="aspect-video rounded-[8px] bg-[#1E293B] p-5">
            <div className="mb-5 h-3 w-28 rounded-full bg-[#F59E0B]" />
            <div className="space-y-3">
              <div className="h-2 rounded-full bg-white/70" />
              <div className="h-2 w-5/6 rounded-full bg-white/45" />
              <div className="h-2 w-2/3 rounded-full bg-white/35" />
            </div>
          </div>
          <div className="flex flex-col justify-between gap-4">
            <div className="rounded-[8px] bg-bgAlt p-4">
              <div className="mb-3 h-2 w-20 rounded-full bg-accent/30" />
              <div className="space-y-2">
                <div className="h-1.5 rounded-full bg-border" />
                <div className="h-1.5 w-11/12 rounded-full bg-border" />
                <div className="h-1.5 w-4/5 rounded-full bg-border" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 flex-1 rounded-full bg-[#3A7BD5]" />
              <span className="h-2 flex-1 rounded-full bg-[#D85A30]" />
              <span className="h-2 flex-1 rounded-full bg-[#1D9E75]" />
              <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white">3m</span>
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-textMid">A moment gives you the slide, script, timing, and emotional beat in one prepared unit.</p>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-bg text-text">
      <section className="px-5 pb-16 pt-8 sm:px-8 lg:px-10 lg:pb-24">
        <div className="mx-auto max-w-7xl">
          <header className="mb-20 flex items-center justify-between gap-6">
            <Link href="/" className="font-serif text-2xl text-brand" aria-label="Mo(ve)ments home">
              Mo(ve)ments
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium text-textMid sm:flex" aria-label="Primary navigation">
              <a href="#how-it-works" className="transition-colors hover:text-text">How it works</a>
              <a href="#why-moments" className="transition-colors hover:text-text">Why moments</a>
              <a href="#pricing" className="transition-colors hover:text-text">Pricing</a>
            </nav>
            <Link
              href="/login"
              className="rounded-[8px] border border-border bg-surface px-4 py-2 text-sm font-semibold text-textMid transition-colors hover:border-accent/35 hover:text-text"
            >
              Sign in
            </Link>
          </header>

          <div className="landing-reveal mx-auto max-w-4xl text-center">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-accent-text">AI presentation preparation</p>
            <h1 className="font-serif text-[48px] leading-[0.98] text-text sm:text-[56px]">
              Your next presentation, nailed.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-[18px] leading-8 text-textMid">
              Mo(ve)ments builds your slides and writes your speaker script — grounded in your documents, timed to your duration, adapted to your audience.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex w-full justify-center rounded-[8px] bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent/90 sm:w-auto"
              >
                Get started free
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex w-full justify-center rounded-[8px] border border-accent px-5 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft sm:w-auto"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="landing-reveal mt-14 lg:mt-20">
            <WorkspaceMockup />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-reveal border-y border-border bg-surface px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-accent-text">How it works</p>
            <h2 className="font-serif text-4xl leading-tight text-text sm:text-5xl">A complete talk, built from your source material.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.title} className="rounded-[8px] border border-border bg-bg p-6">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-textLight">{step.eyebrow}</span>
                <h3 className="mt-8 font-serif text-3xl leading-tight text-text">{step.title}</h3>
                <p className="mt-4 text-sm leading-7 text-textMid">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="why-moments" className="landing-reveal px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-accent-text">Why moments, not slides</p>
            <h2 className="font-serif text-4xl leading-tight text-text sm:text-5xl">
              Other tools give you slides. Mo(ve)ments gives you preparation.
            </h2>
            <div className="mt-10 space-y-7">
              {differentiators.map((item) => (
                <div key={item.title}>
                  <h3 className="font-serif text-2xl text-text">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-textMid">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
          <ComparisonGraphic />
        </div>
      </section>

      <section id="pricing" className="landing-reveal border-y border-border bg-surface px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-accent-text">Pricing</p>
            <h2 className="font-serif text-4xl leading-tight text-text sm:text-5xl">Start with a draft. Stay for the preparation.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {pricing.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-[8px] border p-7 ${
                  plan.featured
                    ? 'border-accent/30 bg-accent-soft shadow-[0_24px_80px_rgba(108,155,217,0.14)]'
                    : 'border-border bg-bg'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-3xl text-text">{plan.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-textMid">{plan.description}</p>
                  </div>
                  {plan.featured && (
                    <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">Best fit</span>
                  )}
                </div>
                <p className="mt-8 font-serif text-4xl text-text">{plan.price}</p>
                <div className="mt-7 space-y-3 text-sm leading-6 text-textMid">
                  {plan.details.map((detail) => (
                    <p key={detail}>{detail}</p>
                  ))}
                </div>
                <Link
                  href={plan.href}
                  className={`mt-8 inline-flex w-full justify-center rounded-[8px] px-5 py-3 text-sm font-semibold transition-colors ${
                    plan.featured
                      ? 'bg-accent text-white hover:bg-accent/90'
                      : 'border border-accent text-accent hover:bg-accent-soft'
                  }`}
                >
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 border-t border-border pt-8 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="font-serif text-2xl text-brand" aria-label="Mo(ve)ments home">
              Mo(ve)ments
            </Link>
            <p className="mt-2 text-sm text-textMid">Built for people who present, not people who design slides.</p>
          </div>
          <nav className="flex flex-wrap gap-5 text-sm font-medium text-textMid" aria-label="Footer navigation">
            <a href="#" className="transition-colors hover:text-text">Terms</a>
            <a href="#" className="transition-colors hover:text-text">Privacy</a>
            <a href="mailto:hello@mo-ve-ments.app" className="transition-colors hover:text-text">Contact</a>
          </nav>
        </div>
      </footer>
    </main>
  )
}

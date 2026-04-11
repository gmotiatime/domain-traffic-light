const skills = [
  'Claude Code',
  'Gemini',
  'Vercel',
  'GitHub',
  'Next.js',
  'Tailwind CSS',
  'Vibe coding',
  'AI reasoning'
];

const principles = [
  {
    title: 'Build fast, ship clean',
    copy: 'Lean interfaces, strong contrast, and a focus on shipping polished software instead of overcomplicating it.'
  },
  {
    title: 'AI with real utility',
    copy: 'Using models for reasoning, feedback, and threat prediction where they improve product decisions.'
  },
  {
    title: 'Independent by design',
    copy: 'A solo workflow built around Next.js, GitHub, and Vercel to move from idea to deployment quickly.'
  }
];

const timeline = [
  {
    label: 'Now',
    title: 'Domain Traffic Light.AI',
    copy: 'Anti-phishing service with AI reasoning, threat prediction, and a clear traffic-light style risk signal.'
  },
  {
    label: 'Workflow',
    title: 'AI-driven development',
    copy: 'Claude Code, Gemini, Vercel, and GitHub as a practical stack for rapid iteration and deployment.'
  },
  {
    label: 'Focus',
    title: 'Sleek product thinking',
    copy: 'Professional dark mode, strong readability, and responsive layouts that feel modern on every screen.'
  }
];

export default function Page() {
  return (
    <main className="min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300/80">gmotiatime</p>
            <p className="mt-1 text-sm text-slate-300">Andrey · developer from Gomel, Belarus</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-200">
            <span className="pill">Next.js</span>
            <span className="pill">Tailwind CSS</span>
            <span className="pill">Vercel-ready</span>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.25fr_0.75fr] lg:py-24">
          <div className="relative">
            <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
            <div className="absolute right-10 top-10 h-32 w-32 rounded-full bg-indigo-500/15 blur-3xl" />

            <p className="section-title">Portfolio</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Sleek, high-contrast web presence for a young builder shipping AI products.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              A focused portfolio for Andrey that highlights Domain Traffic Light.AI, AI-driven development, and a modern product mindset built for the web.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#project"
                className="rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                View featured project
              </a>
              <a
                href="mailto:gmotiaaa@gmail.com"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Contact Andrey
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ['14', 'years old'],
                ['Gomel', 'Belarus'],
                ['AI-first', 'developer']
              ].map(([value, label]) => (
                <div key={label} className="glass rounded-2xl p-5">
                  <div className="text-3xl font-semibold text-white">{value}</div>
                  <div className="mt-1 text-sm text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="glass relative rounded-[2rem] p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
            <p className="section-title">Featured project</p>
            <div className="mt-5 space-y-5">
              <div id="project" className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="card-title">Доменный светофор.AI</h2>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    live concept
                  </span>
                </div>
                <p className="card-copy mt-3">
                  An anti-phishing service with AI reasoning that helps evaluate links, surface risk signals, and present a simple traffic-light style verdict.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-sky-300/75">Stack</div>
                  <p className="mt-2 text-sm text-slate-200">Next.js, Tailwind, GitHub, Vercel</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-sky-300/75">Method</div>
                  <p className="mt-2 text-sm text-slate-200">Claude Code, Gemini, vibe coding</p>
                </div>
              </div>

              <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-5">
                <p className="text-sm font-medium text-sky-100">Professional dark mode. Responsive by default. Built to feel clean on mobile, tablet, and desktop.</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 pb-12 lg:grid-cols-3">
          {principles.map((item) => (
            <article key={item.title} className="glass rounded-3xl p-6">
              <h3 className="card-title">{item.title}</h3>
              <p className="card-copy mt-3">{item.copy}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 pb-16 lg:grid-cols-[1fr_1fr]">
          <div className="glass rounded-3xl p-6 sm:p-8">
            <p className="section-title">Skills</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {skills.map((skill) => (
                <span key={skill} className="pill text-sm text-slate-100">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-8">
            <p className="section-title">What drives the work</p>
            <div className="mt-5 space-y-4">
              {timeline.map((item) => (
                <div key={item.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="min-w-16 text-sm font-semibold text-sky-300">{item.label}</div>
                  <div>
                    <div className="font-semibold text-white">{item.title}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

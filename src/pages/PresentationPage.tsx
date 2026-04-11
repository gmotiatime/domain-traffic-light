export default function PresentationPage() {
  return (
    <main className="min-h-screen bg-[#050814] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-300/80">gmotiatime portfolio</p>
        <h1 className="mt-4 text-4xl font-semibold">PresentationPage</h1>
        <p className="mt-4 text-slate-300">This route is part of the Andrey gmotiatime portfolio deployment.</p>
        <a href="/" className="mt-8 inline-flex rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-400">Back to home</a>
      </div>
    </main>
  );
}

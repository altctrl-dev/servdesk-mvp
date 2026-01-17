export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-center text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          ServDesk MVP
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          AI-powered service desk for small businesses
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <a
            href="/dashboard"
            className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Get Started
          </a>
          <a
            href="/api/health"
            className="text-sm font-semibold leading-6 text-foreground"
          >
            Health Check <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </main>
  );
}

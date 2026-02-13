import Link from "next/link"

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-destructive">
            <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-foreground">Authentication Error</h1>
        <p className="text-sm text-muted-foreground">Something went wrong during authentication. Please try again.</p>
        <Link
          href="/auth/login"
          className="mx-auto inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}

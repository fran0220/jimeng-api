import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/dashboard")

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          System configuration for the API relay service.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* API Relay Info */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">API Relay Endpoint</h2>
          <div className="rounded-lg bg-muted p-3">
            <code className="text-sm text-foreground font-mono">
              {process.env.NEXT_PUBLIC_SITE_URL || "https://your-deployment.vercel.app"}/api/v1
            </code>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Users should use this base URL with their API key in the Authorization header.
            Example: <code className="text-foreground">Authorization: Bearer {"<api_key>"}</code>
          </p>
        </div>

        {/* Round Robin Info */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Token Rotation</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Strategy</span>
              <span className="text-sm font-medium text-foreground">Round Robin</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Max Retries</span>
              <span className="text-sm font-medium text-foreground">3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Auto-disable on Failure</span>
              <span className="text-sm font-medium text-foreground">After 5 consecutive failures</span>
            </div>
          </div>
        </div>

        {/* Rate Limits Defaults */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Default Rate Limits</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Requests per Minute</span>
              <span className="text-sm font-medium text-foreground">60</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Default Usage Quota</span>
              <span className="text-sm font-medium text-foreground">1000 requests</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            These defaults are applied when users create new API keys. Admin can adjust per-key limits.
          </p>
        </div>
      </div>
    </div>
  )
}

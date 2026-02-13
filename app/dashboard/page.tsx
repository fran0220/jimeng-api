import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Database, Key, BarChart3, Users } from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusBadge } from "@/components/dashboard/status-badge"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"

  if (isAdmin) {
    return <AdminOverview />
  }

  return <UserOverview userId={user.id} />
}

async function AdminOverview() {
  const supabase = await createClient()

  // Fetch counts
  const [tokensResult, keysResult, usersResult, logsResult] = await Promise.all([
    supabase.from("upstream_tokens").select("id, status, label, last_used_at, fail_count", { count: "exact" }),
    supabase.from("api_keys").select("*", { count: "exact" }),
    supabase.from("profiles").select("*", { count: "exact" }),
    supabase.from("usage_logs").select("*", { count: "exact" }).gte(
      "created_at",
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    ),
  ])

  const totalTokens = tokensResult.count ?? 0
  const activeTokens = tokensResult.data?.filter(t => t.status === "active").length ?? 0
  const totalKeys = keysResult.count ?? 0
  const totalUsers = usersResult.count ?? 0
  const todayRequests = logsResult.count ?? 0

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor your token pool, API keys, and overall system health.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Token Pool"
          value={`${activeTokens}/${totalTokens}`}
          description="Active / Total tokens"
          icon={Database}
        />
        <StatCard
          title="API Keys"
          value={totalKeys}
          description="Total issued keys"
          icon={Key}
        />
        <StatCard
          title="Users"
          value={totalUsers}
          description="Registered users"
          icon={Users}
        />
        <StatCard
          title="Today Requests"
          value={todayRequests}
          description="Last 24 hours"
          icon={BarChart3}
        />
      </div>

      {/* Token Status Table */}
      <div className="mt-8 rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Token Pool Health</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Label</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Failures</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tokensResult.data && tokensResult.data.length > 0 ? (
                tokensResult.data.map((token) => (
                  <tr key={token.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                      {token.label || "Unnamed"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={token.status as "active" | "inactive" | "error" | "disabled"} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">
                      {token.fail_count}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {token.last_used_at
                        ? new Date(token.last_used_at).toLocaleString("zh-CN")
                        : "Never"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No tokens in the pool. Add tokens from the Token Pool page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

async function UserOverview({ userId }: { userId: string }) {
  const supabase = await createClient()

  const [keysResult, logsResult] = await Promise.all([
    supabase.from("api_keys").select("*", { count: "exact" }).eq("user_id", userId),
    supabase.from("usage_logs").select("*", { count: "exact" })
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ])

  const totalKeys = keysResult.count ?? 0
  const activeKeys = keysResult.data?.filter(k => k.is_active).length ?? 0
  const todayRequests = logsResult.count ?? 0

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your API keys and monitor usage.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="API Keys"
          value={`${activeKeys}/${totalKeys}`}
          description="Active / Total keys"
          icon={Key}
        />
        <StatCard
          title="Today Requests"
          value={todayRequests}
          description="Last 24 hours"
          icon={BarChart3}
        />
        <StatCard
          title="Rate Limit"
          value={`${keysResult.data?.[0]?.rate_limit_per_minute ?? 60}/min`}
          description="Requests per minute"
          icon={Database}
        />
      </div>

      {/* Quick Key List */}
      <div className="mt-8 rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Your API Keys</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Usage</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keysResult.data && keysResult.data.length > 0 ? (
                keysResult.data.map((key) => (
                  <tr key={key.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                      {key.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={key.is_active ? "active" : "inactive"} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">
                      {key.usage_count}/{key.usage_quota === -1 ? "Unlimited" : key.usage_quota}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {new Date(key.created_at).toLocaleDateString("zh-CN")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No API keys yet. Create one from the API Keys page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

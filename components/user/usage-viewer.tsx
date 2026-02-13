"use client"

import useSWR from "swr"
import { BarChart3, CheckCircle, XCircle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface LogEntry {
  id: string
  endpoint: string
  status_code: number
  response_time_ms: number | null
  created_at: string
}

interface DailyStat {
  date: string
  total: number
  success: number
  error: number
}

export function UsageViewer() {
  const { data, error } = useSWR<{ logs: LogEntry[]; dailyStats: DailyStat[] }>(
    "/api/usage",
    fetcher,
    { refreshInterval: 10000 }
  )

  const loading = !data && !error
  const logs = data?.logs || []
  const dailyStats = data?.dailyStats || []
  const totalRequests = dailyStats.reduce((sum, d) => sum + d.total, 0)
  const totalSuccess = dailyStats.reduce((sum, d) => sum + d.success, 0)
  const totalErrors = dailyStats.reduce((sum, d) => sum + d.error, 0)

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your API request history and usage statistics.
        </p>
      </div>

      {/* Stats summary */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">7-Day Total</span>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalRequests}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">Successful</span>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{totalSuccess}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">Errors</span>
          <p className="mt-1 text-2xl font-bold text-red-400">{totalErrors}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Requests (Last 7 Days)</h2>
        {dailyStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 3.7% 20%)" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => v.slice(5)}
                tick={{ fill: "hsl(240 5% 64.9%)", fontSize: 12 }}
                axisLine={{ stroke: "hsl(240 3.7% 20%)" }}
              />
              <YAxis
                tick={{ fill: "hsl(240 5% 64.9%)", fontSize: 12 }}
                axisLine={{ stroke: "hsl(240 3.7% 20%)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(240 10% 10%)",
                  border: "1px solid hsl(240 3.7% 20%)",
                  borderRadius: "8px",
                  color: "hsl(0 0% 98%)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="success" stackId="a" fill="hsl(142 71% 45%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="error" stackId="a" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        )}
      </div>

      {/* Recent logs */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Recent Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Time</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Endpoint</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-muted/30">
                    <td className="whitespace-nowrap px-5 py-3 text-xs font-mono text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-foreground">{log.endpoint}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {log.status_code >= 200 && log.status_code < 300 ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className="text-xs font-mono text-muted-foreground">{log.status_code}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                      {log.response_time_ms ? `${log.response_time_ms}ms` : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
                      <span>No usage data yet. Start making API requests to see logs here.</span>
                    </div>
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

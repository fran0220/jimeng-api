"use client"

import useSWR from "swr"
import { BarChart3, CheckCircle, XCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface LogEntry {
  id: string
  user_id: string
  api_key_id: string
  endpoint: string
  status_code: number
  upstream_token_id: string | null
  response_time_ms: number | null
  created_at: string
}

export function LogsViewer() {
  const { data, error } = useSWR<{ data: LogEntry[]; total: number }>(
    "/api/admin/logs?limit=100",
    fetcher,
    { refreshInterval: 5000 }
  )

  const loading = !data && !error
  const logs = data?.data || []
  const total = data?.total || 0

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Usage Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time view of all API relay requests. Auto-refreshes every 5 seconds.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Total: <span className="font-mono font-medium text-foreground">{total}</span> entries
        </span>
        <span className="text-sm text-muted-foreground">
          Success:{" "}
          <span className="font-mono font-medium text-emerald-400">
            {logs.filter(l => l.status_code >= 200 && l.status_code < 300).length}
          </span>
        </span>
        <span className="text-sm text-muted-foreground">
          Errors:{" "}
          <span className="font-mono font-medium text-red-400">
            {logs.filter(l => l.status_code >= 400).length}
          </span>
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Time</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Endpoint</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Latency</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">API Key</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Loading logs...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-destructive">
                    Failed to load logs.
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-muted/30">
                    <td className="whitespace-nowrap px-5 py-3 text-xs font-mono text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-foreground">
                      {log.endpoint}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {log.status_code >= 200 && log.status_code < 300 ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className="text-xs font-mono text-muted-foreground">
                          {log.status_code}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                      {log.response_time_ms ? `${log.response_time_ms}ms` : "-"}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                      {log.api_key_id?.slice(0, 8)}...
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
                      <span>No usage logs yet. Logs will appear when the relay API is used.</span>
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

"use client"

import { useState } from "react"
import useSWR from "swr"
import { Plus, Trash2, Copy, Check, Key, Power } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface ApiKey {
  id: string
  name: string
  key: string
  is_active: boolean
  rate_limit_per_minute: number
  usage_quota: number
  usage_count: number
  created_at: string
  full_key?: string
}

export function KeyManager() {
  const { data: keys, error, mutate } = useSWR<ApiKey[]>("/api/keys", fetcher)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [rateLimit, setRateLimit] = useState("60")
  const [usageQuota, setUsageQuota] = useState("1000")
  const [creating, setCreating] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          rate_limit_per_minute: parseInt(rateLimit) || 60,
          usage_quota: parseInt(usageQuota) || 1000,
        }),
      })
      const data = await res.json()
      if (data.full_key) {
        setNewlyCreatedKey(data.full_key)
      }
      setNewName("")
      setRateLimit("60")
      setUsageQuota("1000")
      setShowCreate(false)
      mutate()
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch("/api/keys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !isActive }),
    })
    mutate()
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure? This action cannot be undone.")) return
    await fetch(`/api/keys?id=${id}`, { method: "DELETE" })
    mutate()
  }

  function copyToClipboard(text: string, id?: string) {
    navigator.clipboard.writeText(text)
    if (id) {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  function maskKey(key: string) {
    return key.slice(0, 7) + "..." + key.slice(-4)
  }

  const loading = !keys && !error

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage your API keys for accessing the relay service.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Key
        </button>
      </div>

      {/* Newly created key banner */}
      {newlyCreatedKey && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <h3 className="mb-2 text-sm font-semibold text-emerald-400">New API Key Created</h3>
          <p className="mb-3 text-xs text-emerald-300/70">
            Copy this key now. You won{"'"}t be able to see the full key again.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded-lg bg-background/50 px-3 py-2 font-mono text-sm text-foreground">
              {newlyCreatedKey}
            </code>
            <button
              onClick={() => {
                copyToClipboard(newlyCreatedKey)
                setNewlyCreatedKey(null)
              }}
              className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Copy className="h-4 w-4" />
              Copy & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Create Key Form */}
      {showCreate && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Create New API Key</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. My App"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Rate Limit (req/min)</label>
              <input
                type="number"
                value={rateLimit}
                onChange={e => setRateLimit(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Usage Quota</label>
              <input
                type="number"
                value={usageQuota}
                onChange={e => setUsageQuota(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Key"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="flex h-9 items-center px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Usage hint */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Usage:</span> Send requests to{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            {typeof window !== "undefined" ? window.location.origin : ""}/api/v1/images/generations
          </code>{" "}
          with header{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            Authorization: Bearer {"<your_api_key>"}
          </code>
        </p>
      </div>

      {/* Keys Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Key</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Usage</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Rate Limit</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Loading keys...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-destructive">
                    Failed to load keys.
                  </td>
                </tr>
              ) : keys && keys.length > 0 ? (
                keys.map((k) => (
                  <tr key={k.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{k.name}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-muted-foreground">{maskKey(k.key)}</code>
                        <button
                          onClick={() => copyToClipboard(k.key, k.id)}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                          title="Copy key"
                        >
                          {copiedId === k.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={k.is_active ? "active" : "disabled"} />
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">
                      {k.usage_count}/{k.usage_quota === -1 ? "Unlimited" : k.usage_quota}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">
                      {k.rate_limit_per_minute}/min
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {new Date(k.created_at).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggle(k.id, k.is_active)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          title={k.is_active ? "Disable" : "Enable"}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(k.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Key className="h-8 w-8 text-muted-foreground/40" />
                      <span>No API keys yet. Click "Create Key" to get started.</span>
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

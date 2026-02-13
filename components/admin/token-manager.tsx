"use client"

import { useState } from "react"
import useSWR from "swr"
import { Plus, Trash2, RotateCcw, Eye, EyeOff, Database } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface Token {
  id: string
  token: string
  label: string | null
  status: string
  fail_count: number
  last_used_at: string | null
  created_at: string
}

export function TokenManager() {
  const { data: tokens, error, mutate } = useSWR<Token[]>("/api/admin/tokens", fetcher)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newToken, setNewToken] = useState("")
  const [newLabel, setNewLabel] = useState("")
  const [adding, setAdding] = useState(false)
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set())

  async function handleAdd() {
    if (!newToken.trim()) return
    setAdding(true)
    try {
      await fetch("/api/admin/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: newToken.trim(), label: newLabel.trim() || null }),
      })
      setNewToken("")
      setNewLabel("")
      setShowAddForm(false)
      mutate()
    } finally {
      setAdding(false)
    }
  }

  async function handleBatchAdd() {
    const lines = newToken.split("\n").map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return
    setAdding(true)
    try {
      for (const line of lines) {
        await fetch("/api/admin/tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: line, label: newLabel.trim() || null }),
        })
      }
      setNewToken("")
      setNewLabel("")
      setShowAddForm(false)
      mutate()
    } finally {
      setAdding(false)
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "disabled" : "active"
    await fetch("/api/admin/tokens", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    })
    mutate()
  }

  async function handleResetFails(id: string) {
    await fetch("/api/admin/tokens", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fail_count: 0, status: "active" }),
    })
    mutate()
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this token?")) return
    await fetch(`/api/admin/tokens?id=${id}`, { method: "DELETE" })
    mutate()
  }

  function toggleTokenVisibility(id: string) {
    setVisibleTokens(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function maskToken(token: string) {
    if (token.length <= 12) return "***"
    return token.slice(0, 6) + "..." + token.slice(-6)
  }

  const loading = !tokens && !error

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Token Pool</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage upstream jimeng API tokens for round-robin rotation.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Token
        </button>
      </div>

      {/* Add Token Form */}
      {showAddForm && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Add New Token(s)</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Label (optional)</label>
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="e.g. Account #1"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Token(s) - one per line for batch add</label>
              <textarea
                value={newToken}
                onChange={e => setNewToken(e.target.value)}
                placeholder="Paste token(s) here..."
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={adding || !newToken.trim()}
                className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add Single"}
              </button>
              <button
                onClick={handleBatchAdd}
                disabled={adding || !newToken.trim()}
                className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                {adding ? "Adding..." : "Batch Add (one per line)"}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewToken(""); setNewLabel("") }}
                className="flex h-9 items-center px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Label</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Token</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Fails</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Used</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Loading tokens...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-destructive">
                    Failed to load tokens.
                  </td>
                </tr>
              ) : tokens && tokens.length > 0 ? (
                tokens.map((token) => (
                  <tr key={token.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                      {token.label || "Unnamed"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-muted-foreground font-mono">
                          {visibleTokens.has(token.id) ? token.token : maskToken(token.token)}
                        </code>
                        <button
                          onClick={() => toggleTokenVisibility(token.id)}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {visibleTokens.has(token.id) ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={token.status as "active" | "inactive" | "error" | "disabled"} />
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">
                      {token.fail_count}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {token.last_used_at
                        ? new Date(token.last_used_at).toLocaleString("zh-CN")
                        : "Never"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(token.id, token.status)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          title={token.status === "active" ? "Disable" : "Enable"}
                        >
                          <Database className="h-3.5 w-3.5" />
                        </button>
                        {token.fail_count > 0 && (
                          <button
                            onClick={() => handleResetFails(token.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title="Reset fail count"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(token.id)}
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
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Database className="h-8 w-8 text-muted-foreground/40" />
                      <span>No tokens added yet. Click "Add Token" to get started.</span>
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

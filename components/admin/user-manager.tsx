"use client"

import useSWR from "swr"
import { Users, Shield, User } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: string
  created_at: string
  key_count: number
}

export function UserManager({ currentUserId }: { currentUserId: string }) {
  const { data: users, error, mutate } = useSWR<Profile[]>("/api/admin/users", fetcher)

  async function handleToggleRole(userId: string, currentRole: string) {
    if (userId === currentUserId) {
      alert("You cannot change your own role.")
      return
    }
    const newRole = currentRole === "admin" ? "user" : "admin"
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, role: newRole }),
    })
    mutate()
  }

  const loading = !users && !error

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage user roles and view their API key usage.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">User</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">API Keys</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Joined</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Loading users...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-destructive">
                    Failed to load users.
                  </td>
                </tr>
              ) : users && users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full" crossOrigin="anonymous" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                            {u.email?.[0]?.toUpperCase() ?? "U"}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{u.display_name || u.email}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        status={u.role === "admin" ? "active" : "inactive"}
                        label={u.role === "admin" ? "Admin" : "User"}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">
                      {u.key_count}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleRole(u.id, u.role)}
                        disabled={u.id === currentUserId}
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        title={u.id === currentUserId ? "Cannot change your own role" : `Set as ${u.role === "admin" ? "user" : "admin"}`}
                      >
                        {u.role === "admin" ? (
                          <><User className="h-3 w-3" /> Demote</>
                        ) : (
                          <><Shield className="h-3 w-3" /> Promote</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground/40" />
                      <span>No users registered yet.</span>
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

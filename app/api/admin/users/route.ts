import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized", status: 401 }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") return { error: "Forbidden", status: 403 }
  return { supabase, user }
}

export async function GET() {
  const auth = await requireAdmin()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data: profiles, error } = await auth.supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also get key counts per user
  const { data: keyCounts } = await auth.supabase
    .from("api_keys")
    .select("user_id")

  const keyCountMap: Record<string, number> = {}
  keyCounts?.forEach(k => {
    keyCountMap[k.user_id] = (keyCountMap[k.user_id] || 0) + 1
  })

  const enriched = profiles?.map(p => ({
    ...p,
    key_count: keyCountMap[p.id] || 0,
  }))

  return NextResponse.json(enriched)
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  const { id, role } = body

  if (!id || !role) {
    return NextResponse.json({ error: "User ID and role are required" }, { status: 400 })
  }

  if (!["admin", "user"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

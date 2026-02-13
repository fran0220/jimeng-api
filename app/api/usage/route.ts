import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Get recent logs
  const { data: logs, error: logsError } = await supabase
    .from("usage_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (logsError) return NextResponse.json({ error: logsError.message }, { status: 500 })

  // Get daily aggregation for last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentLogs } = await supabase
    .from("usage_logs")
    .select("created_at, status_code")
    .eq("user_id", user.id)
    .gte("created_at", sevenDaysAgo)

  // Aggregate by day
  const dailyMap: Record<string, { total: number; success: number; error: number }> = {}
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    dailyMap[key] = { total: 0, success: 0, error: 0 }
  }

  recentLogs?.forEach(log => {
    const day = log.created_at.split("T")[0]
    if (dailyMap[day]) {
      dailyMap[day].total++
      if (log.status_code >= 200 && log.status_code < 300) {
        dailyMap[day].success++
      } else {
        dailyMap[day].error++
      }
    }
  })

  const dailyStats = Object.entries(dailyMap).map(([date, stats]) => ({
    date,
    ...stats,
  }))

  return NextResponse.json({ logs, dailyStats })
}

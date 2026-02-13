import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TokenManager } from "@/components/admin/token-manager"

export default async function TokensPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  return <TokenManager />
}

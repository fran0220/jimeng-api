import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserManager } from "@/components/admin/user-manager"

export default async function UsersPage() {
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

  return <UserManager currentUserId={user.id} />
}

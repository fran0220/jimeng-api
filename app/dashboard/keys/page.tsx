import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { KeyManager } from "@/components/user/key-manager"

export default async function KeysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return <KeyManager />
}

import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"

// Use service role key for relay operations (bypasses RLS)
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createSupabaseAdmin(url, serviceKey)
}

interface UpstreamToken {
  id: string
  token: string
  status: string
  fail_count: number
}

/**
 * Round-robin token selection with retry support.
 * Returns the next active token from the pool.
 */
export async function getNextToken(): Promise<UpstreamToken | null> {
  const supabase = getAdminClient()

  // Get all active tokens
  const { data: tokens, error } = await supabase
    .from("upstream_tokens")
    .select("id, token, status, fail_count")
    .eq("status", "active")
    .order("created_at", { ascending: true })

  if (error || !tokens || tokens.length === 0) {
    return null
  }

  // Get current round-robin index
  const { data: state } = await supabase
    .from("round_robin_state")
    .select("current_index")
    .eq("id", "default")
    .single()

  const currentIndex = state?.current_index ?? 0
  const nextIndex = (currentIndex + 1) % tokens.length

  // Update the index
  await supabase
    .from("round_robin_state")
    .upsert({ id: "default", current_index: nextIndex })

  // Select the token at current index
  const selectedIndex = currentIndex % tokens.length
  return tokens[selectedIndex]
}

/**
 * Get an alternative token (skip a specific token ID)
 */
export async function getAlternativeToken(skipTokenId: string): Promise<UpstreamToken | null> {
  const supabase = getAdminClient()

  const { data: tokens } = await supabase
    .from("upstream_tokens")
    .select("id, token, status, fail_count")
    .eq("status", "active")
    .neq("id", skipTokenId)
    .order("fail_count", { ascending: true })
    .limit(1)

  return tokens?.[0] ?? null
}

/**
 * Report a token failure
 */
export async function reportTokenFailure(tokenId: string) {
  const supabase = getAdminClient()

  // Increment fail count
  const { data: token } = await supabase
    .from("upstream_tokens")
    .select("fail_count")
    .eq("id", tokenId)
    .single()

  const newFailCount = (token?.fail_count ?? 0) + 1

  // Auto-disable if too many failures (5+)
  const updates: Record<string, unknown> = {
    fail_count: newFailCount,
    last_used_at: new Date().toISOString(),
  }
  if (newFailCount >= 5) {
    updates.status = "error"
  }

  await supabase
    .from("upstream_tokens")
    .update(updates)
    .eq("id", tokenId)
}

/**
 * Report a token success (update last_used_at)
 */
export async function reportTokenSuccess(tokenId: string) {
  const supabase = getAdminClient()
  await supabase
    .from("upstream_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenId)
}

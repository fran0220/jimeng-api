import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createSupabaseAdmin(url, serviceKey)
}

interface ApiKeyInfo {
  id: string
  user_id: string
  key: string
  name: string
  is_active: boolean
  rate_limit_per_minute: number
  usage_quota: number
  usage_count: number
}

/**
 * Validate an API key from the Authorization header.
 * Returns the key info or null if invalid.
 */
export async function validateApiKey(authHeader: string | null): Promise<ApiKeyInfo | null> {
  if (!authHeader) return null

  // Extract bearer token
  const key = authHeader.replace(/^Bearer\s+/i, "").trim()
  if (!key) return null

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key", key)
    .single()

  if (error || !data) return null
  if (!data.is_active) return null

  // Check usage quota
  if (data.usage_quota !== -1 && data.usage_count >= data.usage_quota) {
    return null
  }

  return data as ApiKeyInfo
}

/**
 * Increment the usage count for an API key.
 */
export async function incrementUsage(keyId: string) {
  const supabase = getAdminClient()
  const { data } = await supabase
    .from("api_keys")
    .select("usage_count")
    .eq("id", keyId)
    .single()

  if (data) {
    await supabase
      .from("api_keys")
      .update({ usage_count: data.usage_count + 1 })
      .eq("id", keyId)
  }
}

/**
 * Log a relay request.
 */
export async function logUsage(params: {
  userId: string
  apiKeyId: string
  endpoint: string
  statusCode: number
  upstreamTokenId: string | null
  responseTimeMs: number | null
}) {
  const supabase = getAdminClient()
  await supabase.from("usage_logs").insert({
    user_id: params.userId,
    api_key_id: params.apiKeyId,
    endpoint: params.endpoint,
    status_code: params.statusCode,
    upstream_token_id: params.upstreamTokenId,
    response_time_ms: params.responseTimeMs,
  })
}

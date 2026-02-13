import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, incrementUsage, logUsage } from "@/lib/relay/auth"
import { checkRateLimit } from "@/lib/relay/rate-limiter"
import { getNextToken, getAlternativeToken, reportTokenFailure, reportTokenSuccess } from "@/lib/relay/token-pool"

const MAX_RETRIES = 3

// The upstream jimeng-api base URL (deployed separately)
function getUpstreamUrl(): string {
  return process.env.UPSTREAM_API_URL || "http://localhost:8000"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRelay(request, await params, "GET")
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRelay(request, await params, "POST")
}

async function handleRelay(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  const startTime = Date.now()
  const path = "/" + params.path.join("/")
  const endpoint = `/v1${path}`

  // 1. Validate API key
  const authHeader = request.headers.get("authorization")
  const apiKey = await validateApiKey(authHeader)

  if (!apiKey) {
    return NextResponse.json(
      {
        error: {
          message: "Invalid or expired API key. Check your Authorization header.",
          type: "authentication_error",
          code: "invalid_api_key",
        },
      },
      { status: 401 }
    )
  }

  // 2. Check rate limit
  const rateCheck = checkRateLimit(apiKey.id, apiKey.rate_limit_per_minute)
  if (!rateCheck.allowed) {
    await logUsage({
      userId: apiKey.user_id,
      apiKeyId: apiKey.id,
      endpoint,
      statusCode: 429,
      upstreamTokenId: null,
      responseTimeMs: Date.now() - startTime,
    })

    return NextResponse.json(
      {
        error: {
          message: `Rate limit exceeded. Try again in ${Math.ceil(rateCheck.resetMs / 1000)}s.`,
          type: "rate_limit_error",
          code: "rate_limit_exceeded",
        },
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(apiKey.rate_limit_per_minute),
          "X-RateLimit-Remaining": String(rateCheck.remaining),
          "Retry-After": String(Math.ceil(rateCheck.resetMs / 1000)),
        },
      }
    )
  }

  // 3. Check usage quota
  if (apiKey.usage_quota !== -1 && apiKey.usage_count >= apiKey.usage_quota) {
    return NextResponse.json(
      {
        error: {
          message: "Usage quota exceeded for this API key.",
          type: "quota_error",
          code: "quota_exceeded",
        },
      },
      { status: 403 }
    )
  }

  // 4. Get upstream token via round-robin
  let token = await getNextToken()
  if (!token) {
    return NextResponse.json(
      {
        error: {
          message: "No available upstream tokens. Please contact the administrator.",
          type: "service_error",
          code: "no_tokens_available",
        },
      },
      { status: 503 }
    )
  }

  // 5. Forward request with retry logic
  let lastError: Error | null = null
  let lastStatusCode = 500

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (!token) break

    try {
      const upstreamUrl = `${getUpstreamUrl()}${endpoint}`

      // Build headers for upstream
      const upstreamHeaders: Record<string, string> = {
        Authorization: `Bearer ${token.token}`,
      }

      // Forward content-type
      const contentType = request.headers.get("content-type")
      if (contentType) {
        upstreamHeaders["Content-Type"] = contentType
      }

      // Forward the body
      let body: BodyInit | null = null
      if (method !== "GET") {
        body = await request.arrayBuffer().then(buf =>
          buf.byteLength > 0 ? Buffer.from(buf) : null
        )
      }

      const upstreamResponse = await fetch(upstreamUrl, {
        method,
        headers: upstreamHeaders,
        body,
      })

      const responseTime = Date.now() - startTime

      if (upstreamResponse.ok) {
        // Success
        await reportTokenSuccess(token.id)
        await incrementUsage(apiKey.id)
        await logUsage({
          userId: apiKey.user_id,
          apiKeyId: apiKey.id,
          endpoint,
          statusCode: upstreamResponse.status,
          upstreamTokenId: token.id,
          responseTimeMs: responseTime,
        })

        // Forward the response
        const responseBody = await upstreamResponse.text()
        return new NextResponse(responseBody, {
          status: upstreamResponse.status,
          headers: {
            "Content-Type": upstreamResponse.headers.get("Content-Type") || "application/json",
            "X-RateLimit-Limit": String(apiKey.rate_limit_per_minute),
            "X-RateLimit-Remaining": String(rateCheck.remaining),
            "X-Response-Time": `${responseTime}ms`,
          },
        })
      }

      // Non-OK response
      lastStatusCode = upstreamResponse.status

      // If it's a client error (4xx), don't retry, just forward
      if (upstreamResponse.status >= 400 && upstreamResponse.status < 500) {
        const responseBody = await upstreamResponse.text()
        await logUsage({
          userId: apiKey.user_id,
          apiKeyId: apiKey.id,
          endpoint,
          statusCode: upstreamResponse.status,
          upstreamTokenId: token.id,
          responseTimeMs: responseTime,
        })

        return new NextResponse(responseBody, {
          status: upstreamResponse.status,
          headers: {
            "Content-Type": upstreamResponse.headers.get("Content-Type") || "application/json",
          },
        })
      }

      // Server error (5xx) - mark failure and retry with different token
      await reportTokenFailure(token.id)
      lastError = new Error(`Upstream returned ${upstreamResponse.status}`)

      // Try alternative token
      token = await getAlternativeToken(token.id)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (token) {
        await reportTokenFailure(token.id)
        token = await getAlternativeToken(token.id)
      }
    }
  }

  // All retries exhausted
  const responseTime = Date.now() - startTime
  await logUsage({
    userId: apiKey.user_id,
    apiKeyId: apiKey.id,
    endpoint,
    statusCode: lastStatusCode,
    upstreamTokenId: null,
    responseTimeMs: responseTime,
  })

  return NextResponse.json(
    {
      error: {
        message: `Upstream service failed after ${MAX_RETRIES} retries: ${lastError?.message || "Unknown error"}`,
        type: "upstream_error",
        code: "upstream_failure",
      },
    },
    { status: 502 }
  )
}

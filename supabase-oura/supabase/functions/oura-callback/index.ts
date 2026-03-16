/**
 * Oura OAuth callback – Supabase Edge Function
 * Exchanges authorization code for tokens and redirects with tokens in URL fragment.
 * No tokens are stored on the server.
 */

const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token'

function redirect(location: string, status = 302) {
  return new Response(null, { status, headers: { Location: location } })
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const clientId = Deno.env.get('OURA_CLIENT_ID')
  const clientSecret = Deno.env.get('OURA_CLIENT_SECRET')
  const redirectUri = Deno.env.get('OURA_REDIRECT_URI')
  const defaultReturnUrl =
    Deno.env.get('OURA_RETURN_URL') || 'https://personalitymatrix.walkerjacob.com'

  if (!clientId || !clientSecret || !redirectUri) {
    return redirect(
      `${defaultReturnUrl}#error=oauth_config&error_description=callback_not_configured`
    )
  }

  if (error === 'access_denied') {
    const returnUrl = state || defaultReturnUrl
    return redirect(`${returnUrl}#error=access_denied`)
  }

  if (!code) {
    const returnUrl = state || defaultReturnUrl
    return redirect(`${returnUrl}#error=missing_code&error_description=no_authorization_code`)
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    })

    const tokenRes = await fetch(OURA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      const returnUrl = state || defaultReturnUrl
      return redirect(
        `${returnUrl}#error=token_exchange_failed&error_description=${encodeURIComponent(text)}`
      )
    }

    const data = (await tokenRes.json()) as {
      access_token: string
      refresh_token?: string
      expires_in?: number
    }

    const returnUrl = state || defaultReturnUrl
    const hash = new URLSearchParams({
      access_token: data.access_token,
      ...(data.refresh_token && { refresh_token: data.refresh_token }),
      ...(data.expires_in != null && { expires_in: String(data.expires_in) }),
    }).toString()

    return redirect(`${returnUrl}#${hash}`)
  } catch (err) {
    const returnUrl = state || defaultReturnUrl
    return redirect(
      `${returnUrl}#error=server_error&error_description=${encodeURIComponent(String(err))}`
    )
  }
})

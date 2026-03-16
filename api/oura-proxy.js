/**
 * Serverless proxy for Oura API v2. Used by the browser to avoid CORS.
 * Token is received in the request, used only to call Oura, and never stored or logged.
 * @see https://cloud.ouraring.com/v2/docs
 */

const OURA_BASE = 'https://api.ouraring.com/v2/usercollection'

function qs(params) {
  return new URLSearchParams(params).toString()
}

async function ouraFetchPage(token, path, startDate, endDate, nextToken = null) {
  const params = { start_date: startDate, end_date: endDate }
  if (nextToken) params.next_token = nextToken
  const url = `${OURA_BASE}${path}?${qs(params)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `Oura API ${res.status}`)
  }
  return res.json()
}

async function ouraFetchAll(token, path, startDate, endDate) {
  const allData = []
  let nextToken = null
  do {
    const json = await ouraFetchPage(token, path, startDate, endDate, nextToken)
    if (json.data && Array.isArray(json.data)) allData.push(...json.data)
    nextToken = json.next_token || null
  } while (nextToken)
  return allData
}

function safeErr(e) {
  const msg = e?.message || ''
  if (msg.includes('401') || msg.includes('Unauthorized'))
    return 'Connection expired or denied. Try connecting again.'
  if (msg.includes('403')) return 'Access denied. Check your Oura subscription and try again.'
  return 'Request failed. Try again later.'
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { token, startDate, endDate } = body || {}
    if (!token || !startDate || !endDate) {
      return Response.json(
        { errors: ['Missing token, startDate, or endDate.'] },
        { status: 400 }
      )
    }

    const errors = []
    let daily_sleep = { data: [] }
    let daily_readiness = { data: [] }
    let daily_activity = { data: [] }

    try {
      daily_sleep.data = await ouraFetchAll(token, '/daily_sleep', startDate, endDate)
    } catch (e) {
      daily_sleep.error = e.message
      errors.push(`Sleep: ${safeErr(e)}`)
    }
    try {
      daily_readiness.data = await ouraFetchAll(token, '/daily_readiness', startDate, endDate)
    } catch (e) {
      daily_readiness.error = e.message
      errors.push(`Readiness: ${safeErr(e)}`)
    }
    try {
      daily_activity.data = await ouraFetchAll(token, '/daily_activity', startDate, endDate)
    } catch (e) {
      daily_activity.error = e.message
      errors.push(`Activity: ${safeErr(e)}`)
    }

    return Response.json({
      daily_sleep,
      daily_readiness,
      daily_activity,
      errors,
    })
  } catch (e) {
    return Response.json(
      { errors: ['Proxy error. Try again later.'] },
      { status: 500 }
    )
  }
}

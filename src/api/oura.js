/**
 * Oura Ring API v2 client.
 * Docs: https://cloud.ouraring.com/v2/docs
 * Uses OAuth2; tokens are never logged or sent anywhere except to Oura.
 */

const OURA_BASE = 'https://api.ouraring.com/v2/usercollection';

function qs(params) {
  return new URLSearchParams(params).toString();
}

async function ouraFetchPage(token, path, startDate, endDate, nextToken = null) {
  const params = { start_date: startDate, end_date: endDate };
  if (nextToken) params.next_token = nextToken;
  const url = `${OURA_BASE}${path}?${qs(params)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Oura API ${res.status}`);
  }
  return res.json();
}

/** Fetch all pages for one endpoint (v2 uses next_token). */
async function ouraFetchAll(token, path, startDate, endDate) {
  const allData = [];
  let nextToken = null;
  do {
    const json = await ouraFetchPage(token, path, startDate, endDate, nextToken);
    if (json.data && Array.isArray(json.data)) allData.push(...json.data);
    nextToken = json.next_token || null;
  } while (nextToken);
  return allData;
}

/**
 * Fetch daily sleep, readiness, and activity for a date range.
 * v2 endpoints: daily_sleep, daily_readiness, daily_activity (see cloud.ouraring.com/v2/docs).
 * Returns { daily_sleep, daily_readiness, daily_activity, errors }.
 * errors[] contains user-safe messages if any request failed.
 */
export async function fetchOuraData(token, startDate, endDate) {
  const errors = [];
  const safeErr = (e) => {
    const msg = e?.message || '';
    if (msg.includes('401') || msg.includes('Unauthorized')) return 'Connection expired or denied. Try connecting again.';
    if (msg.includes('403')) return 'Access denied. Check your Oura subscription and try again.';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS'))
      return 'Could not reach Oura from this browser. Try the desktop app or try again later.';
    return 'Request failed. Try again later.';
  };

  let daily_sleep = { data: [] };
  let daily_readiness = { data: [] };
  let daily_activity = { data: [] };

  try {
    daily_sleep.data = await ouraFetchAll(token, '/daily_sleep', startDate, endDate);
  } catch (e) {
    daily_sleep.error = e.message;
    errors.push(`Sleep: ${safeErr(e)}`);
  }
  try {
    daily_readiness.data = await ouraFetchAll(token, '/daily_readiness', startDate, endDate);
  } catch (e) {
    daily_readiness.error = e.message;
    errors.push(`Readiness: ${safeErr(e)}`);
  }
  try {
    daily_activity.data = await ouraFetchAll(token, '/daily_activity', startDate, endDate);
  } catch (e) {
    daily_activity.error = e.message;
    errors.push(`Activity: ${safeErr(e)}`);
  }

  return { daily_sleep, daily_readiness, daily_activity, errors };
}

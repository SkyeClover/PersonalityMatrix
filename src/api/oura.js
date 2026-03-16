/**
 * Oura Ring API v2 client.
 * Personal Access Token: https://cloud.ouraring.com/personal-access-tokens
 * Docs: https://cloud.ouraring.com/v2/docs
 */

const OURA_BASE = 'https://api.ouraring.com/v2/usercollection';

function qs(params) {
  return new URLSearchParams(params).toString();
}

async function ouraFetch(token, path, startDate, endDate) {
  const url = `${OURA_BASE}${path}?${qs({ start_date: startDate, end_date: endDate })}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Oura API ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch daily sleep, readiness, and activity for a date range.
 * Uses daily summary endpoints per https://cloud.ouraring.com/v2/docs:
 * - daily_sleep: data[].day, data[].score
 * - daily_readiness: data[].day, data[].score
 * - daily_activity: data[].day, data[].steps, data[].active_calories
 */
export async function fetchOuraData(token, startDate, endDate) {
  const [daily_sleep, daily_readiness, daily_activity] = await Promise.all([
    ouraFetch(token, '/daily_sleep', startDate, endDate).catch((e) => ({ data: [], error: e.message })),
    ouraFetch(token, '/daily_readiness', startDate, endDate).catch((e) => ({ data: [], error: e.message })),
    ouraFetch(token, '/daily_activity', startDate, endDate).catch((e) => ({ data: [], error: e.message })),
  ]);
  return { daily_sleep, daily_readiness, daily_activity };
}

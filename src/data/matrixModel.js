/**
 * Daily check-in model: morning + evening, goals, diary, progress over time.
 * Matrix nodes = 8 dimensions you rate (how you're feeling).
 */

const STORAGE_KEY = 'personality-matrix-days';
const LEGACY_KEY = 'personality-matrix-checkins';
const OURA_TOKEN_KEY = 'personality-matrix-oura-token';
const OURA_REFRESH_TOKEN_KEY = 'personality-matrix-oura-refresh-token';
const OURA_EXPIRES_AT_KEY = 'personality-matrix-oura-expires-at';

/** Dimensions to measure how someone is feeling (1–5) — used in both morning and evening */
export const DEFAULT_NODES = [
  { id: 'energy', label: 'Energy' },
  { id: 'mood', label: 'Mood' },
  { id: 'focus', label: 'Focus' },
  { id: 'calm', label: 'Calm' },
  { id: 'motivation', label: 'Motivation' },
  { id: 'gratitude', label: 'Gratitude' },
  { id: 'connection', label: 'Connection' },
  { id: 'balance', label: 'Balance' },
];

const EMPTY_RATINGS = Object.fromEntries(DEFAULT_NODES.map((n) => [n.id, null]));

export function ratingToState(rating) {
  if (rating == null || rating < 1) return 'unset';
  if (rating <= 2) return 'low';
  if (rating <= 3) return 'balanced';
  return 'high';
}

function emptyMorning() {
  return {
    note: '',
    focus: '',
    ratings: { ...EMPTY_RATINGS },
    sleepQuality: null,
  };
}

function emptyEvening() {
  return {
    note: '',
    ratings: { ...EMPTY_RATINGS },
    daySatisfaction: null,
  };
}

/** Stats from Oura or manual — stored per day */
function emptyStats() {
  return {
    sleepScore: null,      // Oura sleep score 0–100
    readinessScore: null,  // Oura readiness 0–100
    steps: null,
    activeCalories: null,
  };
}

/** Full day record */
export function createEmptyDay() {
  return {
    morning: emptyMorning(),
    evening: emptyEvening(),
    goals: [],
    diary: '',
    stats: emptyStats(),
  };
}

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

/** Migrate old format (single check-in) to new (morning + evening) */
function migrateOldFormat(all) {
  let changed = false;
  for (const dateKey of Object.keys(all)) {
    const d = all[dateKey];
    if (d.morning != null && d.evening != null) continue;
    const legacy = d.focus != null || d.ratings != null;
    if (legacy) {
      all[dateKey] = {
        morning: {
          note: '',
          focus: d.focus ?? '',
          ratings: { ...EMPTY_RATINGS, ...(d.ratings || {}) },
          sleepQuality: d.sleepQuality ?? null,
        },
        evening: emptyEvening(),
        goals: d.goals ?? [],
        diary: d.diary ?? '',
        stats: d.stats ? { ...emptyStats(), ...d.stats } : emptyStats(),
      };
      changed = true;
    } else if (d.morning && d.evening && d.stats === undefined) {
      d.stats = emptyStats();
      changed = true;
    }
  }
  return changed;
}

function loadRawLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function loadDays() {
  let all = loadRaw();
  if (Object.keys(all).length === 0) {
    const legacy = loadRawLegacy();
    if (Object.keys(legacy).length > 0) {
      all = {};
      for (const dateKey of Object.keys(legacy)) {
        const d = legacy[dateKey];
        all[dateKey] = {
          morning: {
            note: '',
            focus: d.focus ?? '',
            ratings: { ...EMPTY_RATINGS, ...(d.ratings || {}) },
            sleepQuality: null,
          },
          evening: emptyEvening(),
          goals: [],
          diary: '',
          stats: emptyStats(),
        };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  }
  if (Object.keys(all).length > 0) migrateOldFormat(all);
  return all;
}

export function getDay(dateKey) {
  const all = loadDays();
  const existing = all[dateKey];
  if (existing) {
    return {
      ...createEmptyDay(),
      morning: { ...emptyMorning(), ...existing.morning, ratings: { ...EMPTY_RATINGS, ...existing.morning?.ratings } },
      evening: { ...emptyEvening(), ...existing.evening, ratings: { ...EMPTY_RATINGS, ...existing.evening?.ratings } },
      goals: Array.isArray(existing.goals) ? existing.goals : [],
      diary: existing.diary ?? '',
      stats: { ...emptyStats(), ...existing.stats },
    };
  }
  return createEmptyDay();
}

/** Stats for a single day (for display in matrix/sidebar). */
export function getDayStats(dateKey) {
  const day = getDay(dateKey);
  return day?.stats ? { ...emptyStats(), ...day.stats } : emptyStats();
}

/** Build a synthetic "average" block from 14-day morning averages for the Progress matrix view. */
export function getAverageMorningBlock(lastNDays = 14) {
  const trends = getTrends(lastNDays);
  const ratings = {};
  DEFAULT_NODES.forEach((n) => {
    const v = trends.morningAvgs[n.id];
    ratings[n.id] = v != null ? Math.round(v) : null;
  });
  return {
    ratings,
    focus: '14-day avg',
    note: '',
    sleepQuality: null,
  };
}

export function saveDay(dateKey, day) {
  const all = loadDays();
  all[dateKey] = {
    morning: { ...day.morning, ratings: { ...day.morning.ratings } },
    evening: { ...day.evening, ratings: { ...day.evening.ratings } },
    goals: [...(day.goals || [])],
    diary: day.diary ?? '',
    stats: { ...emptyStats(), ...(day.stats || {}) },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

/** Build matrix state for 3D view from morning or evening block */
export function blockToMatrix(block, coreLabel, coreValue) {
  const nodes = DEFAULT_NODES.map((n) => ({
    id: n.id,
    label: n.label,
    rating: block.ratings[n.id] ?? null,
    state: ratingToState(block.ratings[n.id]),
  }));
  return {
    core: { label: coreLabel, value: coreValue || '—' },
    nodes,
  };
}

/** Get trends for last N days: averages per dimension for morning and evening */
export function getTrends(lastNDays = 14) {
  const all = loadDays();
  const keys = Object.keys(all).sort().slice(-lastNDays);
  const morningSums = { ...EMPTY_RATINGS };
  const eveningSums = { ...EMPTY_RATINGS };
  let morningCount = 0;
  let eveningCount = 0;
  let goalsTotal = 0;
  let goalsDone = 0;

  for (const key of keys) {
    const day = all[key];
    if (!day) continue;
    const m = day.morning?.ratings;
    const e = day.evening?.ratings;
    if (m) {
      DEFAULT_NODES.forEach((n) => {
        if (m[n.id] != null) {
          morningSums[n.id] = (morningSums[n.id] ?? 0) + m[n.id];
        }
      });
      morningCount++;
    }
    if (e) {
      DEFAULT_NODES.forEach((n) => {
        if (e[n.id] != null) {
          eveningSums[n.id] = (eveningSums[n.id] ?? 0) + e[n.id];
        }
      });
      eveningCount++;
    }
    const goals = day.goals || [];
    goalsTotal += goals.length;
    goalsDone += goals.filter((g) => g.completed).length;
  }

  const morningAvgs = {};
  const eveningAvgs = {};
  DEFAULT_NODES.forEach((n) => {
    morningAvgs[n.id] = morningCount > 0 && morningSums[n.id] != null
      ? Math.round((morningSums[n.id] / morningCount) * 10) / 10
      : null;
    eveningAvgs[n.id] = eveningCount > 0 && eveningSums[n.id] != null
      ? Math.round((eveningSums[n.id] / eveningCount) * 10) / 10
      : null;
  });

  return {
    daysIncluded: keys.length,
    morningCount,
    eveningCount,
    morningAvgs,
    eveningAvgs,
    goalCompletion: goalsTotal > 0 ? Math.round((goalsDone / goalsTotal) * 100) : null,
    goalCount: goalsTotal,
    goalDone: goalsDone,
  };
}

export function generateGoalId() {
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ——— Oura token (stored in localStorage; not encrypted) ———
export function getOuraToken() {
  return localStorage.getItem(OURA_TOKEN_KEY) || '';
}

export function setOuraToken(token) {
  if (token) localStorage.setItem(OURA_TOKEN_KEY, token.trim());
  else localStorage.removeItem(OURA_TOKEN_KEY);
}

export function getOuraRefreshToken() {
  return localStorage.getItem(OURA_REFRESH_TOKEN_KEY) || '';
}

export function setOuraRefreshToken(token) {
  if (token) localStorage.setItem(OURA_REFRESH_TOKEN_KEY, token.trim());
  else localStorage.removeItem(OURA_REFRESH_TOKEN_KEY);
}

export function setOuraExpiresAt(expiresAtMs) {
  if (expiresAtMs != null) localStorage.setItem(OURA_EXPIRES_AT_KEY, String(expiresAtMs));
  else localStorage.removeItem(OURA_EXPIRES_AT_KEY);
}

/** Merge Oura API v2 responses into day records by date. */
export function mergeOuraIntoDays(ouraData) {
  const all = loadDays();
  const updatedKeys = new Set();
  const merge = (dateKey, fields) => {
    if (!dateKey || typeof dateKey !== 'string') return;
    const key = dateKey.slice(0, 10);
    if (!all[key]) all[key] = { morning: emptyMorning(), evening: emptyEvening(), goals: [], diary: '', stats: emptyStats() };
    if (!all[key].stats) all[key].stats = emptyStats();
    Object.assign(all[key].stats, fields);
    updatedKeys.add(key);
  };
  // daily_sleep: { data: [ { day, score } ] }
  (ouraData.daily_sleep?.data || ouraData.sleep?.data || []).forEach((s) => {
    const day = s.day ?? s.date;
    merge(day, { sleepScore: s.score ?? null });
  });
  // daily_readiness: { data: [ { day, score } ] }
  (ouraData.daily_readiness?.data || ouraData.readiness?.data || []).forEach((r) => {
    const day = r.day ?? r.date;
    merge(day, { readinessScore: r.score ?? null });
  });
  // daily_activity: { data: [ { day, steps, active_calories } ] }
  (ouraData.daily_activity?.data || ouraData.activity?.data || []).forEach((a) => {
    const day = a.day ?? a.date;
    merge(day, {
      steps: a.steps ?? null,
      activeCalories: a.active_calories ?? null,
    });
  });
  if (updatedKeys.size > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return updatedKeys.size;
}

/** Get stats for the last N days (for Progress / stats view). */
export function getStatsTrends(lastNDays = 14) {
  const all = loadDays();
  const keys = Object.keys(all).sort().slice(-lastNDays);
  return keys.map((dateKey) => {
    const d = all[dateKey];
    const stats = d?.stats ?? emptyStats();
    return {
      dateKey,
      sleepScore: stats.sleepScore ?? null,
      readinessScore: stats.readinessScore ?? null,
      steps: stats.steps ?? null,
      activeCalories: stats.activeCalories ?? null,
      manualSleepQuality: d?.morning?.sleepQuality ?? null,
    };
  });
}

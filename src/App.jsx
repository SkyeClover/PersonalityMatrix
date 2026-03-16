import React, { useState, useEffect, useCallback } from 'react';
import PersonalityMatrix3D from './components/PersonalityMatrix3D';
import {
  getTodayKey,
  getDay,
  saveDay,
  blockToMatrix,
  getTrends,
  getStatsTrends,
  getOuraToken,
  setOuraToken,
  setOuraRefreshToken,
  setOuraExpiresAt,
  mergeOuraIntoDays,
  DEFAULT_NODES,
  generateGoalId,
} from './data/matrixModel';
import { fetchOuraData } from './api/oura';

const TABS = ['Morning', 'Evening', 'Daily log', 'Progress'];

function RatingRow({ node, value, onChange }) {
  return (
    <li className="rating-row">
      <span className="rating-label">{node.label}</span>
      <div className="rating-dots">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`rating-dot ${value === n ? 'active' : ''}`}
            onClick={() => onChange(n)}
            aria-label={`${node.label} ${n}`}
          >
            {n}
          </button>
        ))}
      </div>
    </li>
  );
}

function GoalsList({ goals, onToggle, onAdd, onRemove, readOnly }) {
  const [newText, setNewText] = useState('');
  const handleAdd = () => {
    const t = newText.trim();
    if (t) {
      onAdd({ id: generateGoalId(), text: t, completed: false });
      setNewText('');
    }
  };
  return (
    <div className="goals-block">
      <span className="label-text">Today’s goals</span>
      <ul className="goals-list">
        {goals.map((g) => (
          <li key={g.id} className="goal-item">
            <label className="goal-check">
              <input
                type="checkbox"
                checked={!!g.completed}
                onChange={() => onToggle(g.id)}
                disabled={readOnly}
              />
              <span className={g.completed ? 'goal-done' : ''}>{g.text}</span>
            </label>
            {!readOnly && (
              <button
                type="button"
                className="goal-remove"
                onClick={() => onRemove(g.id)}
                aria-label="Remove goal"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <div className="goal-add">
          <input
            type="text"
            className="focus-input"
            placeholder="Add a goal…"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button type="button" className="add-goal-btn" onClick={handleAdd}>
            Add
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [dateKey, setDateKey] = useState(getTodayKey);
  const [tab, setTab] = useState('Morning');
  const [day, setDay] = useState(() => getDay(getTodayKey()));
  const [saved, setSaved] = useState(false);
  const [ouraTokenInput, setOuraTokenInput] = useState(getOuraToken);
  const [ouraFetching, setOuraFetching] = useState(false);
  const [ouraError, setOuraError] = useState(null);
  const [ouraSuccess, setOuraSuccess] = useState(null);

  // Parse OAuth callback hash on load (Supabase redirects here with #access_token=...&refresh_token=...&expires_in=...)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.hash) return;
    const hash = window.location.hash.slice(1);
    const params = Object.fromEntries(new URLSearchParams(hash));
    if (params.error) {
      setOuraError(params.error_description || params.error);
      setOuraTokenInput('');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return;
    }
    if (params.access_token) {
      setOuraToken(params.access_token);
      setOuraTokenInput(params.access_token);
      if (params.refresh_token) setOuraRefreshToken(params.refresh_token);
      if (params.expires_in) {
        const expiresAt = Date.now() + Number(params.expires_in) * 1000;
        setOuraExpiresAt(expiresAt);
      }
      setOuraSuccess('Connected with Oura. You can fetch data below.');
      setTimeout(() => setOuraSuccess(null), 5000);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const loadDay = useCallback((key) => {
    setDay(getDay(key));
  }, []);

  useEffect(() => {
    loadDay(dateKey);
  }, [dateKey, loadDay]);

  const persist = useCallback(() => {
    saveDay(dateKey, day);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [dateKey, day]);

  const updateMorning = (updates) => {
    setDay((d) => ({ ...d, morning: { ...d.morning, ...updates } }));
    setSaved(false);
  };
  const updateEvening = (updates) => {
    setDay((d) => ({ ...d, evening: { ...d.evening, ...updates } }));
    setSaved(false);
  };
  const setGoals = (goals) => {
    setDay((d) => ({ ...d, goals }));
    setSaved(false);
  };
  const setDiary = (diary) => {
    setDay((d) => ({ ...d, diary }));
    setSaved(false);
  };

  const handleMorningRating = (id, n) => {
    updateMorning({ ratings: { ...day.morning.ratings, [id]: n } });
  };
  const handleEveningRating = (id, n) => {
    updateEvening({ ratings: { ...day.evening.ratings, [id]: n } });
  };
  const toggleGoal = (id) => {
    setGoals(
      day.goals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
  };
  const addGoal = (goal) => setGoals([...day.goals, goal]);
  const removeGoal = (id) => setGoals(day.goals.filter((g) => g.id !== id));

  const matrixSource = tab === 'Morning' ? day.morning : day.evening;
  const statsTrends = getStatsTrends(14);

  const handleSaveOuraToken = () => {
    setOuraToken(ouraTokenInput);
    setOuraError(null);
    setOuraSuccess('Token saved.');
    setTimeout(() => setOuraSuccess(null), 3000);
  };

  const ouraClientId = import.meta.env.VITE_OURA_CLIENT_ID;
  const ouraCallbackUrl = import.meta.env.VITE_OURA_OAUTH_CALLBACK_URL;

  const handleConnectOura = () => {
    if (!ouraClientId || !ouraCallbackUrl) {
      setOuraError('OAuth not configured: set VITE_OURA_CLIENT_ID and VITE_OURA_OAUTH_CALLBACK_URL.');
      return;
    }
    setOuraError(null);
    const origin = typeof window !== 'undefined' && window.location.origin?.startsWith('http')
      ? window.location.origin + window.location.pathname
      : 'http://localhost:5173';
    const state = encodeURIComponent(origin);
    const authUrl = `https://cloud.ouraring.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(ouraClientId)}&redirect_uri=${encodeURIComponent(ouraCallbackUrl)}&scope=daily&state=${state}`;
    window.location.href = authUrl;
  };

  const handleFetchOura = async () => {
    const token = ouraTokenInput.trim() || getOuraToken();
    if (!token) {
      setOuraError('Enter your Oura Personal Access Token first.');
      return;
    }
    setOuraToken(token);
    setOuraFetching(true);
    setOuraError(null);
    setOuraSuccess(null);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 14);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);
    try {
      let data;
      if (typeof window !== 'undefined' && window.electronAPI?.fetchOura) {
        data = await window.electronAPI.fetchOura(token, startDate, endDate);
      } else {
        data = await fetchOuraData(token, startDate, endDate);
      }
      const updated = mergeOuraIntoDays(data);
      setOuraSuccess(`Imported ${updated} days from Oura.`);
      setTimeout(() => setOuraSuccess(null), 4000);
      setDay(getDay(dateKey));
    } catch (err) {
      setOuraError(err?.message || 'Fetch failed. In browser, CORS may block Oura — try the Electron app.');
    } finally {
      setOuraFetching(false);
    }
  };

  const matrix = blockToMatrix(
    matrixSource,
    tab === 'Morning' ? "Morning focus" : "Evening reflection",
    tab === 'Morning' ? day.morning.focus : null
  );
  const trends = getTrends(14);
  const isToday = dateKey === getTodayKey();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-row">
          <h1>Personality Matrix</h1>
          <div className="header-date">
            <input
              type="date"
              className="date-picker"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
            />
            {saved && <span className="saved-badge">Saved</span>}
          </div>
        </div>
        <p className="tagline">Daily check-in · Morning & evening · Goals · Daily log · Progress</p>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <nav className="tabs">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                className={`tab ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </nav>

          <div className="panel">
            {tab === 'Morning' && (
              <>
                <section className="checkin-section">
                  <h2 className="sidebar-title">Start of day</h2>
                  <label className="focus-label">
                    <span className="label-text">Focus or intention</span>
                    <input
                      type="text"
                      className="focus-input"
                      placeholder="e.g. Steady, Present, One thing"
                      value={day.morning.focus}
                      onChange={(e) => updateMorning({ focus: e.target.value })}
                    />
                  </label>
                  <GoalsList
                    goals={day.goals}
                    onToggle={toggleGoal}
                    onAdd={addGoal}
                    onRemove={removeGoal}
                    readOnly={false}
                  />
                  <div className="ratings-block">
                    <span className="label-text">How you feel (1–5)</span>
                    <ul className="ratings-list">
                      {DEFAULT_NODES.map((node) => (
                        <RatingRow
                          key={node.id}
                          node={node}
                          value={day.morning.ratings[node.id]}
                          onChange={(n) => handleMorningRating(node.id, n)}
                        />
                      ))}
                    </ul>
                  </div>
                  <label className="focus-label">
                    <span className="label-text">Sleep quality (1–5)</span>
                    <div className="rating-dots sleep-dots">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`rating-dot ${day.morning.sleepQuality === n ? 'active' : ''}`}
                          onClick={() => updateMorning({ sleepQuality: n })}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="focus-label">
                    <span className="label-text">Morning note</span>
                    <textarea
                      className="diary-input"
                      placeholder="Optional note…"
                      rows={2}
                      value={day.morning.note}
                      onChange={(e) => updateMorning({ note: e.target.value })}
                    />
                  </label>
                  <button type="button" className="save-btn" onClick={persist}>
                    Save morning
                  </button>
                </section>
              </>
            )}

            {tab === 'Evening' && (
              <>
                <section className="checkin-section">
                  <h2 className="sidebar-title">End of day</h2>
                  <GoalsList
                    goals={day.goals}
                    onToggle={toggleGoal}
                    onAdd={addGoal}
                    onRemove={removeGoal}
                    readOnly={false}
                  />
                  <div className="ratings-block">
                    <span className="label-text">How you feel now (1–5)</span>
                    <ul className="ratings-list">
                      {DEFAULT_NODES.map((node) => (
                        <RatingRow
                          key={node.id}
                          node={node}
                          value={day.evening.ratings[node.id]}
                          onChange={(n) => handleEveningRating(node.id, n)}
                        />
                      ))}
                    </ul>
                  </div>
                  <label className="focus-label">
                    <span className="label-text">Day satisfaction (1–5)</span>
                    <div className="rating-dots sleep-dots">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`rating-dot ${day.evening.daySatisfaction === n ? 'active' : ''}`}
                          onClick={() => updateEvening({ daySatisfaction: n })}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="focus-label">
                    <span className="label-text">Evening note</span>
                    <textarea
                      className="diary-input"
                      placeholder="How did the day go?"
                      rows={2}
                      value={day.evening.note}
                      onChange={(e) => updateEvening({ note: e.target.value })}
                    />
                  </label>
                  <button type="button" className="save-btn" onClick={persist}>
                    Save evening
                  </button>
                </section>
              </>
            )}

            {tab === 'Daily log' && (
              <section className="diary-section">
                <h2 className="sidebar-title">Daily log</h2>
                <p className="label-text">Freeform notes for {dateKey}</p>
                <textarea
                  className="diary-textarea"
                  placeholder="Write whatever you want to remember from today…"
                  value={day.diary}
                  onChange={(e) => setDiary(e.target.value)}
                  rows={12}
                />
                <button type="button" className="save-btn" onClick={persist}>
                  Save log
                </button>
              </section>
            )}

            {tab === 'Progress' && (
              <section className="progress-section">
                <h2 className="sidebar-title">Progress</h2>
                <p className="label-text">Last 14 days · averages</p>
                <div className="trend-grid">
                  {DEFAULT_NODES.map((node) => (
                    <div key={node.id} className="trend-row">
                      <span className="trend-label">{node.label}</span>
                      <div className="trend-bars">
                        <span className="trend-bar-wrap" title={`Morning avg: ${trends.morningAvgs[node.id] ?? '—'}`}>
                          <span className="trend-bar morning" style={{ width: `${((trends.morningAvgs[node.id] ?? 0) / 5) * 100}%` }} />
                        </span>
                        <span className="trend-bar-wrap" title={`Evening avg: ${trends.eveningAvgs[node.id] ?? '—'}`}>
                          <span className="trend-bar evening" style={{ width: `${((trends.eveningAvgs[node.id] ?? 0) / 5) * 100}%` }} />
                        </span>
                      </div>
                      <span className="trend-nums">
                        M {trends.morningAvgs[node.id] ?? '—'} · E {trends.eveningAvgs[node.id] ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="goal-progress">
                  <span className="label-text">Goal completion</span>
                  <p className="goal-stats">
                    {trends.goalCompletion != null
                      ? `${trends.goalDone} / ${trends.goalCount} completed (${trends.goalCompletion}%)`
                      : 'No goals logged yet'}
                  </p>
                </div>

                <div className="stats-block">
                  <h3 className="stats-heading">Stats</h3>
                  <p className="label-text">Sleep · Readiness · Steps (Oura or manual)</p>
                  <div className="stats-table">
                    <div className="stats-row stats-header">
                      <span>Date</span>
                      <span>Sleep</span>
                      <span>Readiness</span>
                      <span>Steps</span>
                    </div>
                    {statsTrends.slice().reverse().map((s) => (
                      <div key={s.dateKey} className="stats-row">
                        <span className="stats-date">{s.dateKey}</span>
                        <span>{s.sleepScore != null ? s.sleepScore : (s.manualSleepQuality != null ? `M${s.manualSleepQuality}` : '—')}</span>
                        <span>{s.readinessScore != null ? s.readinessScore : '—'}</span>
                        <span>{s.steps != null ? s.steps.toLocaleString() : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="oura-block">
                  <h3 className="stats-heading">Oura Ring</h3>
                  {ouraCallbackUrl ? (
                    <p className="label-text">Connect with Oura (recommended) or paste a Personal Access Token below.</p>
                  ) : (
                    <p className="label-text">Personal Access Token from <a href="https://cloud.ouraring.com/personal-access-tokens" target="_blank" rel="noopener noreferrer">cloud.ouraring.com</a></p>
                  )}
                  {ouraClientId && ouraCallbackUrl && (
                    <div className="oura-actions" style={{ marginBottom: '0.5rem' }}>
                      <button type="button" className="save-btn" onClick={handleConnectOura}>
                        Connect with Oura
                      </button>
                    </div>
                  )}
                  <input
                    type="password"
                    className="focus-input oura-token-input"
                    placeholder="Or paste token (stored locally only)"
                    value={ouraTokenInput}
                    onChange={(e) => setOuraTokenInput(e.target.value)}
                  />
                  <div className="oura-actions">
                    <button type="button" className="save-btn secondary" onClick={handleSaveOuraToken}>
                      Save token
                    </button>
                    <button type="button" className="save-btn" onClick={handleFetchOura} disabled={ouraFetching}>
                      {ouraFetching ? 'Fetching…' : 'Fetch last 14 days'}
                    </button>
                  </div>
                  {ouraError && <p className="oura-message error">{ouraError}</p>}
                  {ouraSuccess && <p className="oura-message success">{ouraSuccess}</p>}
                </div>
              </section>
            )}
          </div>
        </aside>

        <main className="matrix-container">
          {tab !== 'Progress' ? (
            <PersonalityMatrix3D matrix={matrix} />
          ) : (
            <div className="progress-hero">
              <p className="progress-hero-text">Your matrix reflects morning or evening check-ins. Switch to Morning or Evening to see it.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

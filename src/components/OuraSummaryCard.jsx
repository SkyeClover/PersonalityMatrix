import React from 'react'

/** Score band color (Oura 0–100): low / mid / high */
export function scoreColor(score) {
  if (score == null) return 'var(--text-muted)'
  if (score >= 70) return 'var(--node-strong)'
  if (score >= 50) return 'var(--node-flux)'
  return '#b85c5c'
}

export default function OuraSummaryCard({ stats, title = "Today's Oura", compact }) {
  const { sleepScore, readinessScore, steps } = stats || {}
  const hasAny = sleepScore != null || readinessScore != null || steps != null
  if (!hasAny) return null

  return (
    <div className={`oura-summary-card ${compact ? 'oura-summary-card--compact' : ''}`}>
      {title && <span className="oura-summary-title">{title}</span>}
      <div className="oura-summary-grid">
        {sleepScore != null && (
          <div className="oura-summary-item">
            <span className="oura-summary-label">Sleep</span>
            <span className="oura-summary-value" style={{ color: scoreColor(sleepScore) }}>
              {sleepScore}
            </span>
          </div>
        )}
        {readinessScore != null && (
          <div className="oura-summary-item">
            <span className="oura-summary-label">Readiness</span>
            <span className="oura-summary-value" style={{ color: scoreColor(readinessScore) }}>
              {readinessScore}
            </span>
          </div>
        )}
        {steps != null && (
          <div className="oura-summary-item">
            <span className="oura-summary-label">Steps</span>
            <span className="oura-summary-value">{steps.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}

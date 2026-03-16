import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Privacy() {
  useEffect(() => {
    document.title = 'Privacy Policy · Personality Matrix'
    return () => { document.title = 'Personality Matrix' }
  }, [])
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-row">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h1>Personality Matrix</h1>
          </Link>
          <Link to="/" className="legal-back" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>
            ← Back to app
          </Link>
        </div>
      </header>
      <main className="legal-page">
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: March 2026</p>

        <p>
          This privacy policy applies to personalitymatrix.walkerjacob.com (the Personality Matrix
          daily check-in app) and any related tools or features on this site.
        </p>

        <h2>We do not collect personal data</h2>
        <p>
          We do not collect, store, or transmit your personal data. The Personality Matrix app and
          any associated tools are designed to run without requiring you to provide personal
          information to us.
        </p>

        <h2>Oura data stays on your device</h2>
        <p>
          Any data from your Oura Ring account (including health, sleep, or activity data) is used
          only in your browser or on your device. This data is not sent to our servers and is not
          stored by us. Processing happens locally so your Oura data never leaves your control.
        </p>

        <h2>We do not store tokens on our servers</h2>
        <p>
          If you connect your Oura account in the Personality Matrix app, any access tokens or
          credentials are used only in your browser or on your device. We do not store Oura tokens,
          API keys, or other authentication data on our servers.
        </p>

        <h2>Questions</h2>
        <p>
          If you have questions about this privacy policy, you can reach out via{' '}
          <a href="https://www.walkerjacob.com" target="_blank" rel="noopener noreferrer">
            walkerjacob.com
          </a>
          .
        </p>
      </main>
    </div>
  )
}

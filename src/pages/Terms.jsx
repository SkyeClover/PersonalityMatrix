import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Terms() {
  useEffect(() => {
    document.title = 'Terms of Service · Personality Matrix'
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
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-updated">Last updated: March 2026</p>

        <p>
          These terms apply to your use of personalitymatrix.walkerjacob.com (the Personality Matrix
          daily check-in app) and any related tools or features on this site.
        </p>

        <h2>Use of the site</h2>
        <p>
          You may use this site and its tools for personal, non-commercial purposes. Do not use them
          in any way that violates applicable laws or the rights of others.
        </p>

        <h2>Oura integration</h2>
        <p>
          If you connect your Oura account, you do so under Oura’s own terms and API policies. Data
          from Oura is used only in your browser or on your device and is not stored on our servers.
          We are not responsible for Oura’s services or how they handle your data.
        </p>

        <h2>No warranty</h2>
        <p>
          This site and the Personality Matrix app are provided “as is.” We do not guarantee
          accuracy, availability, or fitness for any particular purpose. Health-related information
          is not medical advice.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, we are not liable for any indirect, incidental, or
          consequential damages arising from your use of this site or its tools.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms from time to time. The “Last updated” date at the top reflects
          the most recent change. Continued use of the site after changes constitutes acceptance of
          the updated terms.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about these terms, you can reach out via{' '}
          <a href="https://www.walkerjacob.com" target="_blank" rel="noopener noreferrer">
            walkerjacob.com
          </a>
          .
        </p>
      </main>
    </div>
  )
}

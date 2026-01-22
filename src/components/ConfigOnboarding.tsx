import React from 'react';

type Props = {
  missing: string[];
};

const Onboarding: React.FC<Props> = ({ missing }) => {
  return (
    <div style={{ padding: 20, fontFamily: 'Inter, system-ui, sans-serif', color: '#0b1020' }}>
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <div style={{ fontSize: 56, fontWeight: 800, color: '#1f2a8a' }}>⚠</div>
        <h1 style={{ fontSize: 40, margin: '12px 0' }}>Configuration Required</h1>
        <p style={{ fontSize: 18, maxWidth: 720, margin: '0 auto' }}>
          Your OCR system is missing critical configuration. Please complete the onboarding so the app can read contracts.
        </p>
        <div style={{ marginTop: 24, display: 'inline-block', textAlign: 'left' }}>
          <strong>Missing keys:</strong>
          <ul>
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
        <div style={{ marginTop: 16, fontSize: 14, color: '#555' }}>
          Recommended actions:
          <ol>
            <li>Set environment variables in your local environment or CI (ANTHROPIC_API_KEY or VITE_ANTHROPIC_API_KEY).</li>
            <li>Ensure the key has read/usage permissions for Claude API access.</li>
            <li>Rebuild and redeploy the app after updating the keys.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

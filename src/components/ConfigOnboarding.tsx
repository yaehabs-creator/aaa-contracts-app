import React, { useEffect, useState } from 'react';
import { CLAUDE_MODEL_ORDER, CLAUDE_DEFAULT_MODEL } from '../config/claudeModels';
import { getCurrentClaudeModel, setClaudeModelOverride } from '../config/claudeRuntime';

type Props = {
  missing: string[];
};

const Onboarding: React.FC<Props> = ({ missing }) => {
  const [selected, setSelected] = useState<string>('default');
  useEffect(() => {
    const m = getCurrentClaudeModel();
    // Normalize to 'default' if matches default
    const display = m === CLAUDE_DEFAULT_MODEL ? 'default' : m;
    setSelected(display);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelected(value);
    if (value === 'default') {
      setClaudeModelOverride('');
    } else {
      setClaudeModelOverride(value);
    }
  };
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
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Claude Model</label>
          <select value={selected} onChange={handleChange} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db' }}>
            <option value="default">Default (claude-3)</option>
            {CLAUDE_MODEL_ORDER.filter(m => m !== CLAUDE_DEFAULT_MODEL).map((m) => (
              <option value={m} key={m}>{m}</option>
            ))}
          </select>
          <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>
            Override persists in this browser.
          </div>
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

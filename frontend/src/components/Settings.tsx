import React, { useState, useEffect } from 'react';
import { Key, ShieldAlert, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ApiKeys {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
}

interface SettingsProps {
  keys: ApiKeys;
  setKeys: React.Dispatch<React.SetStateAction<ApiKeys>>;
  useAiClassifier: boolean;
  setUseAiClassifier: (val: boolean) => void;
  backendUrl: string;
}

export default function Settings({ keys, setKeys, useAiClassifier, setUseAiClassifier, backendUrl }: SettingsProps) {
  const [geminiInput, setGeminiInput] = useState(keys.GEMINI_API_KEY || '');
  const [openaiInput, setOpenaiInput] = useState(keys.OPENAI_API_KEY || '');
  const [anthropicInput, setAnthropicInput] = useState(keys.ANTHROPIC_API_KEY || '');
  
  const [isSaved, setIsSaved] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState('');

  useEffect(() => {
    setGeminiInput(keys.GEMINI_API_KEY || '');
    setOpenaiInput(keys.OPENAI_API_KEY || '');
    setAnthropicInput(keys.ANTHROPIC_API_KEY || '');
  }, [keys]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedKeys: ApiKeys = {
      GEMINI_API_KEY: geminiInput.trim(),
      OPENAI_API_KEY: openaiInput.trim(),
      ANTHROPIC_API_KEY: anthropicInput.trim()
    };
    setKeys(updatedKeys);
    
    sessionStorage.setItem('llm_routing_keys', JSON.stringify(updatedKeys));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleClearDb = async () => {
    if (!window.confirm('Are you sure you want to clear all routing history logs from the backend database? This cannot be undone.')) {
      return;
    }
    
    setIsClearing(true);
    setClearMessage('');
    try {
      const response = await fetch(`${backendUrl}/api/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setClearMessage('All database logs successfully cleared!');
      } else {
        setClearMessage('Failed to clear database logs.');
      }
    } catch (err) {
      setClearMessage('Connection error: Failed to reach backend.');
    } finally {
      setIsClearing(false);
      setTimeout(() => setClearMessage(''), 4000);
    }
  };

  return (
    <div className="settings-page" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-card">
        <h3 className="chart-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={20} className="text-cyan" />
            API Keys Configuration
          </span>
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Input your API credentials below. Keys are kept in-memory and in your browser's session storage. They are sent to the local backend dynamically as request headers and are <strong>never stored on the server's disk</strong>. 
          If any keys are blank, the router automatically falls back to the **high-fidelity simulated provider engine** for testing.
        </p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">
              <span>Google Gemini API Key</span>
              <span style={{ fontSize: '0.75rem', color: geminiInput ? 'var(--color-success)' : 'var(--text-muted)' }}>
                {geminiInput ? 'Configured' : 'Simulated Fallback active'}
              </span>
            </label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="AIzaSy..." 
              value={geminiInput}
              onChange={(e) => setGeminiInput(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>OpenAI API Key</span>
              <span style={{ fontSize: '0.75rem', color: openaiInput ? 'var(--color-success)' : 'var(--text-muted)' }}>
                {openaiInput ? 'Configured' : 'Simulated Fallback active'}
              </span>
            </label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="sk-proj-..." 
              value={openaiInput}
              onChange={(e) => setOpenaiInput(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Anthropic API Key</span>
              <span style={{ fontSize: '0.75rem', color: anthropicInput ? 'var(--color-success)' : 'var(--text-muted)' }}>
                {anthropicInput ? 'Configured' : 'Simulated Fallback active'}
              </span>
            </label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="sk-ant-..." 
              value={anthropicInput}
              onChange={(e) => setAnthropicInput(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary">
              Save Keys
            </button>
            
            {isSaved && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-success)', fontSize: '0.9rem' }}>
                <CheckCircle2 size={16} /> Keys Saved to Session Storage!
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="glass-card">
        <h3 className="chart-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} className="text-cyan" />
            Routing System Settings
          </span>
        </h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>AI-Assisted Complexity Classification</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              When enabled, a cheap Gemini Flash model evaluation runs first to blend with basic heuristic score checks.
            </p>
          </div>
          <div className="switch-container">
            <label className="switch">
              <input 
                type="checkbox" 
                checked={useAiClassifier} 
                onChange={(e) => setUseAiClassifier(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
            <span style={{ fontSize: '0.85rem', width: '30px' }}>{useAiClassifier ? 'ON' : 'OFF'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>Clear Historical Telemetry Database</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Reset routing ratios, metrics charts, savings calculations, and request history.
            </p>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleClearDb}
            disabled={isClearing}
            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Trash2 size={16} />
            {isClearing ? 'Clearing...' : 'Clear database'}
          </button>
        </div>

        {clearMessage && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem 1rem', 
            borderRadius: '10px', 
            background: clearMessage.includes('success') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${clearMessage.includes('success') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {clearMessage.includes('success') ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-danger" />}
            <span>{clearMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}

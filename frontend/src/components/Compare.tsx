import React, { useState } from 'react';
import { Columns, Send, Sparkles, AlertCircle, Clock, Coins, Layers } from 'lucide-react';

interface ApiKeys {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
}

interface CompareProps {
  keys: ApiKeys;
  backendUrl: string;
}

interface ComparisonResult {
  model: string;
  success: boolean;
  response?: string;
  error?: string;
  latency?: number;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  isSimulated?: boolean;
}

const COMPARABLE_MODELS = [
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google', tier: 'Low Cost' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', tier: 'Low Cost' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', tier: 'Medium' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', tier: 'Medium' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', tier: 'High Quality' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', tier: 'High Quality' },
];

export default function Compare({ keys, backendUrl }: CompareProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>(['gemini-1.5-flash', 'gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ComparisonResult[] | null>(null);
  const [error, setError] = useState('');

  const toggleModel = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter(id => id !== modelId));
      }
    } else {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    setResults(null);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (keys.GEMINI_API_KEY) headers['x-gemini-key'] = keys.GEMINI_API_KEY;
    if (keys.OPENAI_API_KEY) headers['x-openai-key'] = keys.OPENAI_API_KEY;
    if (keys.ANTHROPIC_API_KEY) headers['x-anthropic-key'] = keys.ANTHROPIC_API_KEY;

    try {
      const response = await fetch(`${backendUrl}/api/compare`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: prompt,
          models: selectedModels
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to complete comparison (Status: ${response.status})`);
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err: any) {
      setError(err.message || 'Network connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const successResults = results ? results.filter((r): r is Required<ComparisonResult> => r.success) : [];
  
  const cheapestResult = successResults.length > 0 
    ? successResults.reduce((min, curr) => curr.cost < min.cost ? curr : min, successResults[0]) 
    : null;
  const fastestResult = successResults.length > 0 
    ? successResults.reduce((min, curr) => curr.latency < min.latency ? curr : min, successResults[0]) 
    : null;

  return (
    <div className="compare-page" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-card">
        <h3 className="chart-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Columns size={20} className="text-cyan" />
            Model Comparison Panel
          </span>
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Execute the same prompt against multiple models simultaneously to contrast costs, response times, and content quality.
        </p>

        <form onSubmit={handleCompare} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Select Models to Compare (Choose 2 or more)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {COMPARABLE_MODELS.map(model => {
                const isActive = selectedModels.includes(model.id);
                return (
                  <div 
                    key={model.id}
                    onClick={() => toggleModel(model.id)}
                    style={{
                      border: `1px solid ${isActive ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                      background: isActive ? 'rgba(0, 242, 254, 0.06)' : 'rgba(255,255,255,0.01)',
                      borderRadius: '12px',
                      padding: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 0 10px rgba(0, 242, 254, 0.1)' : 'none'
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isActive ? '#fff' : 'var(--text-secondary)' }}>
                      {model.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {model.provider} • {model.tier}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Enter Prompt to Send</label>
            <textarea
              className="form-textarea"
              placeholder="e.g. Write a quicksort implementation and detail its average and worst-case time complexities."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !prompt.trim() || selectedModels.length < 2}
            style={{ alignSelf: 'flex-start' }}
          >
            {loading ? (
              <>Running Parallel Queries...</>
            ) : (
              <>
                <Send size={16} /> Run Comparison
              </>
            )}
          </button>
        </form>

        {error && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem 1rem', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: '10px', 
            color: '#f87171', 
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Quick analysis summary */}
          {cheapestResult && (
            <div className="glass-card highlight-cyan" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', background: 'linear-gradient(90deg, rgba(0, 242, 254, 0.05) 0%, rgba(22, 28, 41, 0.65) 100%)' }}>
              <div className="brand-logo" style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '14px' }}>
                <Sparkles size={22} color="#000" />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Routing Efficiency Insight</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.4' }}>
                  The cheapest response was provided by <strong>{cheapestResult.model}</strong> (${cheapestResult.cost.toFixed(6)}) which is 
                  {' '}<strong>{Math.round((successResults.find(r => r.model.includes('sonnet') || r.model.includes('gpt-4o') && !r.model.includes('mini'))?.cost || 0.012) / (cheapestResult.cost || 0.0001))}x cheaper</strong> than routing blindly to a premium model. 
                  The fastest model was <strong>{fastestResult?.model}</strong> responding in <strong>{fastestResult?.latency}ms</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          <div className="compare-grid">
            {results.map((result) => {
              const isCheapest = cheapestResult && result.success && result.model === cheapestResult.model;
              const isFastest = fastestResult && result.success && result.model === fastestResult.model;
              const modelMeta = COMPARABLE_MODELS.find(m => m.id === result.model);
              const providerClass = modelMeta?.provider.toLowerCase() === 'google' 
                ? 'google' 
                : modelMeta?.provider.toLowerCase() === 'openai' 
                  ? 'openai' 
                  : 'anthropic';

              return (
                <div 
                  key={result.model} 
                  className="glass-card compare-card"
                  style={{
                    border: isCheapest ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid var(--border-color)',
                    boxShadow: isCheapest ? '0 0 25px rgba(0, 242, 254, 0.1)' : '0 10px 30px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  <div>
                    <div className="compare-header">
                      <span className={`model-badge ${providerClass}`}>
                        {modelMeta?.name || result.model}
                      </span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {isCheapest && (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 'bold' }}>
                            CHEAPEST
                          </span>
                        )}
                        {isFastest && (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 'bold' }}>
                            FASTEST
                          </span>
                        )}
                      </div>
                    </div>

                    {result.success ? (
                      <div className="output-scroll">{result.response}</div>
                    ) : (
                      <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        Error query response: {result.error || 'Unknown failure'}
                      </div>
                    )}
                  </div>

                  {result.success && (
                    <div className="compare-meta-grid">
                      <div className="compare-meta-item">
                        <span className="compare-meta-label">
                          <Clock size={12} style={{ marginRight: '2px', display: 'inline', verticalAlign: 'text-bottom' }} />
                          Latency
                        </span>
                        <span className="compare-meta-val" style={{ color: isFastest ? 'var(--color-success)' : 'inherit' }}>
                          {result.latency}ms
                        </span>
                      </div>

                      <div className="compare-meta-item">
                        <span className="compare-meta-label">
                          <Coins size={12} style={{ marginRight: '2px', display: 'inline', verticalAlign: 'text-bottom' }} />
                          Cost
                        </span>
                        <span className="compare-meta-val" style={{ color: isCheapest ? 'var(--accent-cyan)' : 'inherit' }}>
                          ${result.cost?.toFixed(6)}
                        </span>
                      </div>

                      <div className="compare-meta-item">
                        <span className="compare-meta-label">
                          <Layers size={12} style={{ marginRight: '2px', display: 'inline', verticalAlign: 'text-bottom' }} />
                          Tokens
                        </span>
                        <span className="compare-meta-val">
                          {(result.inputTokens || 0) + (result.outputTokens || 0)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

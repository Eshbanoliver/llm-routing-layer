import React, { useState, useEffect, useRef } from 'react';
import { Send, ThumbsUp, ThumbsDown, CheckCircle2, Terminal, RefreshCw, Cpu } from 'lucide-react';

interface ApiKeys {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
}

interface PlaygroundProps {
  keys: ApiKeys;
  useAiClassifier: boolean;
  backendUrl: string;
}

interface TerminalLine {
  text: string;
  type: 'general' | 'info' | 'warning' | 'success' | 'accent';
  id: string;
}

interface RoutingResponse {
  success: boolean;
  routedModel: string;
  provider: string;
  response: string;
  latency: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  savings: number;
  isSimulated: boolean;
  logId: string;
  pipelineLogs: string[];
}

const STRATEGIES = [
  { id: 'cost', title: 'Cost Minimized', desc: 'Prioritizes cheap models (Gemini Flash, GPT-4o-mini).' },
  { id: 'balanced', title: 'Balanced Strategy', desc: 'Standard tradeoff between cost, speed, and accuracy.' },
  { id: 'performance', title: 'Performance First', desc: 'Focuses on top quality, routing to Sonnet/GPT-4o sooner.' },
];

export default function Playground({ keys, useAiClassifier, backendUrl }: PlaygroundProps) {
  const [prompt, setPrompt] = useState('');
  const [strategy, setStrategy] = useState('balanced');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoutingResponse | null>(null);
  
  // Terminal logs state
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<'thumbs-up' | 'thumbs-down' | null>(null);
  
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLines]);

  const addTerminalLine = (text: string, type: 'general' | 'info' | 'warning' | 'success' | 'accent' = 'general', delay = 0): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setTerminalLines(prev => [...prev, { text, type, id: Math.random().toString() }]);
        resolve();
      }, delay);
    });
  };

  const handleRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResult(null);
    setTerminalLines([]);
    setFeedbackSubmitted(null);

    await addTerminalLine(`SYSTEM >> Initializing routing pipeline gateway...`, 'info', 100);
    await addTerminalLine(`ROUTER >> Strategy selected: ${strategy.toUpperCase()}`, 'info', 150);
    await addTerminalLine(`HEURISTICS >> Parsing prompt syntax features...`, 'general', 200);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (keys.GEMINI_API_KEY) headers['x-gemini-key'] = keys.GEMINI_API_KEY;
    if (keys.OPENAI_API_KEY) headers['x-openai-key'] = keys.OPENAI_API_KEY;
    if (keys.ANTHROPIC_API_KEY) headers['x-anthropic-key'] = keys.ANTHROPIC_API_KEY;

    try {
      const apiPromise = fetch(`${backendUrl}/api/route`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: prompt,
          strategy,
          useAiClassifier
        })
      });

      await addTerminalLine(`HEURISTICS >> Character length: ${prompt.length} bytes.`, 'general', 100);
      
      if (useAiClassifier) {
        await addTerminalLine(`AI_CLASSIFIER >> Sending prompt to fast classification pass...`, 'warning', 100);
      } else {
        await addTerminalLine(`SYSTEM >> AI Classifier disabled by user. Relying on heuristics.`, 'info', 50);
      }

      const response = await apiPromise;
      if (!response.ok) {
        throw new Error(`Routing endpoint returned status: ${response.status}`);
      }

      const data = await response.json() as RoutingResponse;
      
      if (data.pipelineLogs && data.pipelineLogs.length > 0) {
        for (let i = 0; i < data.pipelineLogs.length; i++) {
          const log = data.pipelineLogs[i];
          let type: 'general' | 'info' | 'warning' | 'success' | 'accent' = 'general';
          if (log.includes('Decision') || log.includes('Blended')) type = 'accent';
          else if (log.includes('Error') || log.includes('Failed')) type = 'warning';
          else if (log.includes('Received') || log.includes('complete')) type = 'success';
          
          await addTerminalLine(log, type, 80);
        }
      }

      await addTerminalLine(`SYSTEM >> Stream finalized. Output payload decoded.`, 'info', 100);
      setResult(data);
    } catch (err: any) {
      await addTerminalLine(`ERROR >> Pipeline halted: ${err.message}`, 'warning', 100);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (type: 'thumbs-up' | 'thumbs-down') => {
    if (!result || !result.logId) return;

    try {
      const response = await fetch(`${backendUrl}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: result.logId,
          feedback: type
        })
      });
      const data = await response.json();
      if (data.success) {
        setFeedbackSubmitted(type);
      }
    } catch (err) {
      console.error('Error logging feedback:', err);
    }
  };

  return (
    <div className="playground-layout">
      {/* Left Input Panel */}
      <div className="control-panel glass-card">
        <h3 className="chart-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={20} className="text-cyan" />
            Router Gateway Playground
          </span>
        </h3>

        <form onSubmit={handleRoute} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Routing Strategy</label>
            <div className="strategy-selectors">
              {STRATEGIES.map((strat) => (
                <div
                  key={strat.id}
                  className={`strategy-option ${strategy === strat.id ? 'active' : ''}`}
                  onClick={() => setStrategy(strat.id)}
                >
                  <div className="strategy-title">{strat.title}</div>
                  <div className="strategy-desc">{strat.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">User Query Prompt</label>
            <textarea
              className="form-textarea"
              placeholder="Type your prompt here... (e.g. Write a python script to parse logs, or just say 'hello')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !prompt.trim()}
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <RefreshCw className="pulse-dot" style={{ animation: 'spin 1.5s infinite linear' }} size={16} /> 
                Evaluating Complexity & Routing...
              </>
            ) : (
              <>
                <Send size={16} /> Process & Route Query
              </>
            )}
          </button>
        </form>

        {/* Results Panel */}
        {result && (
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              background: 'rgba(0,0,0,0.2)',
              padding: '0.75rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Latency</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {result.latency}ms
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Total Cost</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                  ${result.cost.toFixed(6)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Estimated Savings</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>
                  ${result.savings.toFixed(6)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span className="form-label">Model Output</span>
              <div className="output-scroll" style={{ maxHeight: '260px' }}>
                {result.response}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Was this routing decision accurate?</span>
              <div className="feedback-actions">
                <button 
                  className={`icon-btn ${feedbackSubmitted === 'thumbs-up' ? 'active thumbs-up' : ''}`}
                  onClick={() => handleFeedback('thumbs-up')}
                  title="Correct routing selection"
                >
                  <ThumbsUp size={16} />
                </button>
                <button 
                  className={`icon-btn ${feedbackSubmitted === 'thumbs-down' ? 'active thumbs-down' : ''}`}
                  onClick={() => handleFeedback('thumbs-down')}
                  title="Incorrect or inefficient routing selection"
                >
                  <ThumbsDown size={16} />
                </button>
              </div>
            </div>
            
            {feedbackSubmitted && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle2 size={12} /> Feedback logged to database.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right Terminal Log Visualizer */}
      <div className="flow-terminal">
        <div className="terminal-header">
          <div className="terminal-dots">
            <span className="terminal-dot red"></span>
            <span className="terminal-dot yellow"></span>
            <span className="terminal-dot green"></span>
          </div>
          <span className="terminal-title">ROUTER DECISION PIPELINE TELEMETRY</span>
          <Terminal size={14} className="text-secondary" />
        </div>
        <div className="terminal-body">
          {terminalLines.length === 0 && !loading && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', margin: 'auto', textAlign: 'center' }}>
              Waiting for query execution...<br/>
              Logs will stream here in real time.
            </div>
          )}
          {terminalLines.map((line) => (
            <div key={line.id} className={`terminal-line ${line.type}`}>
              {line.text}
            </div>
          ))}
          {loading && (
            <div className="terminal-line info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="pulse-dot"></span>
              <span>Pending response...</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}

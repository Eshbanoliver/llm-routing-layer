import { useState, useEffect } from 'react';
import { RefreshCw, Database, DollarSign, Clock, CheckCircle2, BarChart2 } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  query: string;
  complexityScore: number;
  routedModel: string;
  latency: number;
  cost: number;
  feedback?: 'thumbs-up' | 'thumbs-down' | null;
}

interface StatsData {
  totalQueries: number;
  successRate: number;
  totalCost: number;
  totalSavings: number;
  avgLatency: number;
  modelDistribution: Record<string, number>;
  history: LogEntry[];
}

interface DashboardProps {
  backendUrl: string;
}

export default function Dashboard({ backendUrl }: DashboardProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${backendUrl}/api/stats`);
      if (!response.ok) {
        throw new Error('Failed to retrieve analytics metrics from backend.');
      }
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Could not connect to backend telemetry API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '1rem' }}>
        <RefreshCw style={{ animation: 'spin 1.5s infinite linear', color: 'var(--accent-cyan)' }} />
        <span style={{ color: 'var(--text-secondary)' }}>Loading analytics telemetry...</span>
      </div>
    );
  }

  // Fallbacks if stats is null
  const {
    totalQueries = 0,
    successRate = 0,
    totalCost = 0,
    totalSavings = 0,
    avgLatency = 0,
    modelDistribution = {},
    history = []
  } = stats || {};

  // Find max distribution value for chart percentages
  const distributionEntries = Object.entries(modelDistribution);
  const maxDistributionCount = distributionEntries.length > 0
    ? Math.max(...distributionEntries.map(([_, count]) => count))
    : 1;

  // Generate model labels formatting
  const formatModelLabel = (modelId: string) => {
    const names: Record<string, string> = {
      'gemini-1.5-flash': 'Gemini 1.5 Flash',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gemini-1.5-pro': 'Gemini 1.5 Pro',
      'claude-3-haiku': 'Claude 3 Haiku',
      'gpt-4o': 'GPT-4o',
      'claude-3-5-sonnet': 'Claude 3.5 Sonnet'
    };
    return names[modelId] || modelId;
  };

  const getModelClass = (modelId: string) => {
    if (modelId.includes('gemini')) return 'google';
    if (modelId.includes('gpt')) return 'openai';
    return 'anthropic';
  };

  return (
    <div className="dashboard-view" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-1rem' }}>
        <button 
          onClick={fetchStats} 
          disabled={loading}
          className="btn btn-secondary"
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1.5s infinite linear' : 'none' }} />
          Refresh Stats
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon cyan">
            <Database size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Queries</span>
            <span className="stat-value">{totalQueries}</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon green">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Savings</span>
            <span className="stat-value" style={{ color: 'var(--color-success)' }}>
              ${totalSavings.toFixed(4)}
            </span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon purple">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Avg Latency</span>
            <span className="stat-value">{avgLatency}ms</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon pink">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Success Rate</span>
            <span className="stat-value">{successRate}%</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="charts-grid">
        {/* Route Distribution Chart */}
        <div className="glass-card">
          <h3 className="chart-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={18} className="text-cyan" />
              LLM Usage Distribution
            </span>
          </h3>
          {distributionEntries.length === 0 ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No request history available. Complete queries in the Playground to see route details.
            </div>
          ) : (
            <div className="custom-bar-chart">
              {distributionEntries.map(([modelId, count], idx) => {
                const percentage = Math.max(5, (count / maxDistributionCount) * 100);
                const isPurple = idx % 3 === 1;
                const isPink = idx % 3 === 2;
                let fillClass = '';
                if (isPurple) fillClass = 'purple';
                else if (isPink) fillClass = 'pink';

                return (
                  <div className="custom-bar-row" key={modelId}>
                    <span className="bar-label">{formatModelLabel(modelId)}</span>
                    <div className="bar-track">
                      <div 
                        className={`bar-fill ${fillClass}`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="bar-value">{count} ({Math.round((count / (totalQueries || 1)) * 100)}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cost comparison highlights */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 className="chart-title">Savings Profile</h3>
            <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Total Gateway Spent:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>${totalCost.toFixed(5)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  <span>Benchmark Spent (Sonnet):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>${(totalCost + totalSavings).toFixed(5)}</span>
                </div>
              </div>

              {/* Graphical representation of savings */}
              {totalQueries > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>Efficiency Ratio</span>
                    <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>
                      {Math.round((totalSavings / (totalCost + totalSavings || 1)) * 100)}% Cost Reduction
                    </span>
                  </div>
                  <div className="bar-track" style={{ height: '16px' }}>
                    <div 
                      className="bar-fill" 
                      style={{ 
                        width: `${Math.round((totalSavings / (totalCost + totalSavings || 1)) * 100)}%`,
                        background: 'var(--gradient-cyber)' 
                      }} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            <strong>How is this calculated?</strong><br/>
            Savings are derived by comparing the active model cost against the cost of the benchmark premium model (Claude 3.5 Sonnet) for the exact same input/output token volume.
          </div>
        </div>
      </div>

      {/* History Log Table */}
      <div className="glass-card">
        <h3 className="chart-title">Recent Routing Decisions</h3>
        {history.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No transaction records found. Query the router to populate database history.
          </div>
        ) : (
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Prompt Snippet</th>
                  <th>Complexity Score</th>
                  <th>Routed Model</th>
                  <th>Latency</th>
                  <th>Cost</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().slice(0, 8).map((log) => {
                  let complexityClass = 'low';
                  if (log.complexityScore >= 4) complexityClass = 'high';
                  else if (log.complexityScore >= 2.5) complexityClass = 'medium';

                  const modelClass = getModelClass(log.routedModel);

                  return (
                    <tr key={log.id}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.query}>
                        {log.query}
                      </td>
                      <td>
                        <span className={`score-badge ${complexityClass}`}>
                          {log.complexityScore.toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <span className={`model-badge ${modelClass}`}>
                          {formatModelLabel(log.routedModel)}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{log.latency}ms</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>${log.cost.toFixed(6)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {log.feedback === 'thumbs-up' && (
                          <span style={{ color: 'var(--color-success)', fontSize: '0.75rem', fontWeight: 'bold' }}>Accurate</span>
                        )}
                        {log.feedback === 'thumbs-down' && (
                          <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', fontWeight: 'bold' }}>Inefficient</span>
                        )}
                        {!log.feedback && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

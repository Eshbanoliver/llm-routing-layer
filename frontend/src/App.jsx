import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Cpu, Columns, Settings as SettingsIcon, Layers } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Playground from './components/Playground';
import Compare from './components/Compare';
import Settings from './components/Settings';

const BACKEND_URL = 'http://localhost:5000';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [keys, setKeys] = useState({
    GEMINI_API_KEY: '',
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: ''
  });
  const [useAiClassifier, setUseAiClassifier] = useState(true);

  // Load configuration keys from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('llm_routing_keys');
      if (stored) {
        setKeys(JSON.parse(stored));
      }
      
      const storedClassifier = sessionStorage.getItem('use_ai_classifier');
      if (storedClassifier !== null) {
        setUseAiClassifier(storedClassifier === 'true');
      }
    } catch (e) {
      console.warn('Failed to load session configuration:', e);
    }
  }, []);

  // Save classifier setting
  const updateClassifier = (val) => {
    setUseAiClassifier(val);
    sessionStorage.setItem('use_ai_classifier', val.toString());
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard backendUrl={BACKEND_URL} />;
      case 'playground':
        return (
          <Playground 
            keys={keys} 
            useAiClassifier={useAiClassifier} 
            backendUrl={BACKEND_URL} 
          />
        );
      case 'compare':
        return <Compare keys={keys} backendUrl={BACKEND_URL} />;
      case 'settings':
        return (
          <Settings 
            keys={keys} 
            setKeys={setKeys} 
            useAiClassifier={useAiClassifier} 
            setUseAiClassifier={updateClassifier} 
            backendUrl={BACKEND_URL} 
          />
        );
      default:
        return <Dashboard backendUrl={BACKEND_URL} />;
    }
  };

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard': return 'Routing Telemetry';
      case 'playground': return 'Router Playground';
      case 'compare': return 'Model Comparison';
      case 'settings': return 'Gateway Settings';
      default: return 'LLM Routing Gateway';
    }
  };

  const getPageSubtitle = () => {
    switch (activePage) {
      case 'dashboard': return 'Aggregated request telemetry, cost savings tracking, and router statistics.';
      case 'playground': return 'Evaluate prompt complexities, inspect classification outputs, and test routing paths.';
      case 'compare': return 'Concurrently compare latency, tokens, and quality across available model endpoints.';
      case 'settings': return 'Adjust classification thresholds, manage credentials, and refresh historical data storage.';
      default: return '';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation Drawer */}
      <aside className="sidebar">
        <div>
          <div className="brand-section">
            <div className="brand-logo">
              <Layers size={22} color="#08090c" strokeWidth={2.5} />
            </div>
            <h1 className="brand-name">Router Layer</h1>
          </div>

          <nav className="nav-links">
            <div 
              className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActivePage('dashboard')}
            >
              <LayoutDashboard size={18} />
              <span>Telemetry</span>
            </div>

            <div 
              className={`nav-item ${activePage === 'playground' ? 'active' : ''}`}
              onClick={() => setActivePage('playground')}
            >
              <Cpu size={18} />
              <span>Playground</span>
            </div>

            <div 
              className={`nav-item ${activePage === 'compare' ? 'active' : ''}`}
              onClick={() => setActivePage('compare')}
            >
              <Columns size={18} />
              <span>Compare</span>
            </div>

            <div 
              className={`nav-item ${activePage === 'settings' ? 'active' : ''}`}
              onClick={() => setActivePage('settings')}
            >
              <SettingsIcon size={18} />
              <span>Settings</span>
            </div>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="pulse-dot"></span>
            <span>Gateway Active</span>
          </div>
          <span>v1.0.0 • Local Host</span>
        </div>
      </aside>

      {/* Main Page Layout Content Area */}
      <main className="main-content">
        <header className="header-title-bar">
          <div>
            <h2 className="page-title">{getPageTitle()}</h2>
            <p className="page-subtitle">{getPageSubtitle()}</p>
          </div>
        </header>

        <section className="page-body">
          {renderPage()}
        </section>
      </main>
    </div>
  );
}

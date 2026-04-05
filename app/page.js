'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';

// ── All API calls go to /api/* on the same Vercel domain ──────────────────────
const API = '/api';

const SEVERITY_CONFIG = {
  mild:     { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  label: 'Mild',     icon: '○' },
  moderate: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  label: 'Moderate', icon: '◐' },
  severe:   { color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Severe',   icon: '●' },
  critical: { color: '#ff3b30', bg: 'rgba(255,59,48,0.15)',  label: 'Critical', icon: '⬤' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable components
// ─────────────────────────────────────────────────────────────────────────────

function SymptomTag({ symptom, selected, onClick }) {
  return (
    <button className={`symptom-tag ${selected ? 'selected' : ''}`} onClick={() => onClick(symptom.id)}>
      {symptom.label}
    </button>
  );
}

function ResultCard({ prediction, rank }) {
  const sev   = SEVERITY_CONFIG[prediction.severity] || SEVERITY_CONFIG.moderate;
  const width = Math.max(8, prediction.confidence);
  return (
    <div className={`result-card ${rank === 0 ? 'top-result' : ''}`} style={{ animationDelay: `${rank * 80}ms` }}>
      <div className="result-header">
        <div className="result-rank">#{rank + 1}</div>
        <div className="result-disease">{prediction.disease}</div>
        <div className="result-confidence">{prediction.confidence}%</div>
      </div>
      <div className="confidence-bar">
        <div className="confidence-fill" style={{ width: `${width}%`, background: rank === 0 ? 'var(--accent)' : 'var(--muted)' }} />
      </div>
      <div className="result-meta">
        <span className="severity-badge" style={{ color: sev.color, background: sev.bg }}>{sev.icon} {sev.label}</span>
        <span className="result-advice">{prediction.advice}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// puter.js: AI Explanation panel
// ─────────────────────────────────────────────────────────────────────────────

function AiExplanation({ predictions, symptoms }) {
  const [text,    setText]    = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const boxRef = useRef(null);

  const ask = async () => {
    setLoading(true);
    setText('');
    setDone(false);
    const top3    = predictions.slice(0, 3).map(p => `${p.disease} (${p.confidence}%)`).join(', ');
    const symList = symptoms.join(', ');
    const prompt  =
      `A patient reports these symptoms: ${symList}.\n` +
      `A machine learning model predicts: ${top3}.\n\n` +
      `In plain English (3-4 short paragraphs, no bullet points):\n` +
      `1. Why these symptoms match the top result.\n` +
      `2. What distinguishes the top result from the others.\n` +
      `3. What kind of doctor to see and any immediate self-care steps.\n` +
      `End with a one-sentence reminder that this is not a medical diagnosis.`;
    try {
      const puter    = window.puter;
      const response = await puter.ai.chat(prompt, { model: 'claude-sonnet-4-5' });
      setText(typeof response === 'string' ? response : response?.message?.content?.[0]?.text || '');
    } catch {
      setText('Could not generate explanation. Please sign in to Puter and try again.');
    } finally {
      setLoading(false);
      setDone(true);
    }
  };

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [text]);

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <span className="ai-panel-icon">✦</span>
        <span className="ai-panel-title">AI Explanation</span>
        <span className="ai-panel-badge">Powered by puter.js</span>
      </div>
      {!done && !loading && <button className="btn-ai" onClick={ask}>Explain these results with AI →</button>}
      {loading && <div className="ai-loading"><span className="loading-dots"><span/><span/><span/></span><span>Thinking…</span></div>}
      {text && (
        <div className="ai-text" ref={boxRef}>
          {text.split('\n').map((line, i) => line.trim() ? <p key={i}>{line}</p> : <br key={i} />)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// puter.js: History panel
// ─────────────────────────────────────────────────────────────────────────────

function HistoryPanel({ onRestore }) {
  const [history, setHistory] = useState([]);
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await window.puter.kv.get('symptomAI_history');
        if (raw) setHistory(JSON.parse(raw));
      } catch { setHistory([]); }
    };
    if (window.puter) load();
    else window.addEventListener('puterready', load, { once: true });
  }, []);

  const clear = async () => {
    await window.puter.kv.del('symptomAI_history');
    setHistory([]);
  };

  if (!history.length) return null;

  return (
    <div className="history-panel">
      <button className="history-toggle" onClick={() => setOpen(o => !o)}>
        ◷ Past checks ({history.length}) {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="history-list">
          {history.slice().reverse().map((entry, i) => (
            <div key={i} className="history-item" onClick={() => onRestore(entry.symptoms)}>
              <span className="history-date">{new Date(entry.date).toLocaleDateString()}</span>
              <span className="history-symptoms">{entry.symptoms.slice(0, 4).join(', ')}{entry.symptoms.length > 4 ? '…' : ''}</span>
              <span className="history-top">→ {entry.topResult}</span>
            </div>
          ))}
          <button className="btn-clear" onClick={clear} style={{ marginTop: 8 }}>Clear history</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// puter.js: Auth button
// ─────────────────────────────────────────────────────────────────────────────

function AuthButton() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        if (window.puter?.auth?.isSignedIn()) {
          const u = await window.puter.auth.getUser();
          setUser(u);
        }
      } catch {}
      setLoading(false);
    };
    if (window.puter) check();
    else window.addEventListener('puterready', check, { once: true });
  }, []);

  const signIn  = async () => { try { await window.puter.auth.signIn(); const u = await window.puter.auth.getUser(); setUser(u); } catch {} };
  const signOut = async () => { await window.puter.auth.signOut(); setUser(null); };

  if (loading) return null;
  return user ? (
    <div className="auth-user">
      <span className="auth-avatar">◉</span>
      <span className="auth-name">{user.username}</span>
      <button className="btn-ghost" onClick={signOut}>Sign out</button>
    </div>
  ) : (
    <button className="btn-ghost" onClick={signIn}>Sign in to save history</button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [allSymptoms,    setAllSymptoms]    = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [selected,       setSelected]       = useState(new Set());
  const [activeCategory, setActiveCategory] = useState('');
  const [predictions,    setPredictions]    = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [step,           setStep]           = useState('select');
  const [search,         setSearch]         = useState('');
  const [apiStatus,      setApiStatus]      = useState('checking');

  // Load symptoms + categories from /api/*
  useEffect(() => {
    axios.get(`${API}/health`)
      .then(() => {
        setApiStatus('ok');
        return Promise.all([axios.get(`${API}/symptoms`), axios.get(`${API}/categories`)]);
      })
      .then(([sympRes, catRes]) => {
        setAllSymptoms(sympRes.data);
        setCategories(catRes.data);
        if (catRes.data.length > 0) setActiveCategory(catRes.data[0].id);
      })
      .catch(() => setApiStatus('error'));
  }, []);

  const toggleSymptom = (id) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const saveToHistory = async (symptomIds, topResult) => {
    try {
      const raw     = await window.puter.kv.get('symptomAI_history').catch(() => null);
      const history = raw ? JSON.parse(raw) : [];
      history.push({ date: Date.now(), symptoms: symptomIds, topResult });
      if (history.length > 20) history.splice(0, history.length - 20);
      await window.puter.kv.set('symptomAI_history', JSON.stringify(history));
    } catch {}
  };

  const predict = async () => {
    if (selected.size < 2) { setError('Please select at least 2 symptoms.'); return; }
    setError(null);
    setLoading(true);
    try {
      const symptomIds = Array.from(selected);
      const res        = await axios.post(`${API}/predict`, { symptoms: symptomIds });
      setPredictions(res.data);
      setStep('results');
      if (res.data.predictions.length > 0) saveToHistory(symptomIds, res.data.predictions[0].disease);
    } catch {
      setError('Could not reach the prediction service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setSelected(new Set()); setPredictions(null); setStep('select'); setSearch(''); setError(null); };
  const restoreFromHistory = (ids) => { setSelected(new Set(ids)); setStep('select'); setPredictions(null); };

  const displayedSymptoms = useMemo(() => {
    if (search.trim()) { const q = search.toLowerCase(); return allSymptoms.filter(s => s.label.toLowerCase().includes(q)); }
    const cat = categories.find(c => c.id === activeCategory);
    if (!cat) return allSymptoms.slice(0, 20);
    return allSymptoms.filter(s => cat.keywords.some(k => s.id.includes(k)));
  }, [allSymptoms, categories, activeCategory, search]);

  const selectedSymptoms = allSymptoms.filter(s => selected.has(s.id));

  return (
    <div className="app">
      <div className="bg-grid" />
      <div className="bg-glow" />

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo" onClick={reset}>
            <span className="logo-icon">⬡</span>
            <span className="logo-text">SymptomAI</span>
          </div>
          <div className="header-right">
            <div className={`api-dot ${apiStatus}`} title={`API: ${apiStatus}`} />
            <AuthButton />
            {step === 'results' && <button className="btn-ghost" onClick={reset}>← New Check</button>}
          </div>
        </div>
      </header>

      <main className="main">

        {/* ── STEP 1: SELECT SYMPTOMS ─────────────────────────────────────── */}
        {step === 'select' && (
          <>
            <section className="hero">
              <p className="hero-eyebrow">AI-Powered Symptom Analysis</p>
              <h1 className="hero-title">What&apos;s your <em>body</em> telling you?</h1>
              <p className="hero-sub">
                Select your symptoms. Our ML model analyzes 41 conditions across 131 symptoms,
                then puter.js generates a plain-English AI explanation — free, no API key needed.
              </p>
            </section>

            <HistoryPanel onRestore={restoreFromHistory} />

            {selected.size > 0 && (
              <div className="selected-bar">
                <span className="selected-count">{selected.size} symptom{selected.size !== 1 ? 's' : ''} selected</span>
                <div className="selected-chips">
                  {selectedSymptoms.map(s => (
                    <span key={s.id} className="chip" onClick={() => toggleSymptom(s.id)}>
                      {s.label} <span className="chip-x">×</span>
                    </span>
                  ))}
                </div>
                <button className="btn-clear" onClick={() => setSelected(new Set())}>Clear all</button>
              </div>
            )}

            <div className="search-wrap">
              <span className="search-icon">⌕</span>
              <input className="search-input" placeholder="Search symptoms…" value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button className="search-clear" onClick={() => setSearch('')}>×</button>}
            </div>

            {!search && (
              <div className="category-tabs">
                {categories.map(cat => {
                  const ids      = allSymptoms.filter(s => cat.keywords.some(k => s.id.includes(k))).map(s => s.id);
                  const selCount = ids.filter(id => selected.has(id)).length;
                  return (
                    <button key={cat.id} className={`cat-tab ${activeCategory === cat.id ? 'active' : ''}`} onClick={() => setActiveCategory(cat.id)}>
                      <span className="cat-icon">{cat.icon}</span>
                      {cat.label}
                      {selCount > 0 && <span className="cat-badge">{selCount}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="symptom-grid">
              {displayedSymptoms.length === 0 && <p className="no-results">No symptoms found for &quot;{search}&quot;</p>}
              {displayedSymptoms.map(s => (
                <SymptomTag key={s.id} symptom={s} selected={selected.has(s.id)} onClick={toggleSymptom} />
              ))}
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="predict-wrap">
              <button className={`btn-predict ${selected.size >= 2 ? 'ready' : ''}`} onClick={predict} disabled={loading || selected.size < 2}>
                {loading ? <span className="loading-dots"><span/><span/><span/></span> : <>Analyze {selected.size > 0 ? `${selected.size} Symptom${selected.size !== 1 ? 's' : ''}` : 'Symptoms'} →</>}
              </button>
              {selected.size < 2 && <p className="predict-hint">Select at least 2 symptoms to continue</p>}
            </div>
          </>
        )}

        {/* ── STEP 2: RESULTS ─────────────────────────────────────────────── */}
        {step === 'results' && predictions && (
          <div className="results-section">
            <div className="results-header">
              <h2 className="results-title">Differential Diagnosis</h2>
              <p className="results-sub">Based on <strong>{predictions.symptom_count}</strong> symptom{predictions.symptom_count !== 1 ? 's' : ''} analyzed</p>
            </div>

            <div className="results-grid">
              {predictions.predictions.map((pred, i) => <ResultCard key={pred.disease} prediction={pred} rank={i} />)}
            </div>

            <AiExplanation
              predictions={predictions.predictions}
              symptoms={Array.from(selected).map(id => { const s = allSymptoms.find(a => a.id === id); return s ? s.label : id; })}
            />

            <div className="disclaimer-box">
              <span className="disclaimer-icon">⚠</span>
              <p>{predictions.disclaimer}</p>
            </div>

            <button className="btn-predict ready" onClick={reset}>← Check Different Symptoms</button>
          </div>
        )}

      </main>

      <footer className="footer">
        <p>ML model: scikit-learn · AI explanation: puter.js · Dataset: Kaggle · <span className="footer-link">For educational purposes only</span></p>
      </footer>
    </div>
  );
}

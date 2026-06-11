import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import HistoryDashboard from "./components/HistoryDashboard.jsx";
import MetricsTable from "./components/MetricsTable.jsx";
import UploadZone from "./components/UploadZone.jsx";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

const defaultState = {
  session: null,
  results: [],
};

function App() {
  const [referenceFile, setReferenceFile] = useState(null);
  const [hypothesisFiles, setHypothesisFiles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [activeResults, setActiveResults] = useState(defaultState.results);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeSummary = useMemo(() => {
    if (!activeSession) {
      return null;
    }

    return {
      title: activeSession.reference_filename,
      details: `${activeSession.hypotheses_count} hypothesis file${activeSession.hypotheses_count === 1 ? "" : "s"}`,
    };
  }, [activeSession]);

  async function fetchSessions() {
    const response = await fetch(`${API_BASE}/sessions`);
    if (!response.ok) {
      throw new Error("Unable to load evaluation history.");
    }

    const data = await response.json();
    setSessions(data);

    if (!activeSession && data.length > 0) {
      await loadSessionDetail(data[0].id);
    }
  }

  async function loadSessionDetail(sessionId) {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error("Unable to load session details.");
    }

    const data = await response.json();
    setActiveSession(data);
    setActiveResults(data.results ?? []);
  }

  useEffect(() => {
    fetchSessions().catch((fetchError) => {
      setError(fetchError.message);
    });
  }, []);

  async function handleEvaluate() {
    setError("");
    setMessage("");

    if (!referenceFile) {
      setError("Choose a ground truth transcript first.");
      return;
    }

    if (hypothesisFiles.length === 0) {
      setError("Choose at least one hypothesis transcript.");
      return;
    }

    const formData = new FormData();
    formData.append("reference_file", referenceFile);
    hypothesisFiles.forEach((file) => formData.append("hypothesis_files", file));

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/evaluate`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || "Evaluation failed.");
      }

      const data = await response.json();
      setActiveSession(data.session);
      setActiveResults(data.results ?? []);
      setMessage("Evaluation completed successfully.");
      await fetchSessions();
    } catch (evaluationError) {
      setError(evaluationError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectSession(sessionId) {
    try {
      await loadSessionDetail(sessionId);
    } catch (sessionError) {
      setError(sessionError.message);
    }
  }

  return (
    <div className="app-shell">
      <style>{styles}</style>

      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Transcript-Evaluator</p>
          <h1>Score ASR outputs with a clean, traceable review workflow.</h1>
          <p className="hero-text">
            Upload one verified transcript and any number of transcription hypotheses.
            The backend computes WER, CER, and BLEU-4, then stores each run in PostgreSQL.
          </p>
          <div className="hero-stats">
            <div>
              <strong>{sessions.length}</strong>
              <span>saved sessions</span>
            </div>
            <div>
              <strong>{activeResults.length}</strong>
              <span>current results</span>
            </div>
          </div>
        </div>

        <div className="hero-panel">
          <p className="eyebrow">Current session</p>
          <h2>{activeSummary?.title || "No session loaded"}</h2>
          <p>{activeSummary?.details || "Upload files or select a history item to inspect metrics."}</p>
        </div>
      </header>

      <main className="content-grid">
        <UploadZone
          referenceFile={referenceFile}
          hypothesisFiles={hypothesisFiles}
          loading={loading}
          onReferenceChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)}
          onHypothesesChange={(event) => setHypothesisFiles(Array.from(event.target.files ?? []))}
          onSubmit={handleEvaluate}
        />

        <section className="status-row">
          {error ? <div className="status-pill status-pill-error">{error}</div> : null}
          {message ? <div className="status-pill status-pill-success">{message}</div> : null}
        </section>

        <MetricsTable
          title={activeSession ? `Results for ${activeSession.reference_filename}` : "No results selected"}
          subtitle={activeSession ? `Session #${activeSession.id}` : "Evaluate transcripts to populate the table."}
          rows={activeResults}
        />

        <HistoryDashboard
          sessions={sessions}
          selectedSessionId={activeSession?.id ?? null}
          onSelectSession={handleSelectSession}
        />
      </main>
    </div>
  );
}

const styles = `
  :root {
    color-scheme: light;
    --bg: #f2efe8;
    --bg-accent: #f7fbff;
    --panel: rgba(255, 255, 255, 0.86);
    --panel-strong: #ffffff;
    --border: rgba(26, 32, 44, 0.1);
    --text: #15202b;
    --muted: #5b6573;
    --accent: #1047ff;
    --accent-soft: rgba(16, 71, 255, 0.12);
    --good: #0f8a63;
    --good-soft: rgba(15, 138, 99, 0.12);
    --bad: #bb2d3b;
    --bad-soft: rgba(187, 45, 59, 0.12);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background:
      radial-gradient(circle at top left, rgba(16, 71, 255, 0.14), transparent 28%),
      radial-gradient(circle at 90% 10%, rgba(15, 138, 99, 0.1), transparent 20%),
      linear-gradient(180deg, #faf7f0 0%, #eef4ff 100%);
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    color: var(--text);
    background: transparent;
  }

  button,
  input {
    font: inherit;
  }

  .app-shell {
    min-height: 100vh;
    padding: 32px;
    background: transparent;
  }

  .hero {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;
    margin: 0 auto 24px;
    max-width: 1400px;
  }

  .hero-copy,
  .hero-panel,
  .panel {
    border: 1px solid var(--border);
    border-radius: 28px;
    background: var(--panel);
    backdrop-filter: blur(18px);
    box-shadow: 0 24px 70px rgba(18, 35, 61, 0.08);
  }

  .hero-copy {
    padding: 36px;
  }

  .hero-panel {
    padding: 28px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .eyebrow {
    margin: 0 0 10px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.72rem;
    color: var(--accent);
    font-weight: 800;
  }

  h1,
  h2,
  p {
    margin-top: 0;
  }

  h1 {
    font-size: clamp(2.3rem, 4vw, 4.6rem);
    line-height: 0.95;
    max-width: 11ch;
    margin-bottom: 18px;
  }

  h2 {
    font-size: 1.4rem;
    margin-bottom: 10px;
  }

  .hero-text,
  .panel-note {
    color: var(--muted);
    line-height: 1.6;
  }

  .hero-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 24px;
  }

  .hero-stats div {
    padding: 16px 18px;
    border-radius: 20px;
    background: var(--panel-strong);
    border: 1px solid var(--border);
  }

  .hero-stats strong {
    display: block;
    font-size: 1.5rem;
  }

  .hero-stats span {
    color: var(--muted);
    font-size: 0.92rem;
  }

  .content-grid {
    display: grid;
    gap: 24px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .panel {
    padding: 28px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .upload-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .file-field {
    display: grid;
    gap: 10px;
    padding: 18px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.75);
    border: 1px solid var(--border);
  }

  .file-field span {
    color: var(--muted);
    font-size: 0.92rem;
  }

  .file-field input {
    padding: 14px;
    border-radius: 16px;
    border: 1px dashed rgba(16, 71, 255, 0.3);
    background: #fff;
  }

  .file-field strong {
    font-size: 0.95rem;
  }

  .upload-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 18px;
  }

  .primary-button {
    border: none;
    border-radius: 999px;
    padding: 14px 22px;
    font-weight: 700;
    color: white;
    background: linear-gradient(135deg, var(--accent), #1840c9);
    box-shadow: 0 14px 28px rgba(16, 71, 255, 0.24);
    cursor: pointer;
  }

  .primary-button:disabled {
    opacity: 0.7;
    cursor: progress;
  }

  .status-row {
    display: grid;
    gap: 12px;
  }

  .status-pill {
    padding: 14px 18px;
    border-radius: 18px;
    border: 1px solid var(--border);
    background: var(--panel);
  }

  .status-pill-success {
    color: var(--good);
    background: var(--good-soft);
  }

  .status-pill-error {
    color: var(--bad);
    background: var(--bad-soft);
  }

  .table-wrap {
    overflow-x: auto;
  }

  .metrics-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 760px;
  }

  .metrics-table th,
  .metrics-table td {
    padding: 14px 12px;
    border-bottom: 1px solid var(--border);
    text-align: left;
    white-space: nowrap;
  }

  .metrics-table th {
    color: var(--muted);
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .file-name {
    font-weight: 600;
  }

  .empty-state {
    padding: 26px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.72);
    border: 1px dashed rgba(16, 71, 255, 0.18);
    color: var(--muted);
  }

  .history-list {
    display: grid;
    gap: 14px;
  }

  .history-card {
    width: 100%;
    text-align: left;
    border-radius: 22px;
    border: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.78);
    padding: 18px;
    cursor: pointer;
  }

  .history-card-active {
    border-color: rgba(16, 71, 255, 0.45);
    box-shadow: inset 0 0 0 1px rgba(16, 71, 255, 0.18);
  }

  .history-card-topline {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }

  .history-card-topline span,
  .history-metrics {
    color: var(--muted);
    font-size: 0.92rem;
  }

  .history-metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  @media (max-width: 960px) {
    .hero,
    .upload-grid {
      grid-template-columns: 1fr;
    }

    .panel-header,
    .history-card-topline {
      flex-direction: column;
    }
  }

  @media (max-width: 640px) {
    .app-shell {
      padding: 16px;
    }

    .hero-copy,
    .hero-panel,
    .panel {
      padding: 22px;
      border-radius: 22px;
    }

    h1 {
      max-width: none;
      font-size: 2.2rem;
    }
  }
`;

createRoot(document.getElementById("root")).render(<App />);

export default App;
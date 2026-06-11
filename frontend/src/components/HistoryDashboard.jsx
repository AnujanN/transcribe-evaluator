import React from "react";

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMetric(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  return numberFormatter.format(value);
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "Unknown time";
  }

  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function HistoryDashboard({ sessions, selectedSessionId, onSelectSession }) {
  return (
    <section className="panel history-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Evaluation history</p>
          <h2>Stored sessions</h2>
        </div>
        <p className="panel-note">Persisted in PostgreSQL for later review.</p>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">No sessions have been saved yet.</div>
      ) : (
        <div className="history-list">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className={`history-card ${selectedSessionId === session.id ? "history-card-active" : ""}`}
              onClick={() => onSelectSession(session.id)}
            >
              <div className="history-card-topline">
                <strong>{session.reference_filename}</strong>
                <span>{formatTimestamp(session.created_at)}</span>
              </div>

              <div className="history-metrics">
                <span>Files: {session.hypotheses_count}</span>
                <span>WER {formatMetric(session.average_wer)}%</span>
                <span>CER {formatMetric(session.average_cer)}%</span>
                <span>BLEU {formatMetric(session.average_bleu)}%</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
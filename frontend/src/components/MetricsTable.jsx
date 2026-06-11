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

export default function MetricsTable({ title, subtitle, rows }) {
  return (
    <section className="panel metrics-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Comparison matrix</p>
          <h2>{title}</h2>
        </div>
        {subtitle ? <p className="panel-note">{subtitle}</p> : null}
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">No evaluation results yet. Upload transcripts to begin.</div>
      ) : (
        <div className="table-wrap">
          <table className="metrics-table">
            <thead>
              <tr>
                <th>File name</th>
                <th>WER %</th>
                <th>CER %</th>
                <th>BLEU-4 %</th>
                <th>S</th>
                <th>D</th>
                <th>I</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.filename}-${row.id ?? row.session_id ?? row.substitutions}`}>
                  <td className="file-name">{row.filename}</td>
                  <td>{formatMetric(row.wer)}</td>
                  <td>{formatMetric(row.cer)}</td>
                  <td>{formatMetric(row.bleu)}</td>
                  <td>{row.substitutions ?? "—"}</td>
                  <td>{row.deletions ?? "—"}</td>
                  <td>{row.insertions ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
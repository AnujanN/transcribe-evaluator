import React from "react";

export default function UploadZone({
  referenceFile,
  hypothesisFiles,
  loading,
  onReferenceChange,
  onHypothesesChange,
  onSubmit,
}) {
  return (
    <section className="panel panel-accent upload-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Evaluation workspace</p>
          <h2>Upload transcripts</h2>
        </div>
        <p className="panel-note">Reference plus one or more ASR outputs.</p>
      </div>

      <div className="upload-grid">
        <label className="file-field">
          <span>Ground truth transcript</span>
          <input type="file" accept=".txt,text/plain" onChange={onReferenceChange} />
          <strong>{referenceFile ? referenceFile.name : "No reference selected"}</strong>
        </label>

        <label className="file-field">
          <span>Hypothesis transcripts</span>
          <input type="file" accept=".txt,text/plain" multiple onChange={onHypothesesChange} />
          <strong>{hypothesisFiles.length ? `${hypothesisFiles.length} files selected` : "No hypotheses selected"}</strong>
        </label>
      </div>

      <div className="upload-actions">
        <button className="primary-button" type="button" onClick={onSubmit} disabled={loading}>
          {loading ? "Evaluating..." : "Run evaluation"}
        </button>
      </div>
    </section>
  );
}
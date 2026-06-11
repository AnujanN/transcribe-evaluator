# Transcript-Evaluator

Transcript-Evaluator is a Dockerized web application for comparing one human-verified ground truth transcript against multiple ASR/transcriber outputs. It scores each hypothesis with WER, CER, and BLEU-4, stores every evaluation session in PostgreSQL, and renders the results in a React dashboard.

## Architecture

- `db` uses `postgres:16-alpine` with a persistent named volume.
- `backend` is a FastAPI service packaged with `uv` and SQLModel.
- `frontend` is a Vite React app served by Nginx with `/api` proxying to the backend.

## Quick Start

1. Clone the repository.
2. Copy `.env.example` to `.env` and adjust values if needed.
3. Start the stack:

```bash
docker compose up --build -d
```

4. Open the dashboard at `http://localhost:8080`.
5. The raw API is available at `http://localhost:8000`.

## Environment Variables

The compose file reads these values from `.env`:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `BACKEND_CORS_ORIGINS`
- `VITE_API_BASE_URL`

## Usage

Open `http://localhost:8080` after starting the stack and use the dashboard to upload one reference transcript plus one or more hypothesis files.

The browser talks to the backend through the `/api` proxy, so you do not need to hard-code the API host during normal use.

## API Endpoints

- `POST /api/evaluate` - upload a reference transcript and multiple hypothesis files.
- `GET /api/sessions` - list historical evaluation sessions.
- `GET /api/sessions/{id}` - fetch one session with all transcript results.

## Features

- **Word Error Rate (WER)**: Measures percentage of words that differ between hypothesis and reference
- **Character Error Rate (CER)**: Measures percentage of characters that differ
- **BLEU-4 Score**: Cumulative 4-gram precision metric from machine translation, adapted for ASR
- **Error Breakdown**: Provides detailed counts of substitutions, deletions, and insertions
- **Batch Processing**: Evaluate multiple ASR systems against a single ground truth in one run
- **Session History**: Revisit previous evaluations from the dashboard
- **Web Dashboard**: Review results in a browser instead of a command-line table

## Project Structure

```text
transcribe-evaluator/
├── docker-compose.yml
├── README.md
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── database.py
│   ├── evaluator.py
│   ├── main.py
│   ├── models.py
│   ├── pyproject.toml
│   └── text_normalizer.py
└── frontend/
    ├── Dockerfile
    ├── index.html
    ├── package.json
    └── src/
        ├── App.jsx
        └── components/
            ├── HistoryDashboard.jsx
            ├── MetricsTable.jsx
            └── UploadZone.jsx
```

## Development Notes

- The backend downloads the required NLTK tokenizer data during image build and also checks again at runtime.
- PostgreSQL data is persisted in the named Docker volume `postgres_data`.
- The frontend proxy lets the browser call `/api/*` without hard-coding the backend host.
- The backend image uses Python 3.11.

## Stopping the Stack

```bash
docker compose down
```

Use `docker compose down -v` if you also want to remove the PostgreSQL volume.

## Troubleshooting

### NLTK download errors

The backend automatically handles NLTK tokenizer downloads. If issues persist, rebuild the backend image so it can fetch the tokenizer data again.

### File encoding errors

Ensure all text files you upload are UTF-8 encoded. Most modern text editors default to UTF-8.

## Dependencies

- **jiwer** (≥3.0.0): WER/CER calculation
- **nltk** (≥3.8.0): BLEU score calculation and tokenization
- **pandas** (≥2.0.0): Data manipulation for exports
- **tabulate** (≥0.9.0): ASCII table formatting
- **openpyxl** (≥3.1.5): Excel file writing

All dependencies are specified in `pyproject.toml` and managed by `uv`.

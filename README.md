# Transcript-Evaluator

Transcript-Evaluator is a Dockerized web application for comparing one human-verified ground truth transcript against multiple ASR/transcriber outputs. It scores each hypothesis with WER, CER, and BLEU-4, stores every evaluation session in PostgreSQL, and renders the results in a React dashboard.

## Architecture

- `db` uses `postgres:16-alpine` with a persistent named volume.
- `backend` is a FastAPI service built with `uv` and SQLModel.
- `frontend` is a Vite React app served by Nginx with `/api` proxying to the backend.

## Quick Start

1. Clone the repository.
2. Copy `.env.example` to `.env` and adjust the values if needed.
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

## API Endpoints

- `POST /api/evaluate` - upload a reference transcript and multiple hypothesis files.
- `GET /api/sessions` - list historical evaluation sessions.
- `GET /api/sessions/{id}` - fetch one session with all transcript results.

## Development Notes

- The backend downloads the required NLTK tokenizer data during image build and also checks again at runtime.
- PostgreSQL data is persisted in the named Docker volume `postgres_data`.
- The frontend proxy lets the browser call `/api/*` without hard-coding the backend host.

## Stopping the Stack

```bash
docker compose down
```

Use `docker compose down -v` if you also want to remove the PostgreSQL volume.

## Features

- **Word Error Rate (WER)**: Measures percentage of words that differ between hypothesis and reference
- **Character Error Rate (CER)**: Measures percentage of characters that differ
- **BLEU-4 Score**: Cumulative 4-gram precision metric from machine translation, adapted for ASR
- **Error Breakdown**: Provides detailed counts of substitutions, deletions, and insertions
- **Batch Processing**: Evaluate multiple ASR systems against a single ground truth in one run
- **Export Capabilities**: Save results to CSV or Excel format
- **Beautiful CLI Output**: Formatted ASCII tables with clear, readable results

## Installation

### Prerequisites

- Python 3.9 or higher
- `uv` package manager (install from https://astral.sh/uv/)

### Setup

Clone or navigate to the project directory:

```bash
cd transcribe-evaluator
```

The project uses `uv` for dependency management. All dependencies will be automatically installed when you run the tool.

## Project Structure

```
transcript-evaluator/
├── pyproject.toml           # Project configuration and dependencies
├── main.py                  # CLI entry point
├── text_normalizer.py       # Text normalization pipeline
├── evaluator.py             # Metric calculation engine
├── README.md                # This file
└── data/
    ├── ground_truth.txt     # Reference transcript (human-verified)
    └── hypotheses/          # Directory containing ASR outputs
        ├── whisper_large.txt
        ├── google_speech.txt
        └── assembly_ai.txt
```

## Usage

### Basic Usage

Evaluate ASR transcriptions in the `hypotheses/` directory against a ground truth file:

```bash
uv run main.py --reference data/ground_truth.txt --hypotheses-dir data/hypotheses/
```

### Export Results

Export evaluation results to CSV:

```bash
uv run main.py --reference data/ground_truth.txt --hypotheses-dir data/hypotheses/ --export results.csv
```

Export to Excel (XLSX):

```bash
uv run main.py --reference data/ground_truth.txt --hypotheses-dir data/hypotheses/ --export results.xlsx
```

### Help

View available options:

```bash
uv run main.py --help
```

## Metrics Explanation

### Word Error Rate (WER)

The percentage of words that differ between the ASR output and reference:

```
WER = (S + D + I) / N × 100%
```

Where:
- **S** = Substitutions (word replaced with different word)
- **D** = Deletions (word missing from hypothesis)
- **I** = Insertions (extra word in hypothesis)
- **N** = Total words in reference

Lower WER is better. Typical values range from 5-50% depending on audio quality and domain.

### Character Error Rate (CER)

Similar to WER but operates at the character level instead of word level. Useful for analyzing finer-grained differences.

```
CER = (S + D + I) / N × 100%
```

Lower CER is better.

### BLEU Score

Originally developed for machine translation evaluation, BLEU-4 measures the overlap of 4-grams (sequences of 4 words) between hypothesis and reference.

- Scale: 0-100%
- Higher BLEU is better
- More stringent than WER/CER; captures multi-word phrase accuracy

## Text Normalization

Before metrics are calculated, all text (reference and hypotheses) is normalized:

1. **Lowercase conversion**: "Hello" → "hello"
2. **Punctuation removal**: "Don't!" → "dont"
3. **Artifact removal**: "[laughter]", "[music]", etc. are removed
4. **Space normalization**: Multiple spaces/tabs/newlines → single space
5. **Trim**: Leading/trailing whitespace removed

This ensures fair comparison across different transcription formats.

## Output Example

```
====================================================================================================
TRANSCRIPT EVALUATION RESULTS
====================================================================================================

╒═══════════════════════╦═════════╦═════════╦═══════════════╦═════════════╦═══════════╦═════════════╕
│ File Name             ║ WER (%) ║ CER (%) ║ BLEU Score (%)║ Substitutions  Deletions │ Insertions  │
╠═══════════════════════╬═════════╬═════════╬═══════════════╬═════════════╬═══════════╬═════════════╣
│ whisper_large.txt     ║   2.15  ║   1.83  ║      94.67    ║      2      ║     1     ║      0      │
│ google_speech.txt     ║   5.38  ║   4.62  ║      88.92    ║      4      ║     1     ║      2      │
│ assembly_ai.txt       ║  12.90  ║  10.45  ║      76.54    ║      8      ║     4     ║      3      │
╘═══════════════════════╩═════════╩═════════╩═══════════════╩═════════════╩═══════════╩═════════════╛

Summary Statistics (from 3 files):
  Average WER:  6.81%
  Average CER:  5.63%
  Average BLEU: 86.71%
====================================================================================================
```

## Sample Data

Sample files are included in `data/`:

- **ground_truth.txt**: A short reference transcript about speech recognition
- **hypotheses/**: Contains three example ASR outputs with varying error rates

To use your own data:

1. Create a ground truth file (plain text)
2. Create hypothesis files from different ASR systems
3. Place hypothesis files in a directory
4. Run the tool pointing to these files

## Dependencies

- **jiwer** (≥3.0.0): WER/CER calculation
- **nltk** (≥3.8.0): BLEU score calculation and tokenization
- **pandas** (≥2.0.0): Data manipulation for exports
- **tabulate** (≥0.9.0): ASCII table formatting
- **openpyxl** (≥3.10.0): Excel file writing

All dependencies are specified in `pyproject.toml` and managed by `uv`.

## Error Handling

The tool includes robust error handling for:

- Missing or inaccessible files
- Empty directories or files
- Encoding issues
- NLTK tokenizer download failures

Errors are logged with descriptive messages to help diagnose issues.

## Performance

- Processes multiple hypothesis files in sequence
- Each file evaluation is nearly instantaneous for typical transcripts
- Memory usage is minimal (< 50MB for typical use)
- Suitable for both quick spot checks and batch processing

## Troubleshooting

### "No .txt files found" error

Make sure your hypothesis directory contains `.txt` files and the path is correct.

### NLTK download errors

The tool automatically handles NLTK tokenizer downloads. If issues persist, manually download:

```bash
python -c "import nltk; nltk.download('punkt_tab'); nltk.download('punkt')"
```

### File encoding errors

Ensure all text files are UTF-8 encoded. Most modern text editors default to UTF-8.

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## References

- JiWER Library: https://github.com/jitsi/jiwer
- NLTK: https://www.nltk.org/
- BLEU Score: https://en.wikipedia.org/wiki/BLEU
- Word Error Rate: https://en.wikipedia.org/wiki/Word_error_rate

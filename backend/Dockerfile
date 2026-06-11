FROM ghcr.io/astral-sh/uv:python3.11-alpine AS builder

WORKDIR /app

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    NLTK_DATA=/usr/local/share/nltk_data

RUN apk add --no-cache gcc musl-dev postgresql-dev

COPY pyproject.toml ./

RUN uv sync --no-dev

COPY . .

ENV NLTK_DATA=/usr/local/share/nltk_data

RUN /app/.venv/bin/python - <<'PY'
import os
import nltk

target_dir = "/usr/local/share/nltk_data"
os.makedirs(target_dir, exist_ok=True)

for resource, resource_path in (("punkt_tab", "tokenizers/punkt_tab"), ("punkt", "tokenizers/punkt"), ("wordnet", "corpora/wordnet")):
    try:
        nltk.data.find(resource_path)
    except LookupError:
        try:
            nltk.download(resource, download_dir=target_dir, quiet=True)
        except Exception:
            pass
PY

FROM ghcr.io/astral-sh/uv:python3.11-alpine AS runtime

WORKDIR /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    NLTK_DATA=/usr/local/share/nltk_data

RUN apk add --no-cache libstdc++ postgresql-libs

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /usr/local/share/nltk_data /usr/local/share/nltk_data
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
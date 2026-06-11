"""FastAPI application for Transcript-Evaluator."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from statistics import fmean
from typing import Annotated

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from database import create_db_session, engine
from evaluator import evaluate_transcript, ensure_nltk_dependencies
from models import (
    EvaluationResponse,
    EvaluationSession,
    EvaluationSessionRead,
    EvaluationSessionSummary,
    TranscriptResult,
    TranscriptResultRead,
)
from text_normalizer import normalize_text


def get_session() -> Session:
    """FastAPI dependency that yields a database session."""

    with create_db_session() as session:
        yield session


def parse_cors_origins() -> list[str]:
    """Return the configured CORS origins as a list."""

    raw_value = os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080")
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


async def read_upload_file(upload: UploadFile) -> str:
    """Read a UTF-8 transcript upload into text."""

    raw_bytes = await upload.read()
    if not raw_bytes:
        return ""
    try:
        return raw_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File {upload.filename} must be UTF-8 encoded.",
        ) from exc


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the database and tokenization assets before serving traffic."""

    ensure_nltk_dependencies()
    from sqlmodel import SQLModel

    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(title="Transcript-Evaluator API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Simple readiness endpoint."""

    return {"status": "ok"}


@app.post("/api/evaluate", response_model=EvaluationResponse)
async def evaluate_api(
    reference_file: Annotated[UploadFile, File(...)],
    hypothesis_files: Annotated[list[UploadFile], File(...)],
    session: Session = Depends(get_session),
) -> EvaluationResponse:
    """Evaluate multiple hypothesis transcripts against one reference transcript."""

    if not hypothesis_files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one hypothesis file is required.",
        )

    reference_text = await read_upload_file(reference_file)
    reference_normalized, reference_tokens = normalize_text(reference_text)
    if not reference_normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The reference transcript is empty after normalization.",
        )

    session_row = EvaluationSession(
        reference_filename=reference_file.filename or "reference.txt",
        hypotheses_count=len(hypothesis_files),
        average_wer=0.0,
        average_cer=0.0,
        average_bleu=0.0,
    )
    session.add(session_row)
    session.flush()

    transcript_results: list[TranscriptResult] = []
    for hypothesis_file in hypothesis_files:
        hypothesis_text = await read_upload_file(hypothesis_file)
        normalized_text, hypothesis_tokens = normalize_text(hypothesis_text)
        metrics = evaluate_transcript(reference_normalized, reference_tokens, normalized_text, hypothesis_tokens)

        transcript_results.append(
            TranscriptResult(
                session_id=session_row.id,
                filename=hypothesis_file.filename or "hypothesis.txt",
                wer=float(metrics["wer"]),
                cer=float(metrics["cer"]),
                bleu=float(metrics["bleu"]),
                substitutions=int(metrics["substitutions"]),
                deletions=int(metrics["deletions"]),
                insertions=int(metrics["insertions"]),
            )
        )

    for transcript_result in transcript_results:
        session.add(transcript_result)

    wer_values = [result.wer for result in transcript_results]
    cer_values = [result.cer for result in transcript_results]
    bleu_values = [result.bleu for result in transcript_results]

    session_row.average_wer = fmean(wer_values) if wer_values else 0.0
    session_row.average_cer = fmean(cer_values) if cer_values else 0.0
    session_row.average_bleu = fmean(bleu_values) if bleu_values else 0.0
    session.commit()
    session.refresh(session_row)

    response_results = [
        TranscriptResultRead.model_validate(result, from_attributes=True)
        for result in transcript_results
    ]
    response_session = EvaluationSessionRead.model_validate(session_row, from_attributes=True)
    response_session.results = response_results

    return EvaluationResponse(session=response_session, results=response_results)


@app.get("/api/sessions", response_model=list[EvaluationSessionSummary])
def list_sessions(session: Session = Depends(get_session)) -> list[EvaluationSessionSummary]:
    """Return all evaluation sessions ordered by newest first."""

    rows = session.exec(select(EvaluationSession).order_by(EvaluationSession.created_at.desc())).all()
    return [EvaluationSessionSummary.model_validate(row, from_attributes=True) for row in rows]


@app.get("/api/sessions/{session_id}", response_model=EvaluationSessionRead)
def get_session_detail(session_id: int, session: Session = Depends(get_session)) -> EvaluationSessionRead:
    """Return one session and its transcript results."""

    session_row = session.get(EvaluationSession, session_id)
    if session_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    result_rows = session.exec(
        select(TranscriptResult).where(TranscriptResult.session_id == session_id).order_by(TranscriptResult.filename)
    ).all()

    response = EvaluationSessionRead.model_validate(session_row, from_attributes=True)
    response.results = [TranscriptResultRead.model_validate(row, from_attributes=True) for row in result_rows]
    return response
"""SQLModel table and response models used by the evaluation API."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    """Return a timezone-aware UTC timestamp."""

    return datetime.now(timezone.utc)


class TranscriptResultBase(SQLModel):
    """Shared transcript result fields."""

    filename: str
    wer: float
    cer: float
    bleu: float
    substitutions: int
    deletions: int
    insertions: int


class EvaluationSessionBase(SQLModel):
    """Shared session fields."""

    reference_filename: str
    hypotheses_count: int
    average_wer: float
    average_cer: float
    average_bleu: float
    created_at: datetime = Field(default_factory=utc_now, index=True)


class EvaluationSession(EvaluationSessionBase, table=True):
    """Persisted session record."""

    id: Optional[int] = Field(default=None, primary_key=True)


class TranscriptResult(TranscriptResultBase, table=True):
    """Persisted per-file transcript metrics."""

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="evaluationsession.id", index=True)


class TranscriptResultRead(TranscriptResultBase):
    """API view of a transcript result."""

    id: int
    session_id: int


class EvaluationSessionSummary(EvaluationSessionBase):
    """API view for the session listing endpoint."""

    id: int


class EvaluationSessionRead(EvaluationSessionSummary):
    """API view for the session detail endpoint."""

    results: list[TranscriptResultRead] = Field(default_factory=list)


class EvaluationResponse(SQLModel):
    """API response for a newly created evaluation."""

    session: EvaluationSessionRead
    results: list[TranscriptResultRead]
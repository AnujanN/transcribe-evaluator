"""Database configuration for the Transcript-Evaluator backend."""

from __future__ import annotations

import os

from sqlmodel import Session, create_engine


DEFAULT_DATABASE_URL = "postgresql+psycopg2://transcript_user:transcript_password@db:5432/transcript_evaluator"


def get_database_url() -> str:
    """Return the configured database URL, falling back to the compose default."""

    return os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


engine = create_engine(
    get_database_url(),
    echo=False,
    pool_pre_ping=True,
)


def create_db_session() -> Session:
    """Create a SQLModel session bound to the configured engine."""

    return Session(engine)
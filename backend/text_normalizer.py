"""Text normalization utilities for transcript comparison."""

from __future__ import annotations

import re
import string
from typing import List, Tuple


ARTIFACT_PATTERN = re.compile(r"\[[^\]]+\]")
PUNCTUATION_TRANSLATION = str.maketrans({character: " " for character in string.punctuation})


def normalize_text(text: str) -> Tuple[str, List[str]]:
    """Normalize raw transcript text for fair metric computation."""

    if not text:
        return "", []

    cleaned_text = text.lower()
    cleaned_text = ARTIFACT_PATTERN.sub(" ", cleaned_text)
    cleaned_text = cleaned_text.translate(PUNCTUATION_TRANSLATION)
    cleaned_text = re.sub(r"\s+", " ", cleaned_text).strip()

    return cleaned_text, cleaned_text.split() if cleaned_text else []


def load_and_normalize_text(file_contents: str) -> Tuple[str, List[str]]:
    """Normalize already-loaded file contents."""

    return normalize_text(file_contents)
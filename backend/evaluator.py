"""Metric calculations for Transcript-Evaluator."""

from __future__ import annotations

from functools import lru_cache
from typing import Dict, List

import nltk
from jiwer import process_characters, process_words
from nltk.translate.bleu_score import sentence_bleu


@lru_cache(maxsize=1)
def ensure_nltk_dependencies() -> None:
    """Download or verify the tokenizer resources expected by NLTK."""

    for resource_name in ("tokenizers/punkt_tab", "tokenizers/punkt"):
        try:
            nltk.data.find(resource_name)
            return
        except LookupError:
            continue

    try:
        nltk.download("punkt_tab", quiet=True)
    except Exception:
        nltk.download("punkt", quiet=True)


def _alignment_count(result: object, attribute: str) -> int:
    value = getattr(result, attribute, 0)
    if value is None:
        return 0
    return int(value)


def compute_wer(reference_text: str, hypothesis_text: str) -> float:
    """Return WER as a percentage."""

    try:
        return float(process_words(reference_text, hypothesis_text).wer * 100)
    except Exception:
        return 100.0


def compute_cer(reference_text: str, hypothesis_text: str) -> float:
    """Return CER as a percentage."""

    try:
        return float(process_characters(reference_text, hypothesis_text).cer * 100)
    except Exception:
        return 100.0


def compute_alignment(reference_text: str, hypothesis_text: str) -> Dict[str, int]:
    """Return insertion, deletion, and substitution counts."""

    try:
        result = process_words(reference_text, hypothesis_text)
        return {
            "substitutions": _alignment_count(result, "substitutions"),
            "deletions": _alignment_count(result, "deletions"),
            "insertions": _alignment_count(result, "insertions"),
        }
    except Exception:
        return {"substitutions": 0, "deletions": 0, "insertions": 0}


def compute_bleu_score(reference_tokens: List[str], hypothesis_tokens: List[str]) -> float:
    """Return BLEU-4 as a percentage."""

    ensure_nltk_dependencies()

    if not reference_tokens or not hypothesis_tokens:
        return 0.0

    try:
        bleu = sentence_bleu(
            [reference_tokens],
            hypothesis_tokens,
            weights=(0.25, 0.25, 0.25, 0.25),
        )
        return float(bleu * 100)
    except Exception:
        return 0.0


def evaluate_transcript(
    reference_text: str,
    reference_tokens: List[str],
    hypothesis_text: str,
    hypothesis_tokens: List[str],
) -> Dict[str, float | int]:
    """Compute all evaluation metrics for one transcript pair."""

    wer_score = compute_wer(reference_text, hypothesis_text)
    cer_score = compute_cer(reference_text, hypothesis_text)
    bleu_score = compute_bleu_score(reference_tokens, hypothesis_tokens)
    alignment = compute_alignment(reference_text, hypothesis_text)

    return {
        "wer": wer_score,
        "cer": cer_score,
        "bleu": bleu_score,
        "substitutions": alignment["substitutions"],
        "deletions": alignment["deletions"],
        "insertions": alignment["insertions"],
    }
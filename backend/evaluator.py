"""Metric calculations for Transcript-Evaluator."""

from __future__ import annotations

from functools import lru_cache
from typing import Dict, List

import nltk
from jiwer import process_words
from nltk.corpus import wordnet as wn
from nltk.stem import WordNetLemmatizer
from nltk.translate.bleu_score import sentence_bleu


LEMMATIZER = WordNetLemmatizer()


@lru_cache(maxsize=1)
def ensure_nltk_dependencies() -> None:
    """Download or verify the tokenizer resources expected by NLTK."""

    resources = (
        ("tokenizers/punkt_tab", "punkt_tab"),
        ("tokenizers/punkt", "punkt"),
        ("corpora/wordnet", "wordnet"),
    )

    for resource_path, download_name in resources:
        try:
            nltk.data.find(resource_path)
        except LookupError:
            try:
                nltk.download(download_name, quiet=True)
            except Exception:
                pass


def _semantic_token(token: str) -> str:
    """Return a stable semantic representative for a token."""

    candidates = {
        LEMMATIZER.lemmatize(token),
        LEMMATIZER.lemmatize(token, pos="v"),
        LEMMATIZER.lemmatize(token, pos="a"),
        LEMMATIZER.lemmatize(token, pos="r"),
    }

    for synset in wn.synsets(token):
        for lemma_name in synset.lemma_names():
            candidates.add(lemma_name.lower())

    return sorted(candidates, key=lambda value: (len(value), value))[0]


def _semantic_normalize_text(text: str) -> str:
    """Normalize text into semantic token representatives."""

    if not text:
        return ""

    return " ".join(_semantic_token(token) for token in text.split())


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


def compute_semwer(reference_text: str, hypothesis_text: str) -> float:
    """Return semantic word error rate as a percentage."""

    try:
        semantic_reference = _semantic_normalize_text(reference_text)
        semantic_hypothesis = _semantic_normalize_text(hypothesis_text)
        return float(process_words(semantic_reference, semantic_hypothesis).wer * 100)
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
    semwer_score = compute_semwer(reference_text, hypothesis_text)
    bleu_score = compute_bleu_score(reference_tokens, hypothesis_tokens)
    alignment = compute_alignment(reference_text, hypothesis_text)

    return {
        "wer": wer_score,
        "cer": semwer_score,
        "bleu": bleu_score,
        "substitutions": alignment["substitutions"],
        "deletions": alignment["deletions"],
        "insertions": alignment["insertions"],
    }
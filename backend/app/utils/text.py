"""
Text utilities: keyword extraction, NLP summarization.
Ported directly from Flask app — logic unchanged, DB dependency removed.
"""
import re
import logging
from collections import Counter
from typing import Any

logger = logging.getLogger(__name__)

# NLP — optional, gracefully degraded if model not installed
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
    logger.info("spaCy model loaded")
except OSError:
    nlp = None
    logger.warning("spaCy model not found. Run: python -m spacy download en_core_web_sm")


def extract_project_keywords(project: dict) -> list[str]:
    """Extract and normalize keywords from project keyword field and text content."""
    keywords: set[str] = set()

    raw = project.get("keywords")
    if raw:
        if isinstance(raw, str):
            for kw in re.split(r"[,;|\n]+", raw):
                cleaned = kw.strip().lower()
                if len(cleaned) > 2:
                    keywords.add(cleaned)
        elif isinstance(raw, list):
            for kw in raw:
                if isinstance(kw, str):
                    cleaned = kw.strip().lower()
                    if len(cleaned) > 2:
                        keywords.add(cleaned)

    if nlp:
        text = ""
        if project.get("title"):
            text += project["title"] + " "
        if project.get("objective"):
            text += project["objective"][:500]

        if text:
            try:
                doc = nlp(text)
                for ent in doc.ents:
                    if ent.label_ in ("PRODUCT", "TECHNOLOGY", "ORG", "EVENT", "WORK_OF_ART"):
                        cleaned = ent.text.lower().strip()
                        if len(cleaned) > 2:
                            keywords.add(cleaned)
                for chunk in doc.noun_chunks:
                    if 2 <= len(chunk.text.split()) <= 4:
                        cleaned = chunk.text.lower().strip()
                        if len(cleaned) > 5:
                            keywords.add(cleaned)
            except Exception as e:
                logger.warning("NLP keyword extraction error: %s", e)

    return list(keywords)


def summarize_objective(objective_text: str, max_sentences: int = 3) -> str | None:
    """Extractive summarization using spaCy. Returns None if model unavailable."""
    if not objective_text or not nlp:
        return None

    try:
        doc = nlp(objective_text)
        sentences = list(doc.sents)

        if len(sentences) <= max_sentences:
            return objective_text

        eu_keywords = [
            "aims", "objective", "goal", "purpose", "mission", "vision",
            "develop", "create", "improve", "enhance", "support", "promote",
            "address", "focus", "target", "seek", "investigate", "explore",
            "implement", "establish", "facilitate", "deliver", "provide",
            "innovation", "research", "technology", "sustainability", "digital",
            "climate", "environment", "health", "security", "mobility",
            "energy", "agriculture", "education", "society", "economy",
            "impact", "benefit", "solution", "challenge", "opportunity",
            "transformation", "advancement", "breakthrough", "excellence",
        ]

        scored = []
        for i, sent in enumerate(sentences):
            score = 0
            sent_lower = sent.text.lower()
            score += sum(2 for w in eu_keywords if w in sent_lower)
            if i == 0:
                score += 5
            elif i == 1:
                score += 3
            word_count = len(sent.text.split())
            if 10 <= word_count <= 30:
                score += 1
            if any(e.label_ in ("PRODUCT", "TECHNOLOGY", "ORG") for e in sent.ents):
                score += 2
            scored.append((score, i, sent.text.strip()))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = sorted(scored[:max_sentences], key=lambda x: x[1])
        return " ".join(s for _, _, s in top)

    except Exception as e:
        logger.warning("Summarization error: %s", e)
        return None


def compute_keyword_counts(projects: list[dict], limit: int = 50) -> list[dict]:
    """Count keyword frequency across a list of project docs."""
    all_keywords: list[str] = []
    for project in projects:
        all_keywords.extend(extract_project_keywords(project))
    counter = Counter(all_keywords)
    return [{"keyword": k, "count": v} for k, v in counter.most_common(limit)]

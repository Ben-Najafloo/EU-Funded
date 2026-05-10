from datetime import datetime
from bson import ObjectId
from typing import Any


def serialize_doc(doc: dict) -> dict:
    """Convert ObjectId fields to strings recursively."""
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, dict):
            out[k] = serialize_doc(v)
        elif isinstance(v, list):
            out[k] = [serialize_doc(i) if isinstance(i, dict) else i for i in v]
        else:
            out[k] = v
    return out


def parse_float(val: Any) -> float:
    """Parse float from various formats stored in MongoDB."""
    try:
        return float(str(val).replace(",", "").strip()) if val not in (None, "") else 0.0
    except Exception:
        return 0.0


def parse_date(val: Any) -> str | None:
    """Parse date string to ISO format."""
    if not val:
        return None
    try:
        return datetime.strptime(str(val), "%Y-%m-%d").date().isoformat()
    except Exception:
        return None


def normalize_project(doc: dict) -> dict:
    """
    Convert raw MongoDB project document to the API response shape.
    Field names here must match what the Flask app returns exactly.
    """
    return {
        "id": doc.get("id"),
        "acronym": doc.get("acronym"),
        "title": doc.get("title"),
        "status": doc.get("status"),
        "start_date": parse_date(doc.get("startDate")),
        "end_date": parse_date(doc.get("endDate")),
        "total_cost": parse_float(doc.get("totalCost")),
        "eu_contribution": parse_float(doc.get("ecMaxContribution")),
        "legal_basis": doc.get("legalBasis"),
        "topics": doc.get("topics"),
        "programme": doc.get("frameworkProgramme"),
        "objective": doc.get("objective"),
        "signature_date": doc.get("ecSignatureDate"),
        "keywords": doc.get("keywords"),
    }

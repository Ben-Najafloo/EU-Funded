# app/routes/projects/utils.py
"""Utility functions for data normalization, serialization, and enrichment."""

from datetime import datetime
from bson import ObjectId
from .base import organizations_collection, nlp
import re
from collections import Counter


def normalize_project(doc):
    """Convert MongoDB document to API response format with correct types."""
    return {
        "id": doc.get("id"),
        "acronym": doc.get("acronym"),
        "title": doc.get("title"),
        "status": doc.get("status"),
        "start_date": _parse_date(doc.get("startDate")),
        "end_date": _parse_date(doc.get("endDate")),
        "total_cost": _parse_float(doc.get("totalCost")),
        "eu_contribution": _parse_float(doc.get("ecMaxContribution")),
        "legal_basis": doc.get("legalBasis"),
        "topics": doc.get("topics"),
        "programme": doc.get("frameworkProgramme"),
        "objective": doc.get("objective"),
        "signature_date": doc.get("ecSignatureDate"),
        "keywords": doc.get("keywords")
    }


def _parse_float(val):
    """Parse float values from various formats."""
    try:
        return float(str(val).replace(",", "").strip()) if val not in (None, "") else 0.0
    except Exception:
        return 0.0


def _parse_date(val):
    """Parse date values to ISO format."""
    if not val:
        return None
    try:
        return datetime.strptime(val, "%Y-%m-%d").date().isoformat()
    except Exception:
        return None


def serialize_doc(doc):
    """Convert ObjectId to string for JSON."""
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


def convert_objectid(doc):
    """Convert all ObjectId fields in a document to strings."""
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
    return doc


def enrich_project_with_organizations(project_doc):
    """Add organization data to a project document, excluding the coordinator from organizations list."""
    project_id = project_doc["id"]

    # Fetch related organizations
    organizations = []
    coordinator = None

    for org in organizations_collection.find({"projectID": project_id}):
        org_data = serialize_doc(org)

        # Count how many projects this organization participates in
        org_data["project_count"] = organizations_collection.count_documents({
            "organisationID": org_data["organisationID"]
        })

        # Count how many projects this organization coordinates
        org_data["coordinator_count"] = organizations_collection.count_documents({
            "organisationID": org_data["organisationID"],
            "role": {"$regex": "^coordinator$", "$options": "i"}
        })

        # Check if this is the coordinator
        if org_data.get("role", "").lower() == "coordinator":
            coordinator = org_data
        else:
            organizations.append(org_data)

    # Create a copy of the project document and add organization data
    enriched_project = project_doc.copy()
    enriched_project["coordinator"] = coordinator
    enriched_project["organizations"] = organizations

    return enriched_project


def extract_project_keywords(project):
    """Extract and normalize keywords from project's keyword field and text content."""
    keywords = set()

    # 1. Use existing keywords field (most important)
    if project.get("keywords"):
        project_keywords = project["keywords"]
        if isinstance(project_keywords, str):
            # Split by common delimiters
            raw_keywords = re.split(r'[,;|\n]+', project_keywords)
            for keyword in raw_keywords:
                cleaned = keyword.strip().lower()
                if len(cleaned) > 2:  # Filter out very short words
                    keywords.add(cleaned)
        elif isinstance(project_keywords, list):
            for keyword in project_keywords:
                if isinstance(keyword, str):
                    cleaned = keyword.strip().lower()
                    if len(cleaned) > 2:
                        keywords.add(cleaned)

    # 2. Extract from title and objective using NLP (if available)
    if nlp:
        text_content = ""
        if project.get("title"):
            text_content += project["title"] + " "
        if project.get("objective"):
            # Take first 500 chars to avoid processing very long texts
            text_content += project["objective"][:500]

        if text_content:
            try:
                doc = nlp(text_content)
                # Extract meaningful entities and noun phrases
                for ent in doc.ents:
                    if ent.label_ in ["PRODUCT", "TECHNOLOGY", "ORG", "EVENT", "WORK_OF_ART"]:
                        cleaned = ent.text.lower().strip()
                        if len(cleaned) > 2:
                            keywords.add(cleaned)

                # Extract key noun phrases (2-4 words)
                for chunk in doc.noun_chunks:
                    if 2 <= len(chunk.text.split()) <= 4:
                        cleaned = chunk.text.lower().strip()
                        if len(cleaned) > 5:  # Longer phrases only
                            keywords.add(cleaned)

            except Exception as e:
                print(f"Error in NLP keyword extraction: {e}")

    return list(keywords)


def get_trending_keywords(limit=50):
    """Get most common keywords across all projects."""
    from .base import projects_collection

    try:
        # Aggregate keywords from all projects
        pipeline = [
            {"$match": {"keywords": {"$exists": True, "$ne": None}}},
            {"$project": {"keywords": 1, "title": 1, "objective": 1}},
            {"$limit": 1000}  # Process reasonable number of projects
        ]

        projects = list(projects_collection.aggregate(pipeline))
        all_keywords = []

        for project in projects:
            keywords = extract_project_keywords(project)
            all_keywords.extend(keywords)

        # Count frequency and return top keywords
        keyword_counter = Counter(all_keywords)
        return [{"keyword": k, "count": v} for k, v in keyword_counter.most_common(limit)]

    except Exception as e:
        print(f"Error getting trending keywords: {e}")
        return []


def get_keyword_suggestions(query, limit=10):
    """Get keyword suggestions based on partial query."""
    from .base import projects_collection

    try:
        if len(query) < 2:
            return []

        # Use text search on keywords field
        search_pipeline = [
            {
                "$match": {
                    "$or": [
                        {"keywords": {"$regex": query, "$options": "i"}},
                        {"title": {"$regex": query, "$options": "i"}}
                    ]
                }
            },
            {"$project": {"keywords": 1, "title": 1}},
            {"$limit": 100}
        ]

        projects = list(projects_collection.aggregate(search_pipeline))
        suggestions = set()

        for project in projects:
            keywords = extract_project_keywords(project)
            for keyword in keywords:
                if query.lower() in keyword.lower():
                    suggestions.add(keyword)
                    if len(suggestions) >= limit:
                        break
            if len(suggestions) >= limit:
                break

        return sorted(list(suggestions))

    except Exception as e:
        print(f"Error getting keyword suggestions: {e}")
        return []


def summarize_objective(objective_text, max_sentences=3):
    """Enhanced summarization using both NLP and project-specific keywords."""
    if not objective_text or not nlp:
        return None

    try:
        doc = nlp(objective_text)
        sentences = list(doc.sents)

        if len(sentences) <= max_sentences:
            return objective_text

        # Enhanced keywords specific to EU research projects
        eu_keywords = [
            # Core objectives
            "aims", "objective", "goal", "purpose", "mission", "vision",
            # Actions
            "develop", "create", "improve", "enhance", "support", "promote",
            "address", "focus", "target", "seek", "investigate", "explore",
            "implement", "establish", "facilitate", "deliver", "provide",
            # EU-specific terms
            "innovation", "research", "technology", "sustainability", "digital",
            "climate", "environment", "health", "security", "mobility",
            "energy", "agriculture", "education", "society", "economy",
            # Impact words
            "impact", "benefit", "solution", "challenge", "opportunity",
            "transformation", "advancement", "breakthrough", "excellence"
        ]

        scored = []
        for i, sent in enumerate(sentences):
            score = 0
            sent_text = sent.text.lower()

            # Keyword matching
            score += sum(2 if word in sent_text else 0 for word in eu_keywords)

            # Position bonus (first sentences often contain main objectives)
            if i == 0:
                score += 5
            elif i == 1:
                score += 3

            # Length penalty for very short or very long sentences
            word_count = len(sent.text.split())
            if 10 <= word_count <= 30:
                score += 1

            # Entity bonus (using spaCy NER)
            entities = [ent.label_ for ent in sent.ents]
            if any(label in entities for label in ["PRODUCT", "TECHNOLOGY", "ORG"]):
                score += 2

            scored.append((score, sent.text.strip()))

        # Sort by score and take top sentences
        scored.sort(key=lambda x: x[0], reverse=True)
        top_sentences = [s for _, s in scored[:max_sentences]]

        # Maintain original order for readability
        original_order = []
        for sent in sentences:
            if sent.text.strip() in top_sentences:
                original_order.append(sent.text.strip())
                if len(original_order) == max_sentences:
                    break

        return " ".join(original_order)

    except Exception as e:
        print(f"Error in enhanced summarization: {str(e)}")
        return None

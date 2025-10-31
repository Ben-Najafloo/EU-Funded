# app/routes/projects.py
from flask import request, jsonify
from bson import ObjectId
from flask import Blueprint, jsonify, request
from pymongo import MongoClient, ASCENDING, DESCENDING
import os
from datetime import datetime
from collections import Counter
import re

# expiring-soon
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

# NLP imports
import spacy
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    nlp = None


projects_bp = Blueprint("projects", __name__)


# --- MongoDB Setup ---
mongo_client = MongoClient(os.getenv("MONGOURL"))
db = mongo_client["cordis_db"]
projects_collection = db["projects"]
organizations_collection = db["organizations"]


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
        "keywords": doc.get("keywords")  # Add keywords field
    }


def _parse_float(val):
    try:
        return float(str(val).replace(",", "").strip()) if val not in (None, "") else 0.0
    except Exception:
        return 0.0


def _parse_date(val):
    if not val:
        return None
    try:
        # Normalize YYYY-MM-DD format
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


# === NEW KEYWORD FUNCTIONS ===

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


# === EXISTING ROUTES (UNCHANGED) ===

@projects_bp.route("/", methods=["GET"])
def list_projects():
    """Return first N projects with pagination."""
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("limit", 20))
    skip = (page - 1) * per_page

    cursor = projects_collection.find({}).skip(skip).limit(per_page)
    projects = [normalize_project(doc) for doc in cursor]
    total_count = projects_collection.estimated_document_count()

    return jsonify({
        "page": page,
        "limit": per_page,
        "total": total_count,
        "results": projects
    })


@projects_bp.route("/recent", methods=["GET"])
def get_recent_projects():
    cursor = projects_collection.find({}).sort(
        "startDate", DESCENDING).limit(15)

    projects = []
    for doc in cursor:
        normalized = normalize_project(doc)
        enriched = enrich_project_with_organizations(normalized)
        projects.append(enriched)

    return jsonify(projects)


@projects_bp.route("/closed", methods=["GET"])
def get_closed_projects():
    cursor = projects_collection.find(
        {"endDate": {"$ne": None}}).sort("endDate", ASCENDING).limit(15)

    projects = []
    for doc in cursor:
        normalized = normalize_project(doc)
        enriched = enrich_project_with_organizations(normalized)
        projects.append(enriched)

    return jsonify(projects)


@projects_bp.route("/all_topics", methods=["GET"])
def get_all_topics():
    all_topics = db.projects.distinct("topics")
    return jsonify(all_topics)


@projects_bp.route('/all_topics/search')
def search_topics():
    query = request.args.get('q', '')
    topics = db.projects.distinct("topics")
    filtered = [p for p in topics if query.lower() in p.lower()]
    return jsonify(filtered[:1000])  # Limit results


@projects_bp.route("/expiring_soon", methods=["GET"])
def get_expiring_soon_projects():
    today = datetime.now().date()
    two_months_later = today + relativedelta(months=2)

    today_str = today.isoformat()
    two_months_later_str = two_months_later.isoformat()

    query = {
        "endDate": {
            "$gte": today_str,
            "$lte": two_months_later_str
        }
    }

    cursor = projects_collection.find(query).sort(
        "endDate", ASCENDING).limit(15)

    projects = []
    for doc in cursor:
        normalized = normalize_project(doc)
        enriched = enrich_project_with_organizations(normalized)
        projects.append(enriched)

    return jsonify(projects)


@projects_bp.route("/statistics/summary", methods=["GET"])
def get_project_statistics():
    """Return summary statistics for the projects database."""
    try:
        total_projects = projects_collection.count_documents({})

        status_counts = {}
        statuses = ["SIGNED", "CLOSED", "TERMINATED", "ONGOING"]

        for status in statuses:
            count = projects_collection.count_documents({"status": status})
            status_counts[status.lower()] = count

        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "total_contribution": {
                        "$sum": {
                            "$convert": {
                                "input": "$ecMaxContribution",
                                "to": "double",
                                "onError": 0,
                                "onNull": 0
                            }
                        }
                    }
                }
            }
        ]

        contribution_result = list(projects_collection.aggregate(pipeline))
        total_contribution = contribution_result[0]["total_contribution"] if contribution_result else 0

        country_count = len(organizations_collection.distinct("country"))

        org_count = organizations_collection.count_documents({})

        return jsonify({
            "total_projects": total_projects,
            "status_counts": status_counts,
            "total_contribution": total_contribution,
            "countries_involved": country_count,
            "organizations_count": org_count
        })

    except Exception as e:
        print(f"Error generating statistics: {str(e)}")
        return jsonify({"error": "Could not generate statistics"}), 500


@projects_bp.route("/search", methods=["GET"])
def search_projects():
    q = request.args.get("q", "").strip()
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 10))
    skip = (page - 1) * per_page

    pipeline = []

    # --- TEXT SEARCH WITH CUSTOM PHRASE BOOST ---
    if q:
        # Step 1: Text search
        pipeline.append({
            "$match": {
                "$text": {"$search": q}
            }
        })

        # Step 2: Calculate base text score
        pipeline.append({
            "$addFields": {
                "textScore": {"$meta": "textScore"}
            }
        })

        # Step 3: Add phrase boost
        # Check if exact phrase exists in title (highest priority)
        escaped_q = re.escape(q.lower())
        pipeline.append({
            "$addFields": {
                "titlePhraseBoost": {
                    "$cond": {
                        "if": {
                            "$regexMatch": {
                                "input": {"$toLower": "$title"},
                                "regex": escaped_q
                            }
                        },
                        "then": 100,  # Huge boost for title phrase match
                        "else": 0
                    }
                },
                "objectivePhraseBoost": {
                    "$cond": {
                        "if": {
                            "$regexMatch": {
                                "input": {"$toLower": "$objective"},
                                "regex": escaped_q
                            }
                        },
                        "then": 50,  # Good boost for objective phrase match
                        "else": 0
                    }
                },
                "keywordsPhraseBoost": {
                    "$cond": {
                        "if": {
                            "$regexMatch": {
                                "input": {"$toLower": {"$ifNull": ["$keywords", ""]}},
                                "regex": escaped_q
                            }
                        },
                        "then": 75,  # Great boost for keywords phrase match
                        "else": 0
                    }
                }
            }
        })

        # Step 4: Calculate final score
        pipeline.append({
            "$addFields": {
                "finalScore": {
                    "$add": [
                        "$textScore",
                        "$titlePhraseBoost",
                        "$objectivePhraseBoost",
                        "$keywordsPhraseBoost"
                    ]
                }
            }
        })

    # --- Other filters ---
    filters = {}

    keywords_param = request.args.get("keywords")
    if keywords_param:
        keywords = [k.strip() for k in keywords_param.split(",") if k.strip()]
        if keywords:
            filters["$or"] = [
                {"keywords": {
                    "$regex": rf"\b{re.escape(k)}\b", "$options": "i"}}
                for k in keywords
            ]

    status = request.args.get("status")
    if status:
        filters["status"] = status

    acronym = request.args.get("acronym")
    if acronym:
        filters["acronym"] = {
            "$regex": rf"^{re.escape(acronym)}$", "$options": "i"}

    title = request.args.get("title")
    if title:
        filters["title"] = {"$regex": re.escape(title), "$options": "i"}

    programme = request.args.get("programme")
    if programme:
        filters["frameworkProgramme"] = programme

    topics = request.args.get("topics")
    if topics:
        filters["topics"] = topics

    start_date = request.args.get("start_date")
    if start_date:
        filters["startDate"] = {"$gte": start_date}

    end_date = request.args.get("end_date")
    if end_date:
        filters.setdefault("endDate", {})
        filters["endDate"]["$lte"] = end_date

    min_contribution = request.args.get("min_contribution")
    max_contribution = request.args.get("max_contribution")
    if min_contribution or max_contribution:
        try:
            filters["ecMaxContribution"] = {}
            if min_contribution:
                filters["ecMaxContribution"]["$gte"] = float(min_contribution)
            if max_contribution:
                filters["ecMaxContribution"]["$lte"] = float(max_contribution)
        except ValueError:
            pass

    min_total_cost = request.args.get("min_total_cost")
    max_total_cost = request.args.get("max_total_cost")
    if min_total_cost or max_total_cost:
        try:
            filters["totalCost"] = {}
            if min_total_cost:
                filters["totalCost"]["$gte"] = float(min_total_cost)
            if max_total_cost:
                filters["totalCost"]["$lte"] = float(max_total_cost)
        except ValueError:
            pass

    if filters:
        pipeline.append({"$match": filters})

    # Sort by final score (if text search) or by date
    if q:
        pipeline.append({"$sort": {"finalScore": -1, "startDate": -1}})
    else:
        pipeline.append({"$sort": {"startDate": -1}})

    # Get total count before pagination
    count_pipeline = pipeline.copy()
    count_pipeline.append({"$count": "total"})
    count_result = list(projects_collection.aggregate(count_pipeline))
    total_count = count_result[0]["total"] if count_result else 0

    # Add pagination
    pipeline.append({"$skip": skip})
    pipeline.append({"$limit": per_page})

    # ... (previous code remains the same)

    # Execute aggregation
    cursor = projects_collection.aggregate(pipeline)
    results = []

    for doc in cursor:
        doc = serialize_doc(doc)
        project_id = doc["id"]

        # Fetch related organizations
        organizations = []
        for org in organizations_collection.find({"projectID": project_id}):
            org_data = serialize_doc(org)
            org_data["project_count"] = organizations_collection.count_documents({
                "organisationID": org_data["organisationID"]
            })
            org_data["coordinator_count"] = organizations_collection.count_documents({
                "organisationID": org_data["organisationID"],
                "role": {"$regex": "^coordinator$", "$options": "i"}
            })
            organizations.append(org_data)

        countries = request.args.get("countries")
        if countries:
            allowed_countries = set(countries.split(","))
            org_countries = {org.get("country") for org in organizations}
            if org_countries.isdisjoint(allowed_countries):
                continue

        coordinator = next(
            (org for org in organizations if org.get(
                "role", "").lower() == "coordinator"),
            None
        )
        organizations = [org for org in organizations if org.get(
            "role", "").lower() != "coordinator"]

        doc["extracted_keywords"] = extract_project_keywords(doc)[:10]

        if request.args.get('include_summary') == 'true' and doc.get("objective"):
            doc["objective_summary"] = summarize_objective(doc["objective"])

        doc["coordinator"] = coordinator
        doc["organizations"] = organizations

        # Include finalScore in the response
        if q and "finalScore" in doc:
            doc["relevance_score"] = round(doc["finalScore"], 2)

        # Clean up ONLY the internal intermediate scoring fields, but keep finalScore
        for field in ["textScore", "titlePhraseBoost", "objectivePhraseBoost", "keywordsPhraseBoost"]:
            doc.pop(field, None)

        results.append(doc)

    return jsonify({
        "projects": results,
        "total": total_count,
        "page": page,
        "pages": (total_count + per_page - 1) // per_page,
        "per_page": per_page
    })


@projects_bp.route("/<project_id>", methods=["GET"])
def get_project(project_id):
    """Return a single project with its organizations and coordinator."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        return jsonify({"error": "Project not found"}), 404

    project = convert_objectid(project)
    enriched = enrich_project_with_organizations(project)

    # Add enhanced keywords
    enriched["extracted_keywords"] = extract_project_keywords(project)

    # Always provide objective summary data structure
    if project.get("objective"):
        summary = summarize_objective(project["objective"])
        enriched["objective_data"] = {
            "full_text": project["objective"],
            "summary": summary,
            "has_summary": summary is not None,
            "original_length": len(project["objective"]),
            "summary_length": len(summary) if summary else 0,
            "compression_ratio": round(len(summary) / len(project["objective"]) * 100, 1) if summary else 0
        }
    else:
        enriched["objective_data"] = {
            "full_text": None,
            "summary": None,
            "has_summary": False,
            "original_length": 0,
            "summary_length": 0,
            "compression_ratio": 0
        }

    return jsonify(enriched)


# === NEW KEYWORD-SPECIFIC ENDPOINTS ===

@projects_bp.route("/keywords/trending", methods=["GET"])
def get_trending_keywords_endpoint():
    """Get most popular keywords across projects."""
    try:
        limit = min(int(request.args.get("limit", 50)), 100)
        keywords = get_trending_keywords(limit)
        return jsonify({
            "keywords": keywords,
            "total": len(keywords)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_bp.route("/keywords/suggestions", methods=["GET"])
def get_keyword_suggestions_endpoint():
    """Get keyword suggestions for autocomplete."""
    try:
        query = request.args.get("q", "")
        limit = min(int(request.args.get("limit", 10)), 20)
        suggestions = get_keyword_suggestions(query, limit)
        return jsonify({
            "suggestions": suggestions,
            "query": query
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_bp.route("/<project_id>/keywords", methods=["GET"])
def get_project_keywords_endpoint(project_id):
    """Get extracted keywords for a specific project."""
    try:
        project = projects_collection.find_one({"id": project_id})
        if not project:
            return jsonify({"error": "Project not found"}), 404

        keywords = extract_project_keywords(project)
        return jsonify({
            "project_id": project_id,
            "keywords": keywords,
            "total": len(keywords)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_bp.route("/<project_id>/summary", methods=["GET"])
def get_project_summary(project_id):
    """Generate AI summary for a project's objective."""
    try:
        project = projects_collection.find_one({"id": project_id})
        if not project:
            return jsonify({"error": "Project not found"}), 404

        objective = project.get("objective")
        if not objective:
            return jsonify({"error": "No objective available"}), 404

        summary = summarize_objective(objective)

        return jsonify({
            "project_id": project_id,
            "original_length": len(objective),
            "summary_length": len(summary) if summary else 0,
            "summary": summary,
            "success": summary is not None
        })

    except Exception as e:
        print(f"Error generating summary: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

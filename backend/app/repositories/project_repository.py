"""
Project repository — all MongoDB queries for projects.
No HTTP logic here. No Flask/FastAPI imports.
"""
import re
import logging
from datetime import datetime
from dateutil.relativedelta import relativedelta
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import ASCENDING, DESCENDING

from app.utils.serializers import normalize_project, serialize_doc
from app.utils.text import extract_project_keywords, summarize_objective, compute_keyword_counts

logger = logging.getLogger(__name__)

# ── Organization enrichment pipeline (shared) ────────────────────────────────
# Single aggregation that replaces the N+1 loop from Flask.
# For a list of project IDs, fetches all orgs in one round-trip
# and computes project_count + coordinator_count server-side.

def _org_lookup_pipeline() -> list[dict]:
    return [
        {
            "$lookup": {
                "from": "organizations",
                "localField": "id",
                "foreignField": "projectID",
                "as": "_orgs_raw",
            }
        },
        {
            "$lookup": {
                "from": "organizations",
                "localField": "_orgs_raw.organisationID",
                "foreignField": "organisationID",
                "as": "_all_participations",
            }
        },
        {
            "$addFields": {
                "_orgs_raw": {
                    "$map": {
                        "input": "$_orgs_raw",
                        "as": "org",
                        "in": {
                            "$mergeObjects": [
                                "$$org",
                                {
                                    "project_count": {
                                        "$size": {
                                            "$filter": {
                                                "input": "$_all_participations",
                                                "cond": {"$eq": ["$$this.organisationID", "$$org.organisationID"]},
                                            }
                                        }
                                    },
                                    "coordinator_count": {
                                        "$size": {
                                            "$filter": {
                                                "input": "$_all_participations",
                                                "cond": {
                                                    "$and": [
                                                        {"$eq": ["$$this.organisationID", "$$org.organisationID"]},
                                                        {"$regexMatch": {"input": {"$ifNull": ["$$this.role", ""]}, "regex": "^coordinator$", "options": "i"}},
                                                    ]
                                                },
                                            }
                                        }
                                    },
                                },
                            ]
                        },
                    }
                }
            }
        },
    ]


def _shape_orgs(raw_orgs: list[dict]) -> tuple[dict | None, list[dict]]:
    """Split org list into coordinator + participants, serialize ObjectIds."""
    coordinator = None
    participants = []
    for org in raw_orgs:
        org = serialize_doc(org)
        org.pop("_id", None)
        if org.get("role", "").lower() == "coordinator":
            coordinator = org
        else:
            participants.append(org)
    return coordinator, participants


# ── Queries ──────────────────────────────────────────────────────────────────

async def list_projects(
    col: AsyncIOMotorCollection,
    page: int,
    per_page: int,
) -> tuple[list[dict], int]:
    skip = (page - 1) * per_page
    cursor = col.find({}).skip(skip).limit(per_page)
    docs = await cursor.to_list(length=per_page)
    total = await col.estimated_document_count()
    return [normalize_project(d) for d in docs], total


async def get_recent_projects(
    projects_col: AsyncIOMotorCollection,
    orgs_col: AsyncIOMotorCollection,
    limit: int = 15,
) -> list[dict]:
    pipeline = [
        {"$sort": {"startDate": DESCENDING}},
        {"$limit": limit},
        *_org_lookup_pipeline(),
    ]
    docs = await projects_col.aggregate(pipeline).to_list(length=limit)
    return _format_enriched_list(docs)


async def get_closed_projects(
    projects_col: AsyncIOMotorCollection,
    orgs_col: AsyncIOMotorCollection,
    limit: int = 15,
) -> list[dict]:
    pipeline = [
        {"$match": {"endDate": {"$ne": None}}},
        {"$sort": {"endDate": ASCENDING}},
        {"$limit": limit},
        *_org_lookup_pipeline(),
    ]
    docs = await projects_col.aggregate(pipeline).to_list(length=limit)
    return _format_enriched_list(docs)


async def get_expiring_soon_projects(
    projects_col: AsyncIOMotorCollection,
    limit: int = 15,
) -> list[dict]:
    today = datetime.now().date()
    two_months = today + relativedelta(months=2)
    pipeline = [
        {"$match": {"endDate": {"$gte": today.isoformat(), "$lte": two_months.isoformat()}}},
        {"$sort": {"endDate": ASCENDING}},
        {"$limit": limit},
        *_org_lookup_pipeline(),
    ]
    docs = await projects_col.aggregate(pipeline).to_list(length=limit)
    return _format_enriched_list(docs)


async def get_all_topics(col: AsyncIOMotorCollection) -> list[str]:
    topics = await col.distinct("topics")
    return [t for t in topics if t]


async def search_topics(col: AsyncIOMotorCollection, q: str) -> list[str]:
    """Filter topics server-side — no Python-memory loading."""
    pipeline = [
        {"$match": {"topics": {"$regex": re.escape(q), "$options": "i"}}},
        {"$unwind": "$topics"},
        {"$match": {"topics": {"$regex": re.escape(q), "$options": "i"}}},
        {"$group": {"_id": "$topics"}},
        {"$limit": 1000},
    ]
    docs = await col.aggregate(pipeline).to_list(length=1000)
    return [d["_id"] for d in docs if d["_id"]]


async def search_projects(
    projects_col: AsyncIOMotorCollection,
    q: str,
    page: int,
    per_page: int,
    filters: dict,
    countries: set[str] | None,
    include_summary: bool,
) -> tuple[list[dict], int]:
    """
    Full-text search with:
    - $text index for word matching
    - phrase boost scoring on title / keywords / objective
    - all filters applied server-side inside the pipeline
    - single $facet for count + results (one round-trip)
    - $lookup for org enrichment (no N+1)
    """
    pipeline: list[dict] = []

    if q:
        pipeline.append({"$match": {"$text": {"$search": q}}})
        pipeline.append({"$addFields": {"_textScore": {"$meta": "textScore"}}})

        escaped = re.escape(q.lower())
        pipeline.append({
            "$addFields": {
                "_titleBoost": {"$cond": [{"$regexMatch": {"input": {"$toLower": "$title"}, "regex": escaped}}, 100, 0]},
                "_kwBoost":    {"$cond": [{"$regexMatch": {"input": {"$toLower": {"$ifNull": ["$keywords", ""]}}, "regex": escaped}}, 75, 0]},
                "_objBoost":   {"$cond": [{"$regexMatch": {"input": {"$toLower": {"$ifNull": ["$objective", ""]}}, "regex": escaped}}, 50, 0]},
            }
        })
        pipeline.append({
            "$addFields": {
                "finalScore": {"$add": ["$_textScore", "$_titleBoost", "$_kwBoost", "$_objBoost"]}
            }
        })

    # Filters — all applied before pagination
    if filters:
        pipeline.append({"$match": filters})

    # Country filter — server-side via $lookup
    if countries:
        # Pre-fetch project IDs that have orgs in the requested countries
        country_pipeline = [
            {"$match": {"country": {"$in": list(countries)}}},
            {"$group": {"_id": "$projectID"}},
        ]
        country_cursor = projects_col.database["organizations"].aggregate(
            country_pipeline, allowDiskUse=True
        )
        country_docs = await country_cursor.to_list(length=None)
        matching_ids = [d["_id"] for d in country_docs]

        if not matching_ids:
            return [], 0

        # Add project ID filter to the main pipeline
        if q.strip():
            # $text must stay first — merge country filter into second stage or append after text match
            pipeline.insert(1, {"$match": {"id": {"$in": matching_ids}}})
        else:
            pipeline.insert(0, {"$match": {"id": {"$in": matching_ids}}})

    sort_stage = {"$sort": {"finalScore": DESCENDING, "startDate": DESCENDING} if q.strip() else {"startDate": DESCENDING}}
    pipeline.append(sort_stage)
    pipeline.append({
        "$facet": {
            "results": [
                {"$skip": (page - 1) * per_page},
                {"$limit": per_page},
                *_org_lookup_pipeline(),
            ],
            "total": [{"$count": "count"}],
        }
    })

    cursor = projects_col.aggregate(pipeline, allowDiskUse=True)
    facet_result = await cursor.to_list(length=1)

    cursor = projects_col.aggregate(pipeline, allowDiskUse=True)
    facet_result = await cursor.to_list(length=1)
    if not facet_result:
        return [], 0

    raw_results = facet_result[0].get("results", [])
    total = facet_result[0].get("total", [{}])[0].get("count", 0)

    results = []
    for doc in raw_results:
        normalized = normalize_project(doc)
        coordinator, participants = _shape_orgs(doc.get("_orgs_raw", []))
        normalized["coordinator"] = coordinator
        normalized["organizations"] = participants
        normalized["extracted_keywords"] = extract_project_keywords(doc)[:10]

        if q and "finalScore" in doc:
            normalized["finalScore"] = round(doc["finalScore"], 2)

        if include_summary and doc.get("objective"):
            normalized["objective_summary"] = summarize_objective(doc["objective"])

        results.append(normalized)

    return results, total


async def get_project_by_id(
    projects_col: AsyncIOMotorCollection,
    project_id: str,
) -> dict | None:
    pipeline = [
        {"$match": {"id": project_id}},
        {"$limit": 1},
        *_org_lookup_pipeline(),
    ]
    docs = await projects_col.aggregate(pipeline).to_list(length=1)
    if not docs:
        return None

    doc = serialize_doc(docs[0])
    normalized = normalize_project(doc)
    coordinator, participants = _shape_orgs(doc.get("_orgs_raw", []))
    normalized["coordinator"] = coordinator
    normalized["organizations"] = participants
    normalized["extracted_keywords"] = extract_project_keywords(doc)

    objective = doc.get("objective")
    if objective:
        summary = summarize_objective(objective)
        normalized["objective_data"] = {
            "full_text": objective,
            "summary": summary,
            "has_summary": summary is not None,
            "original_length": len(objective),
            "summary_length": len(summary) if summary else 0,
            "compression_ratio": round(len(summary) / len(objective) * 100, 1) if summary else 0,
        }
    else:
        normalized["objective_data"] = {
            "full_text": None, "summary": None, "has_summary": False,
            "original_length": 0, "summary_length": 0, "compression_ratio": 0,
        }
    return normalized


async def get_project_summary(col: AsyncIOMotorCollection, project_id: str) -> dict | None:
    doc = await col.find_one({"id": project_id}, {"objective": 1})
    if not doc:
        return None
    objective = doc.get("objective")
    if not objective:
        return {"found": True, "has_objective": False}
    summary = summarize_objective(objective)
    return {
        "found": True,
        "has_objective": True,
        "project_id": project_id,
        "original_length": len(objective),
        "summary_length": len(summary) if summary else 0,
        "summary": summary,
        "success": summary is not None,
    }


async def get_trending_keywords(col: AsyncIOMotorCollection, limit: int = 50) -> list[dict]:
    pipeline = [
        {"$match": {"keywords": {"$exists": True, "$ne": None}}},
        {"$project": {"keywords": 1, "title": 1, "objective": 1}},
        {"$limit": 1000},
    ]
    docs = await col.aggregate(pipeline).to_list(length=1000)
    return compute_keyword_counts(docs, limit)


async def get_keyword_suggestions(col: AsyncIOMotorCollection, q: str, limit: int = 10) -> list[str]:
    if len(q) < 2:
        return []
    pipeline = [
        {"$match": {"$or": [
            {"keywords": {"$regex": re.escape(q), "$options": "i"}},
            {"title": {"$regex": re.escape(q), "$options": "i"}},
        ]}},
        {"$project": {"keywords": 1, "title": 1}},
        {"$limit": 100},
    ]
    docs = await col.aggregate(pipeline).to_list(length=100)
    suggestions: set[str] = set()
    for doc in docs:
        for kw in extract_project_keywords(doc):
            if q.lower() in kw.lower():
                suggestions.add(kw)
                if len(suggestions) >= limit:
                    return sorted(suggestions)
    return sorted(suggestions)


async def get_project_keywords(col: AsyncIOMotorCollection, project_id: str) -> list[str] | None:
    doc = await col.find_one({"id": project_id})
    if not doc:
        return None
    return extract_project_keywords(doc)


async def get_statistics_summary(
    projects_col: AsyncIOMotorCollection,
    orgs_col: AsyncIOMotorCollection,
) -> dict:
    pipeline = [
        {"$facet": {
            "total":        [{"$count": "n"}],
            "by_status":    [{"$group": {"_id": "$status", "count": {"$sum": 1}}}],
            "contribution": [{"$group": {"_id": None, "total": {"$sum": {
                "$convert": {"input": "$ecMaxContribution", "to": "double", "onError": 0, "onNull": 0}
            }}}}],
        }}
    ]
    result = await projects_col.aggregate(pipeline).to_list(length=1)
    facet = result[0] if result else {}

    total = facet.get("total", [{"n": 0}])[0].get("n", 0)
    status_counts = {
        row["_id"].lower(): row["count"]
        for row in facet.get("by_status", [])
        if row.get("_id")
    }
    total_contribution = (facet.get("contribution") or [{}])[0].get("total", 0)
    countries = await orgs_col.distinct("country")
    org_count = await orgs_col.estimated_document_count()

    return {
        "total_projects": total,
        "status_counts": status_counts,
        "total_contribution": total_contribution,
        "countries_involved": len([c for c in countries if c]),
        "organizations_count": org_count,
    }


async def get_projects_by_organization(
    projects_col: AsyncIOMotorCollection,
    orgs_col: AsyncIOMotorCollection,
    organization_id: str,
    page: int,
    per_page: int,
    role_filter: str,
) -> dict:
    org_query: dict = {"organisationID": organization_id}
    if role_filter == "coordinator":
        org_query["role"] = {"$regex": "^coordinator$", "$options": "i"}
    elif role_filter == "participant":
        org_query["role"] = {"$not": {"$regex": "^coordinator$", "$options": "i"}}

    participations = await orgs_col.find(org_query).sort("_id", DESCENDING).to_list(length=None)
    project_ids = [d["projectID"] for d in participations]
    if not project_ids:
        return {"projects": [], "total": 0, "page": page, "pages": 0,
                "per_page": per_page, "organization_id": organization_id, "role_filter": role_filter}

    total = len(project_ids)
    paginated_ids = project_ids[(page - 1) * per_page: page * per_page]

    pipeline = [
        {"$match": {"id": {"$in": paginated_ids}}},
        *_org_lookup_pipeline(),
    ]
    docs = await projects_col.aggregate(pipeline).to_list(length=per_page)
    doc_map = {d["id"]: d for d in docs}

    results = []
    for pid in paginated_ids:
        doc = doc_map.get(pid)
        if not doc:
            continue
        normalized = normalize_project(doc)
        coordinator, participants = _shape_orgs(doc.get("_orgs_raw", []))
        normalized["coordinator"] = coordinator
        normalized["organizations"] = participants

        # Role for this specific org
        org_role = next(
            (p["role"] for p in participations if p["projectID"] == pid),
            "participant"
        )
        normalized["organization_role"] = org_role
        results.append(normalized)

    return {
        "projects": results,
        "total": total,
        "page": page,
        "pages": -(-total // per_page),
        "per_page": per_page,
        "organization_id": organization_id,
        "role_filter": role_filter,
    }


async def get_org_project_summary(
    projects_col: AsyncIOMotorCollection,
    orgs_col: AsyncIOMotorCollection,
    organization_id: str,
) -> dict | None:
    participations = await orgs_col.find(
        {"organisationID": organization_id}, {"projectID": 1, "role": 1}
    ).to_list(length=None)
    if not participations:
        return None

    project_ids = [p["projectID"] for p in participations]
    coordinator_ids = [p["projectID"] for p in participations if p.get("role", "").lower() == "coordinator"]

    pipeline = [
        {"$match": {"id": {"$in": project_ids}}},
        {"$group": {
            "_id": None,
            "total_funding": {"$sum": {"$convert": {"input": "$ecMaxContribution", "to": "double", "onError": 0, "onNull": 0}}},
            "statuses": {"$push": "$status"},
        }},
    ]
    agg = await projects_col.aggregate(pipeline).to_list(length=1)
    stats = agg[0] if agg else {}

    return {
        "organization_id": organization_id,
        "total_projects": len(project_ids),
        "coordinator_count": len(coordinator_ids),
        "participant_count": len(project_ids) - len(coordinator_ids),
        "total_funding": stats.get("total_funding", 0),
        "status_breakdown": {s: (stats.get("statuses") or []).count(s) for s in set(stats.get("statuses") or [])},
    }


def _format_enriched_list(docs: list[dict]) -> list[dict]:
    results = []
    for doc in docs:
        doc = serialize_doc(doc)
        normalized = normalize_project(doc)
        coordinator, participants = _shape_orgs(doc.get("_orgs_raw", []))
        normalized["coordinator"] = coordinator
        normalized["organizations"] = participants
        results.append(normalized)
    return results

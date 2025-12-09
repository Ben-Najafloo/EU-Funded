# app/routes/organizations/routes.py

from flask import Blueprint, request, jsonify
from pymongo import DESCENDING

from ..projects.base import projects_collection, organizations_collection, db
from ..projects.utils import (
    normalize_project,
    serialize_doc,
    enrich_project_with_organizations
)

# Create the blueprint
organizations_bp = Blueprint("organizations", __name__)


# ============================================================================
# ORGANIZATION PROJECT ENDPOINTS
# ============================================================================

@organizations_bp.route("/<organization_id>/projects", methods=["GET"])
def get_projects_by_organization(organization_id):
    """Get all projects for a specific organization with optional role filter."""
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 10))
    skip = (page - 1) * per_page

    # Optional filter: "coordinator", "participant", or "all" (default)
    role_filter = request.args.get("role", "all").lower()

    # Find all project IDs this organization is involved in
    org_query = {"organisationID": organization_id}

    if role_filter == "coordinator":
        org_query["role"] = {"$regex": "^coordinator$", "$options": "i"}
    elif role_filter == "participant":
        org_query["role"] = {
            "$not": {"$regex": "^coordinator$", "$options": "i"}}

    # Get project IDs
    org_participations = organizations_collection.find(org_query)
    project_ids = [doc["projectID"] for doc in org_participations]

    if not project_ids:
        return jsonify({
            "projects": [],
            "total": 0,
            "page": page,
            "pages": 0,
            "per_page": per_page,
            "organization_id": organization_id,
            "role_filter": role_filter
        })

    # Count total projects
    total_count = len(project_ids)

    # Get paginated projects
    paginated_ids = project_ids[skip:skip + per_page]
    cursor = projects_collection.find(
        {"id": {"$in": paginated_ids}}).sort("startDate", DESCENDING)

    projects = []
    for doc in cursor:
        normalized = normalize_project(doc)
        enriched = enrich_project_with_organizations(normalized)

        # Add role information for this specific organization
        org_role = next(
            (org.get("role") for org in enriched.get("organizations", []) +
             ([enriched.get("coordinator")] if enriched.get("coordinator") else [])
             if org and org.get("organisationID") == organization_id),
            None
        )
        enriched["organization_role"] = org_role

        projects.append(enriched)

    return jsonify({
        "projects": projects,
        "total": total_count,
        "page": page,
        "pages": (total_count + per_page - 1) // per_page,
        "per_page": per_page,
        "organization_id": organization_id,
        "role_filter": role_filter
    })


@organizations_bp.route("/<organization_id>/summary", methods=["GET"])
def get_organization_project_summary(organization_id):
    """Get summary statistics for an organization's projects."""
    # Total projects
    total_projects = organizations_collection.count_documents({
        "organisationID": organization_id
    })

    # Coordinated projects
    coordinated_projects = organizations_collection.count_documents({
        "organisationID": organization_id,
        "role": {"$regex": "^coordinator$", "$options": "i"}
    })

    # Participated projects (non-coordinator)
    participated_projects = total_projects - coordinated_projects

    # Get organization details from one of the records
    org_sample = organizations_collection.find_one(
        {"organisationID": organization_id})

    org_info = {
        "organisationID": organization_id,
        "name": org_sample.get("name") if org_sample else None,
        "country": org_sample.get("country") if org_sample else None,
        "total_projects": total_projects,
        "coordinated_projects": coordinated_projects,
        "participated_projects": participated_projects
    }

    return jsonify(org_info)


# ============================================================================
# ORGANIZATION LIST ENDPOINTS
# ============================================================================

@organizations_bp.route("/", methods=["GET"])
def list_organizations():
    """List all unique organizations with their project counts."""
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    skip = (page - 1) * per_page

    # Aggregate to get unique organizations with counts
    pipeline = [
        {
            "$group": {
                "_id": "$organisationID",
                "name": {"$first": "$name"},
                "country": {"$first": "$country"},
                "total_projects": {"$sum": 1},
                "coordinated_projects": {
                    "$sum": {
                        "$cond": [
                            {"$regexMatch": {"input": "$role",
                                             "regex": "^coordinator$", "options": "i"}},
                            1,
                            0
                        ]
                    }
                }
            }
        },
        {
            "$project": {
                "organisationID": "$_id",
                "name": 1,
                "country": 1,
                "total_projects": 1,
                "coordinated_projects": 1,
                "participated_projects": {"$subtract": ["$total_projects", "$coordinated_projects"]},
                "_id": 0
            }
        },
        {"$sort": {"total_projects": -1}},
        {"$skip": skip},
        {"$limit": per_page}
    ]

    organizations = list(organizations_collection.aggregate(pipeline))

    # Get total count of unique organizations
    total_count = len(organizations_collection.distinct("organisationID"))

    return jsonify({
        "organizations": organizations,
        "total": total_count,
        "page": page,
        "pages": (total_count + per_page - 1) // per_page,
        "per_page": per_page
    })


@organizations_bp.route("/search", methods=["GET"])
def search_organizations():
    """Search organizations by name or ID."""
    query = request.args.get("q", "").strip()
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    skip = (page - 1) * per_page

    if not query:
        return list_organizations()

    # Search in organizations collection
    search_filter = {
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"organisationID": {"$regex": query, "$options": "i"}}
        ]
    }

    # Aggregate with search filter
    pipeline = [
        {"$match": search_filter},
        {
            "$group": {
                "_id": "$organisationID",
                "name": {"$first": "$name"},
                "country": {"$first": "$country"},
                "total_projects": {"$sum": 1},
                "coordinated_projects": {
                    "$sum": {
                        "$cond": [
                            {"$regexMatch": {"input": "$role",
                                             "regex": "^coordinator$", "options": "i"}},
                            1,
                            0
                        ]
                    }
                }
            }
        },
        {
            "$project": {
                "organisationID": "$_id",
                "name": 1,
                "country": 1,
                "total_projects": 1,
                "coordinated_projects": 1,
                "participated_projects": {"$subtract": ["$total_projects", "$coordinated_projects"]},
                "_id": 0
            }
        },
        {"$sort": {"total_projects": -1}},
        {"$skip": skip},
        {"$limit": per_page}
    ]

    organizations = list(organizations_collection.aggregate(pipeline))

    # Get total count with search filter
    count_pipeline = [
        {"$match": search_filter},
        {"$group": {"_id": "$organisationID"}},
        {"$count": "total"}
    ]
    count_result = list(organizations_collection.aggregate(count_pipeline))
    total_count = count_result[0]["total"] if count_result else 0

    return jsonify({
        "organizations": organizations,
        "total": total_count,
        "page": page,
        "pages": (total_count + per_page - 1) // per_page,
        "per_page": per_page,
        "query": query
    })

# """Get detailed information about a specific organization."""


@organizations_bp.route("/<organization_id>", methods=["GET"])
def get_organization(organization_id):

    # Get one complete organization document with all fields
    org_doc = organizations_collection.find_one(
        {"organisationID": organization_id})

    if not org_doc:
        return jsonify({"error": "Organization not found"}), 404

    # Serialize the document (convert ObjectId to string)
    org_data = serialize_doc(org_doc)

    # Get project statistics
    total_projects = organizations_collection.count_documents({
        "organisationID": organization_id
    })

    coordinated_projects = organizations_collection.count_documents({
        "organisationID": organization_id,
        "role": {"$regex": "^coordinator$", "$options": "i"}
    })

    participated_projects = total_projects - coordinated_projects

    # Calculate total funding
    pipeline = [
        {"$match": {"organisationID": organization_id}},
        {
            "$group": {
                "_id": None,
                "total_ec_contribution": {
                    "$sum": {
                        "$cond": {
                            "if": {
                                "$and": [
                                    {"$ne": ["$ecContribution", None]},
                                    {"$ne": ["$ecContribution", ""]},
                                    {"$ne": [
                                        {"$type": "$ecContribution"}, "missing"]}
                                ]
                            },
                            "then": {
                                "$convert": {
                                    "input": "$ecContribution",
                                    "to": "double",
                                    "onError": 0,
                                    "onNull": 0
                                }
                            },
                            "else": 0
                        }
                    }
                },
                "total_net_ec_contribution": {
                    "$sum": {
                        "$cond": {
                            "if": {
                                "$and": [
                                    {"$ne": ["$netEcContribution", None]},
                                    {"$ne": ["$netEcContribution", ""]},
                                    {"$ne": [
                                        {"$type": "$netEcContribution"}, "missing"]}
                                ]
                            },
                            "then": {
                                "$convert": {
                                    "input": "$netEcContribution",
                                    "to": "double",
                                    "onError": 0,
                                    "onNull": 0
                                }
                            },
                            "else": 0
                        }
                    }
                },
                "total_cost": {
                    "$sum": {
                        "$cond": {
                            "if": {
                                "$and": [
                                    {"$ne": ["$totalCost", None]},
                                    {"$ne": ["$totalCost", ""]},
                                    {"$ne": [{"$type": "$totalCost"}, "missing"]}
                                ]
                            },
                            "then": {
                                "$convert": {
                                    "input": "$totalCost",
                                    "to": "double",
                                    "onError": 0,
                                    "onNull": 0
                                }
                            },
                            "else": 0
                        }
                    }
                }
            }
        }
    ]

    funding_result = list(organizations_collection.aggregate(pipeline))
    funding_data = funding_result[0] if funding_result else {}

    # Get recent projects (last 5)
    org_participations = organizations_collection.find(
        {"organisationID": organization_id}
    ).sort("_id", DESCENDING)
    project_ids = [doc["projectID"] for doc in org_participations]

    recent_projects = []
    if project_ids:
        cursor = projects_collection.find(
            {"id": {"$in": project_ids}}
        ).sort("startDate", DESCENDING)

        for doc in cursor:
            normalized = normalize_project(doc)
            recent_projects.append(normalized)

    # Build complete response with all organization fields
    response = {
        # All organization fields
        "organisationID": org_data.get("organisationID"),
        "vatNumber": org_data.get("vatNumber"),
        "name": org_data.get("name"),
        "shortName": org_data.get("shortName"),
        "SME": org_data.get("SME"),
        "activityType": org_data.get("activityType"),
        "street": org_data.get("street"),
        "postCode": org_data.get("postCode"),
        "city": org_data.get("city"),
        "country": org_data.get("country"),
        "nutsCode": org_data.get("nutsCode"),
        "geolocation": org_data.get("geolocation"),
        "organizationURL": org_data.get("organizationURL"),
        "contactForm": org_data.get("contactForm"),
        "contentUpdateDate": org_data.get("contentUpdateDate"),
        "rcn": org_data.get("rcn"),
        "order": org_data.get("order"),
        "ecContribution": org_data.get("ecContribution"),
        "netEcContribution": org_data.get("netEcContribution"),
        "totalCost": org_data.get("totalCost"),


        # Statistics
        "statistics": {
            "total_projects": total_projects,
            "coordinated_projects": coordinated_projects,
            "participated_projects": participated_projects,
            "coordination_rate": round((coordinated_projects / total_projects * 100), 1) if total_projects > 0 else 0,
            "total_ec_contribution": round(funding_data.get("total_ec_contribution", 0), 2),
            "total_net_ec_contribution": round(funding_data.get("total_net_ec_contribution", 0), 2),
            "total_cost": round(funding_data.get("total_cost", 0), 2),
            "avg_funding_per_project": round(funding_data.get("total_ec_contribution", 0) / total_projects, 2) if total_projects > 0 else 0
        },

        # Recent projects
        "recent_projects": recent_projects
    }

    return jsonify(response)


# //////////////////////////////////////////////////////////////////////
# ============================================================================
# STATISTICS ENDPOINTS
# ============================================================================

@organizations_bp.route("/stats/top-by-projects", methods=["GET"])
def get_top_organizations_by_projects():
    """Get top 20 organizations by total number of projects."""
    limit = int(request.args.get("limit", 50))

    pipeline = [
        {
            "$group": {
                "_id": "$organisationID",
                "name": {"$first": "$name"},
                "country": {"$first": "$country"},
                "total_projects": {"$sum": 1},
                "coordinated_projects": {
                    "$sum": {
                        "$cond": [
                            {"$regexMatch": {"input": "$role",
                                             "regex": "^coordinator$", "options": "i"}},
                            1,
                            0
                        ]
                    }
                },
                # Sum up financial contributions with proper null/empty handling
                "total_ec_contribution": {
                    "$sum": {
                        "$cond": {
                            "if": {
                                "$and": [
                                    {"$ne": ["$ecContribution", None]},
                                    {"$ne": ["$ecContribution", ""]},
                                    {"$ne": [
                                        {"$type": "$ecContribution"}, "missing"]}
                                ]
                            },
                            "then": {
                                "$convert": {
                                    "input": "$ecContribution",
                                    "to": "double",
                                    "onError": 0,
                                    "onNull": 0
                                }
                            },
                            "else": 0
                        }
                    }
                },
                "total_net_ec_contribution": {
                    "$sum": {
                        "$cond": {
                            "if": {
                                "$and": [
                                    {"$ne": ["$netEcContribution", None]},
                                    {"$ne": ["$netEcContribution", ""]},
                                    {"$ne": [
                                        {"$type": "$netEcContribution"}, "missing"]}
                                ]
                            },
                            "then": {
                                "$convert": {
                                    "input": "$netEcContribution",
                                    "to": "double",
                                    "onError": 0,
                                    "onNull": 0
                                }
                            },
                            "else": 0
                        }
                    }
                }
            }
        },
        {
            "$project": {
                "organisationID": "$_id",
                "name": 1,
                "country": 1,
                "total_projects": 1,
                "coordinated_projects": 1,
                "participated_projects": {"$subtract": ["$total_projects", "$coordinated_projects"]},
                "total_ec_contribution": {"$round": ["$total_ec_contribution", 2]},
                "total_net_ec_contribution": {"$round": ["$total_net_ec_contribution", 2]},
                "coordination_rate": {
                    "$round": [
                        {
                            "$multiply": [
                                {"$divide": [
                                    "$coordinated_projects", "$total_projects"]},
                                100
                            ]
                        },
                        1
                    ]
                },
                "_id": 0
            }
        },
        {"$sort": {"total_projects": -1}},
        {"$limit": limit}
    ]

    organizations = list(organizations_collection.aggregate(pipeline))

    # Add ranking
    for idx, org in enumerate(organizations, 1):
        org["rank"] = idx

    return jsonify({
        "category": "top_by_projects",
        "title": "Top Organizations by Total Projects",
        "organizations": organizations,
        "total_returned": len(organizations)
    })


@organizations_bp.route("/stats/top-by-coordinated", methods=["GET"])
def get_top_organizations_by_coordinated():
    """Get top 20 organizations by number of coordinated projects."""
    limit = int(request.args.get("limit", 50))

    pipeline = [
        {
            "$group": {
                "_id": "$organisationID",
                "name": {"$first": "$name"},
                "country": {"$first": "$country"},
                "total_projects": {"$sum": 1},
                "coordinated_projects": {
                    "$sum": {
                        "$cond": [
                            {"$regexMatch": {"input": "$role",
                                             "regex": "^coordinator$", "options": "i"}},
                            1,
                            0
                        ]
                    }
                },
                "total_ec_contribution": {
                    "$sum": {
                        "$cond": {
                            "if": {
                                "$and": [
                                    {"$ne": ["$ecContribution", None]},
                                    {"$ne": ["$ecContribution", ""]},
                                    {"$ne": [
                                        {"$type": "$ecContribution"}, "missing"]}
                                ]
                            },
                            "then": {
                                "$convert": {
                                    "input": "$ecContribution",
                                    "to": "double",
                                    "onError": 0,
                                    "onNull": 0
                                }
                            },
                            "else": 0
                        }
                    }
                }
            }
        },
        {
            "$match": {
                "coordinated_projects": {"$gt": 0}
            }
        },
        {
            "$project": {
                "organisationID": "$_id",
                "name": 1,
                "country": 1,
                "total_projects": 1,
                "coordinated_projects": 1,
                "participated_projects": {"$subtract": ["$total_projects", "$coordinated_projects"]},
                "total_ec_contribution": {"$round": ["$total_ec_contribution", 2]},
                "coordination_rate": {
                    "$round": [
                        {
                            "$multiply": [
                                {"$divide": [
                                    "$coordinated_projects", "$total_projects"]},
                                100
                            ]
                        },
                        1
                    ]
                },
                "_id": 0
            }
        },
        {"$sort": {"coordinated_projects": -1}},
        {"$limit": limit}
    ]

    organizations = list(organizations_collection.aggregate(pipeline))

    # Add ranking
    for idx, org in enumerate(organizations, 1):
        org["rank"] = idx

    return jsonify({
        "category": "top_by_coordinated",
        "title": "Top Organizations by Coordinated Projects",
        "organizations": organizations,
        "total_returned": len(organizations)
    })


@organizations_bp.route("/stats/top-by-funding", methods=["GET"])
def get_top_organizations_by_funding():
    """Get top 20 organizations by EC contribution."""
    limit = int(request.args.get("limit", 50))
    funding_type = request.args.get("type", "ec_contribution")

    # Determine which field to sum and sort by
    if funding_type == "net_ec_contribution":
        sum_field = "$netEcContribution"
        title = "Top Organizations by Net EC Contribution"
    elif funding_type == "total_cost":
        sum_field = "$totalCost"
        title = "Top Organizations by Total Cost"
    else:
        sum_field = "$ecContribution"
        title = "Top Organizations by EC Contribution"

    pipeline = [
        {
            "$group": {
                "_id": "$organisationID",
                "name": {"$first": "$name"},
                "country": {"$first": "$country"},
                "total_projects": {"$sum": 1},
                "coordinated_projects": {
                    "$sum": {
                        "$cond": [
                            {"$regexMatch": {"input": "$role",
                                             "regex": "^coordinator$", "options": "i"}},
                            1,
                            0
                        ]
                    }
                },
                "total_funding": {
                    "$sum": {
                        "$cond": {
                            "if": {
                                "$and": [
                                    {"$ne": [sum_field, None]},
                                    {"$ne": [sum_field, ""]},
                                    {"$ne": [{"$type": sum_field}, "missing"]}
                                ]
                            },
                            "then": {
                                "$convert": {
                                    "input": sum_field,
                                    "to": "double",
                                    "onError": 0,
                                    "onNull": 0
                                }
                            },
                            "else": 0
                        }
                    }
                }
            }
        },
        {
            "$match": {
                "total_funding": {"$gt": 0}
            }
        },
        {
            "$project": {
                "organisationID": "$_id",
                "name": 1,
                "country": 1,
                "total_projects": 1,
                "coordinated_projects": 1,
                "participated_projects": {"$subtract": ["$total_projects", "$coordinated_projects"]},
                "total_funding": {"$round": ["$total_funding", 2]},
                "avg_funding_per_project": {
                    "$round": [
                        {"$divide": ["$total_funding", "$total_projects"]},
                        2
                    ]
                },
                "_id": 0
            }
        },
        {"$sort": {"total_funding": -1}},
        {"$limit": limit}
    ]

    organizations = list(organizations_collection.aggregate(pipeline))

    # Add ranking
    for idx, org in enumerate(organizations, 1):
        org["rank"] = idx

    return jsonify({
        "category": f"top_by_{funding_type}",
        "title": title,
        "funding_type": funding_type,
        "organizations": organizations,
        "total_returned": len(organizations)
    })


@organizations_bp.route("/stats/overview", methods=["GET"])
def get_organizations_overview():
    """Get overall statistics about organizations."""

    # Total unique organizations
    total_orgs = len(organizations_collection.distinct("organisationID"))

    # Total organizations that coordinated at least once
    total_coordinators = len(organizations_collection.distinct("organisationID", {
        "role": {"$regex": "^coordinator$", "$options": "i"}
    }))

    # Count organizations by country
    country_pipeline = [
        {
            "$group": {
                "_id": "$country",
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_countries = list(organizations_collection.aggregate(country_pipeline))

    # Count SMEs
    sme_count = organizations_collection.count_documents({"SME": "true"})

    return jsonify({
        "total_organizations": total_orgs,
        "total_coordinators": total_coordinators,
        "total_smes": sme_count,
        "coordinator_rate": round((total_coordinators / total_orgs * 100), 1) if total_orgs > 0 else 0,
        "top_countries": [
            {"country": item["_id"], "organization_count": item["count"]}
            for item in top_countries
        ]
    })

# app/routes/organizations/routes.py

from flask import request, jsonify
from flask import Blueprint, request, jsonify
from pymongo import DESCENDING

# scrapping
from urllib.parse import quote, quote_plus, urlparse, urljoin, parse_qs
import requests
from bs4 import BeautifulSoup
import re


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

    # Get ALL project IDs first, sorted by the organization participation date
    org_participations = list(organizations_collection.find(
        org_query).sort("_id", DESCENDING))
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

    # Get paginated project IDs FIRST, then fetch them
    paginated_ids = project_ids[skip:skip + per_page]

    # Fetch projects - but we need to maintain order
    projects_dict = {}
    cursor = projects_collection.find({"id": {"$in": paginated_ids}})

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
        projects_dict[enriched["id"]] = enriched

    # Maintain the order from paginated_ids
    projects = [projects_dict[pid]
                for pid in paginated_ids if pid in projects_dict]

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

    # Get recent projects (last 5) with role information
    org_participations = list(organizations_collection.find(
        {"organisationID": organization_id}
    ).sort("_id", DESCENDING))

    # Create a mapping of projectID to role and coordinator status
    project_roles = {}
    for participation in org_participations:
        project_id = participation.get("projectID")
        role = participation.get("role", "")
        is_coordinator = role.lower() == "coordinator" if role else False

        project_roles[project_id] = {
            "role": role,
            "is_coordinator": is_coordinator
        }

    project_ids = [doc["projectID"] for doc in org_participations]

    recent_projects = []
    if project_ids:
        cursor = projects_collection.find(
            {"id": {"$in": project_ids}}
        ).sort("startDate", DESCENDING)

        for doc in cursor:
            normalized = normalize_project(doc)
            project_id = normalized.get("id")

            # Add role information to the project
            if project_id in project_roles:
                normalized["organization_role"] = project_roles[project_id]["role"]
                normalized["is_coordinator"] = project_roles[project_id]["is_coordinator"]
            else:
                normalized["organization_role"] = None
                normalized["is_coordinator"] = False

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


# //////////////////////////////////////////////////////////////////////
# ============================================================================
# Scrapping version
# ============================================================================
@organizations_bp.route('/info', methods=['POST'])
def get_organization_info():
    """
    Unified endpoint to get comprehensive organization information.
    Accepts either 'name' or 'url' or both.
    If only name is provided, searches ROR to find website first.
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        org_name = data.get('name')
        org_url = data.get('url')

        if not org_name and not org_url:
            return jsonify({'error': 'Either organization name or URL is required'}), 400

        result = {}

        # Step 1: Get ROR data if we have a name
        if org_name:
            ror_data = search_ror_api(org_name)
            if ror_data:
                result.update(ror_data)
                # If we found a website in ROR and don't have one provided, use it
                if not org_url and ror_data.get('website'):
                    org_url = ror_data['website']

        # Step 2: If we have a URL (either provided or found from ROR), scrape it
        if org_url:
            scraped_data = scrape_website(org_url)
            if scraped_data:
                # Merge scraped data with ROR data (scraped takes precedence for duplicates)
                result = {**result, **scraped_data}

        # Step 3: Ensure we have at least some data
        if not result:
            return jsonify({
                'error': 'Could not find information for this organization',
                'organization_name': org_name
            }), 404

        # Add the original query parameters
        result['query_name'] = org_name
        result['query_url'] = org_url

        return jsonify({
            'success': True,
            'data': result
        }), 200

    except Exception as e:
        print(f"Error in get_organization_info: {e}")
        return jsonify({'error': str(e)}), 500


def search_ror_api(org_name):
    """
    Search ROR API v2 for organization information
    Returns comprehensive organization data including website
    """
    try:
        url = f"https://api.ror.org/v2/organizations?query={quote(org_name)}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        if not data.get('items') or len(data['items']) == 0:
            print(f"No ROR results found for: {org_name}")
            return None

        org = data['items'][0]  # Get best match

        # Extract website from domains
        website = None
        domains = org.get('domains', [])
        if domains:
            website = f"https://{domains[0]}" if not domains[0].startswith(
                'http') else domains[0]

        # Extract all links (including LinkedIn, Wikipedia, etc.)
        links = {}
        for link in org.get('links', []):
            if isinstance(link, dict):
                link_type = link.get('type', 'unknown')
                link_value = link.get('value', '')
            elif isinstance(link, str):
                link_value = link
                # Try to determine type from URL
                if 'linkedin.com' in link_value.lower():
                    link_type = 'linkedin'
                elif 'wikipedia.org' in link_value.lower():
                    link_type = 'wikipedia'
                elif 'twitter.com' in link_value.lower() or 'x.com' in link_value.lower():
                    link_type = 'twitter'
                else:
                    link_type = 'other'
            else:
                continue

            links[link_type] = link_value

        # Get organization types
        org_types = org.get('types', [])

        # Get location info
        location_info = {}
        locations = org.get('locations', [])
        if locations and len(locations) > 0:
            loc = locations[0]
            geonames = loc.get('geonames_details', {})
            location_info = {
                'city': geonames.get('name'),
                'country': geonames.get('country_name'),
                'country_code': geonames.get('country_code'),
            }

        # Get names (primary and aliases)
        names = org.get('names', [])
        primary_name = names[0].get('value') if names else org_name
        aliases = [n.get('value') for n in names[1:]] if len(names) > 1 else []

        return {
            'name': primary_name,
            'aliases': aliases,
            'website': website,
            'linkedin': links.get('linkedin'),
            'wikipedia': links.get('wikipedia'),
            'twitter': links.get('twitter'),
            'other_links': {k: v for k, v in links.items() if k not in ['linkedin', 'wikipedia', 'twitter']},
            'organization_types': org_types,
            'established': org.get('established'),
            'ror_id': org.get('id'),
            'location': location_info,
            'data_source': 'ROR API'
        }

    except requests.RequestException as e:
        print(f"ROR API request error: {e}")
        return None
    except Exception as e:
        print(f"ROR API parsing error: {e}")
        return None


def scrape_website(url):
    """
    Scrape organization website for additional information
    """
    try:
        # Add https:// if no scheme provided
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        # Fetch the webpage
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')

        # Extract information
        scraped_info = {
            'url': url,
            'title': extract_title(soup),
            'description': extract_description(soup),
            'emails': extract_emails(soup),
            'phones': extract_phone_numbers(soup),
            'address': extract_address(soup),
            'social_media': extract_social_media(soup),
            'about': extract_about_text(soup),
            'scraped': True
        }

        return scraped_info

    except requests.RequestException as e:
        print(f"Website scraping request error for {url}: {e}")
        return None
    except Exception as e:
        print(f"Website scraping parsing error for {url}: {e}")
        return None


# ============================================================================
# EXTRACTION HELPER FUNCTIONS
# ============================================================================

def extract_title(soup):
    """Extract organization name/title"""
    og_site_name = soup.find('meta', property='og:site_name')
    if og_site_name and og_site_name.get('content'):
        return og_site_name['content']

    if soup.title and soup.title.string:
        return soup.title.string.strip()

    h1 = soup.find('h1')
    if h1:
        return h1.get_text().strip()

    return None


def extract_description(soup):
    """Extract organization description"""
    meta_desc = soup.find('meta', attrs={'name': 'description'})
    if meta_desc and meta_desc.get('content'):
        return meta_desc['content'].strip()

    og_desc = soup.find('meta', property='og:description')
    if og_desc and og_desc.get('content'):
        return og_desc['content'].strip()

    return None


def extract_emails(soup):
    """Extract email addresses"""
    emails = set()
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'

    text = soup.get_text()
    found_emails = re.findall(email_pattern, text)
    emails.update(found_emails)

    mailto_links = soup.find_all('a', href=re.compile(r'^mailto:'))
    for link in mailto_links:
        email = link['href'].replace('mailto:', '').split('?')[0]
        emails.add(email)

    return list(emails)


def extract_phone_numbers(soup):
    """Extract phone numbers"""
    phones = set()
    phone_pattern = r'(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'

    text = soup.get_text()
    found_phones = re.findall(phone_pattern, text)
    phones.update([p.strip() for p in found_phones])

    tel_links = soup.find_all('a', href=re.compile(r'^tel:'))
    for link in tel_links:
        phone = link['href'].replace('tel:', '')
        phones.add(phone)

    return list(phones)


def extract_address(soup):
    """Extract physical address"""
    address_tag = soup.find('address')
    if address_tag:
        return address_tag.get_text(strip=True, separator=' ')

    schema_address = soup.find(attrs={'itemprop': 'address'})
    if schema_address:
        return schema_address.get_text(strip=True, separator=' ')

    return None


def extract_social_media(soup):
    """Extract social media links"""
    social_media = {}
    social_patterns = {
        'facebook': r'facebook\.com/[^/\s\?#]+',
        'twitter': r'(twitter\.com|x\.com)/[^/\s\?#]+',
        'linkedin': r'linkedin\.com/(company|school|in|edu|showcase)/[^/\s\?#]+',
        'instagram': r'instagram\.com/[^/\s\?#]+',
        'youtube': r'youtube\.com/(channel|c|user|@)[^/\s\?#]+'
    }

    links = soup.find_all('a', href=True)
    for link in links:
        href = link['href']
        href_lower = href.lower()

        for platform, pattern in social_patterns.items():
            if platform not in social_media and re.search(pattern, href_lower):
                clean_url = href.split('?')[0].split('#')[0]
                social_media[platform] = clean_url
                break

    return social_media


def extract_about_text(soup):
    """Extract about/description text from about page or section"""
    about_keywords = ['about', 'who we are', 'our story', 'company']

    for keyword in about_keywords:
        section = soup.find(['section', 'div'], class_=re.compile(keyword, re.I)) or \
            soup.find(['section', 'div'], id=re.compile(keyword, re.I))

        if section:
            paragraphs = section.find_all('p')
            if paragraphs:
                text = ' '.join([p.get_text(strip=True)
                                for p in paragraphs[:3]])
                if len(text) > 50:
                    return text[:500]

    return None

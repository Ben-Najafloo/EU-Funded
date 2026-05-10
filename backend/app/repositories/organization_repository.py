"""
Organization repository — all MongoDB queries and external API calls for organizations.
Web scraping is isolated here so routers can dispatch it as a BackgroundTask.
"""
import re
import logging
from urllib.parse import quote
import httpx
from bs4 import BeautifulSoup
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import DESCENDING

from app.utils.serializers import serialize_doc, normalize_project

logger = logging.getLogger(__name__)

# ── Shared aggregation fragment ──────────────────────────────────────────────

def _org_group_stage(sum_field: str | None = None) -> list[dict]:
    """Standard group stage for unique-org aggregations."""
    ec_sum = _safe_convert_sum("$ecContribution")
    net_sum = _safe_convert_sum("$netEcContribution")

    group: dict = {
        "_id": "$organisationID",
        "name": {"$first": "$name"},
        "country": {"$first": "$country"},
        "total_projects": {"$sum": 1},
        "coordinated_projects": {"$sum": {"$cond": [
            {"$regexMatch": {"input": "$role", "regex": "^coordinator$", "options": "i"}},
            1, 0
        ]}},
        "total_ec_contribution": ec_sum,
        "total_net_ec_contribution": net_sum,
    }
    if sum_field:
        group["total_funding"] = _safe_convert_sum(sum_field)

    return [{"$group": group}]


def _safe_convert_sum(field: str) -> dict:
    return {"$sum": {"$cond": {
        "if": {"$and": [
            {"$ne": [field, None]},
            {"$ne": [field, ""]},
            {"$ne": [{"$type": field}, "missing"]},
        ]},
        "then": {"$convert": {"input": field, "to": "double", "onError": 0, "onNull": 0}},
        "else": 0,
    }}}


def _project_org_fields(extra: dict | None = None) -> dict:
    base = {
        "organisationID": "$_id",
        "name": 1, "country": 1,
        "total_projects": 1,
        "coordinated_projects": 1,
        "participated_projects": {"$subtract": ["$total_projects", "$coordinated_projects"]},
        "total_ec_contribution": {"$round": ["$total_ec_contribution", 2]},
        "total_net_ec_contribution": {"$round": ["$total_net_ec_contribution", 2]},
        "coordination_rate": {"$round": [{"$multiply": [
            {"$divide": ["$coordinated_projects", "$total_projects"]}, 100
        ]}, 1]},
        "_id": 0,
    }
    if extra:
        base.update(extra)
    return base


# ── Queries ──────────────────────────────────────────────────────────────────

async def list_organizations(col: AsyncIOMotorCollection, page: int, per_page: int) -> dict:
    skip = (page - 1) * per_page
    pipeline = [
        *_org_group_stage(),
        {"$project": _project_org_fields({"sme": {"$first": "$SME"}})},
        {"$sort": {"total_projects": -1}},
        {"$facet": {
            "organizations": [{"$skip": skip}, {"$limit": per_page}],
            "total": [{"$count": "count"}],
        }},
    ]
    result = await col.aggregate(pipeline).to_list(length=1)
    facet = result[0] if result else {}
    organizations = facet.get("organizations", [])
    total = (facet.get("total") or [{"count": 0}])[0].get("count", 0)
    return {
        "organizations": organizations,
        "total": total,
        "page": page,
        "pages": -(-total // per_page),
        "per_page": per_page,
    }


async def search_organizations(
    col: AsyncIOMotorCollection, q: str, page: int, per_page: int
) -> dict:
    if not q:
        return await list_organizations(col, page, per_page)

    skip = (page - 1) * per_page
    search_filter = {"$or": [
        {"name": {"$regex": re.escape(q), "$options": "i"}},
        {"organisationID": {"$regex": re.escape(q), "$options": "i"}},
    ]}
    pipeline = [
        {"$match": search_filter},
        *_org_group_stage(),
        {"$project": _project_org_fields({"sme": {"$first": "$SME"}})},
        {"$sort": {"total_projects": -1}},
        {"$facet": {
            "organizations": [{"$skip": skip}, {"$limit": per_page}],
            "total": [{"$count": "count"}],
        }},
    ]
    result = await col.aggregate(pipeline).to_list(length=1)
    facet = result[0] if result else {}
    organizations = facet.get("organizations", [])
    total = (facet.get("total") or [{"count": 0}])[0].get("count", 0)
    return {
        "organizations": organizations,
        "total": total,
        "page": page,
        "pages": -(-total // per_page),
        "per_page": per_page,
        "query": q,
    }


async def get_organization(
    orgs_col: AsyncIOMotorCollection,
    projects_col: AsyncIOMotorCollection,
    organization_id: str,
) -> dict | None:
    org_doc = await orgs_col.find_one({"organisationID": organization_id})
    if not org_doc:
        return None

    org_data = serialize_doc(org_doc)

    # Funding + counts in one aggregation
    pipeline = [
        {"$match": {"organisationID": organization_id}},
        {"$group": {
            "_id": None,
            "total_projects": {"$sum": 1},
            "coordinated_projects": {"$sum": {"$cond": [
                {"$regexMatch": {"input": "$role", "regex": "^coordinator$", "options": "i"}}, 1, 0
            ]}},
            "total_ec_contribution": {"$sum": {"$convert": {"input": "$ecContribution", "to": "double", "onError": 0, "onNull": 0}}},
            "total_net_ec_contribution": {"$sum": {"$convert": {"input": "$netEcContribution", "to": "double", "onError": 0, "onNull": 0}}},
            "total_cost": {"$sum": {"$convert": {"input": "$totalCost", "to": "double", "onError": 0, "onNull": 0}}},
            "project_ids": {"$push": "$projectID"},
            "project_roles": {"$push": {"pid": "$projectID", "role": "$role"}},
        }},
    ]
    agg = await orgs_col.aggregate(pipeline).to_list(length=1)
    stats = agg[0] if agg else {}

    total_projects = stats.get("total_projects", 0)
    coordinated = stats.get("coordinated_projects", 0)
    project_ids = stats.get("project_ids", [])
    project_roles = {r["pid"]: r["role"] for r in stats.get("project_roles", [])}

    recent_docs = await projects_col.find(
        {"id": {"$in": project_ids}}
    ).sort("startDate", DESCENDING).to_list(length=None)

    recent_projects = []
    for doc in recent_docs:
        normalized = normalize_project(doc)
        pid = normalized.get("id")
        role = project_roles.get(pid, "")
        normalized["organization_role"] = role
        normalized["is_coordinator"] = role.lower() == "coordinator" if role else False
        recent_projects.append(normalized)

    return {
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
        "statistics": {
            "total_projects": total_projects,
            "coordinated_projects": coordinated,
            "participated_projects": total_projects - coordinated,
            "coordination_rate": round(coordinated / total_projects * 100, 1) if total_projects else 0,
            "total_ec_contribution": round(stats.get("total_ec_contribution", 0), 2),
            "total_net_ec_contribution": round(stats.get("total_net_ec_contribution", 0), 2),
            "total_cost": round(stats.get("total_cost", 0), 2),
            "avg_funding_per_project": round(stats.get("total_ec_contribution", 0) / total_projects, 2) if total_projects else 0,
        },
        "recent_projects": recent_projects,
    }


async def get_organization_summary(col: AsyncIOMotorCollection, organization_id: str) -> dict | None:
    pipeline = [
        {"$match": {"organisationID": organization_id}},
        {"$group": {
            "_id": None,
            "total_projects": {"$sum": 1},
            "coordinated_projects": {"$sum": {"$cond": [
                {"$regexMatch": {"input": "$role", "regex": "^coordinator$", "options": "i"}}, 1, 0
            ]}},
            "name": {"$first": "$name"},
            "country": {"$first": "$country"},
        }},
    ]
    agg = await col.aggregate(pipeline).to_list(length=1)
    if not agg:
        return None
    s = agg[0]
    return {
        "organisationID": organization_id,
        "name": s.get("name"),
        "country": s.get("country"),
        "total_projects": s["total_projects"],
        "coordinated_projects": s["coordinated_projects"],
        "participated_projects": s["total_projects"] - s["coordinated_projects"],
    }


async def get_top_by_projects(col: AsyncIOMotorCollection, limit: int = 50) -> dict:
    pipeline = [
        *_org_group_stage(),
        {"$project": _project_org_fields({"sme": {"$first": "$SME"}})},
        {"$sort": {"total_projects": -1}},
        {"$limit": limit},
    ]
    orgs = await col.aggregate(pipeline).to_list(length=limit)
    for i, o in enumerate(orgs, 1):
        o["rank"] = i
    return {"category": "top_by_projects", "title": "Top Organizations by Total Projects",
            "organizations": orgs, "total_returned": len(orgs)}


async def get_top_by_coordinated(col: AsyncIOMotorCollection, limit: int = 50) -> dict:
    pipeline = [
        *_org_group_stage(),
        {"$match": {"coordinated_projects": {"$gt": 0}}},
        {"$project": _project_org_fields({"sme": {"$first": "$SME"}})},
        {"$sort": {"coordinated_projects": -1}},
        {"$limit": limit},
    ]
    orgs = await col.aggregate(pipeline).to_list(length=limit)
    for i, o in enumerate(orgs, 1):
        o["rank"] = i
    return {"category": "top_by_coordinated", "title": "Top Organizations by Coordinated Projects",
            "organizations": orgs, "total_returned": len(orgs)}


async def get_top_by_funding(
    col: AsyncIOMotorCollection, limit: int = 50, funding_type: str = "ec_contribution"
) -> dict:
    field_map = {
        "net_ec_contribution": ("$netEcContribution", "Top Organizations by Net EC Contribution"),
        "total_cost": ("$totalCost", "Top Organizations by Total Cost"),
    }
    sum_field, title = field_map.get(funding_type, ("$ecContribution", "Top Organizations by EC Contribution"))

    pipeline = [
        *_org_group_stage(sum_field=sum_field),
        {"$match": {"total_funding": {"$gt": 0}}},
        {"$project": _project_org_fields({
            "total_funding": {"$round": ["$total_funding", 2]},
            "avg_funding_per_project": {"$round": [{"$divide": ["$total_funding", "$total_projects"]}, 2]},
        })},
        {"$sort": {"total_funding": -1}},
        {"$limit": limit},
    ]
    orgs = await col.aggregate(pipeline).to_list(length=limit)
    for i, o in enumerate(orgs, 1):
        o["rank"] = i
    return {"category": f"top_by_{funding_type}", "title": title,
            "funding_type": funding_type, "organizations": orgs, "total_returned": len(orgs)}


async def get_overview(col: AsyncIOMotorCollection) -> dict:
    pipeline = [
        {"$facet": {
            "all_orgs": [{"$group": {"_id": "$organisationID"}}, {"$count": "n"}],
            "coordinators": [
                {"$match": {"role": {"$regex": "^coordinator$", "$options": "i"}}},
                {"$group": {"_id": "$organisationID"}},
                {"$count": "n"},
            ],
            "smes": [{"$match": {"SME": "true"}}, {"$count": "n"}],
            "top_countries": [
                {"$group": {"_id": "$country", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10},
            ],
        }}
    ]
    result = await col.aggregate(pipeline).to_list(length=1)
    facet = result[0] if result else {}
    total_orgs = (facet.get("all_orgs") or [{"n": 0}])[0].get("n", 0)
    total_coordinators = (facet.get("coordinators") or [{"n": 0}])[0].get("n", 0)
    sme_count = (facet.get("smes") or [{"n": 0}])[0].get("n", 0)
    top_countries = [{"country": r["_id"], "organization_count": r["count"]}
                     for r in facet.get("top_countries", []) if r.get("_id")]
    return {
        "total_organizations": total_orgs,
        "total_coordinators": total_coordinators,
        "total_smes": sme_count,
        "coordinator_rate": round(total_coordinators / total_orgs * 100, 1) if total_orgs else 0,
        "top_countries": top_countries,
    }


# ── Web scraping (runs as BackgroundTask in routers) ─────────────────────────

async def fetch_org_info(name: str | None, url: str | None) -> dict:
    """
    Async version of the Flask scraping logic.
    Uses httpx instead of requests — non-blocking.
    """
    result: dict = {}

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        if name:
            ror = await _search_ror(client, name)
            if ror:
                result.update(ror)
                if not url and ror.get("website"):
                    url = ror["website"]

        if url:
            scraped = await _scrape_website(client, url)
            if scraped:
                result = {**result, **scraped}

    return result


async def _search_ror(client: httpx.AsyncClient, org_name: str) -> dict | None:
    try:
        resp = await client.get(f"https://api.ror.org/v2/organizations?query={quote(org_name)}")
        resp.raise_for_status()
        data = resp.json()
        items = data.get("items", [])
        if not items:
            return None
        org = items[0]
        domains = org.get("domains", [])
        website = f"https://{domains[0]}" if domains else None
        links: dict = {}
        for link in org.get("links", []):
            if isinstance(link, dict):
                ltype, lval = link.get("type", "other"), link.get("value", "")
            elif isinstance(link, str):
                lval = link
                if "linkedin.com" in lval:     ltype = "linkedin"
                elif "wikipedia.org" in lval:  ltype = "wikipedia"
                elif "twitter.com" in lval or "x.com" in lval: ltype = "twitter"
                else:                          ltype = "other"
            else:
                continue
            links[ltype] = lval
        names = org.get("names", [])
        locations = org.get("locations", [])
        loc_info: dict = {}
        if locations:
            geo = locations[0].get("geonames_details", {})
            loc_info = {"city": geo.get("name"), "country": geo.get("country_name"),
                        "country_code": geo.get("country_code")}
        return {
            "name": names[0].get("value") if names else org_name,
            "aliases": [n.get("value") for n in names[1:]],
            "website": website,
            "linkedin": links.get("linkedin"),
            "wikipedia": links.get("wikipedia"),
            "twitter": links.get("twitter"),
            "other_links": {k: v for k, v in links.items() if k not in ("linkedin", "wikipedia", "twitter")},
            "organization_types": org.get("types", []),
            "established": org.get("established"),
            "ror_id": org.get("id"),
            "location": loc_info,
            "data_source": "ROR API",
        }
    except Exception as e:
        logger.warning("ROR API error for '%s': %s", org_name, e)
        return None


async def _scrape_website(client: httpx.AsyncClient, url: str) -> dict | None:
    try:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        headers = {"User-Agent": "Mozilla/5.0 (compatible; CordisBot/1.0)"}
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.content, "html.parser")
        return {
            "url": url,
            "title": _extract_title(soup),
            "description": _extract_description(soup),
            "emails": _extract_emails(soup),
            "phones": _extract_phones(soup),
            "address": _extract_address(soup),
            "social_media": _extract_social(soup),
            "about": _extract_about(soup),
            "scraped": True,
        }
    except Exception as e:
        logger.warning("Scraping error for '%s': %s", url, e)
        return None


def _extract_title(soup):
    og = soup.find("meta", property="og:site_name")
    if og and og.get("content"): return og["content"]
    if soup.title and soup.title.string: return soup.title.string.strip()
    h1 = soup.find("h1")
    return h1.get_text().strip() if h1 else None


def _extract_description(soup):
    m = soup.find("meta", attrs={"name": "description"})
    if m and m.get("content"): return m["content"].strip()
    og = soup.find("meta", property="og:description")
    return og["content"].strip() if og and og.get("content") else None


def _extract_emails(soup):
    text = soup.get_text()
    emails = set(re.findall(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", text))
    for a in soup.find_all("a", href=re.compile(r"^mailto:")):
        emails.add(a["href"].replace("mailto:", "").split("?")[0])
    return list(emails)


def _extract_phones(soup):
    phones = set(re.findall(r"(?:\+?1[-.\ ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}", soup.get_text()))
    for a in soup.find_all("a", href=re.compile(r"^tel:")):
        phones.add(a["href"].replace("tel:", ""))
    return list(phones)


def _extract_address(soup):
    tag = soup.find("address") or soup.find(attrs={"itemprop": "address"})
    return tag.get_text(strip=True, separator=" ") if tag else None


def _extract_social(soup):
    patterns = {
        "facebook": r"facebook\.com/[^/\s\?#]+",
        "twitter": r"(?:twitter|x)\.com/[^/\s\?#]+",
        "linkedin": r"linkedin\.com/(?:company|school|in|edu|showcase)/[^/\s\?#]+",
        "instagram": r"instagram\.com/[^/\s\?#]+",
        "youtube": r"youtube\.com/(?:channel|c|user|@)[^/\s\?#]+",
    }
    social: dict = {}
    text = soup.get_text()
    for name, pattern in patterns.items():
        match = re.search(pattern, text)
        if match:
            social[name] = "https://" + match.group()
    return social


def _extract_about(soup):
    for selector in [{"id": "about"}, {"class_": "about"}, {"id": "mission"}]:
        el = soup.find(attrs=selector)
        if el:
            text = el.get_text(strip=True, separator=" ")
            if len(text) > 50:
                return text[:500]
    return None

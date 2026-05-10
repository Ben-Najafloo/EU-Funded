from fastapi import APIRouter, HTTPException, Query
from app.core.dependencies import ProjectsCol, OrgsCol
from app.repositories import project_repository as repo

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("/")
async def list_projects(
    projects: ProjectsCol,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    results, total = await repo.list_projects(projects, page, limit)
    return {"page": page, "limit": limit, "total": total, "results": results}


@router.get("/recent")
async def get_recent_projects(projects: ProjectsCol, orgs: OrgsCol):
    return await repo.get_recent_projects(projects, orgs)


@router.get("/closed")
async def get_closed_projects(projects: ProjectsCol, orgs: OrgsCol):
    return await repo.get_closed_projects(projects, orgs)


@router.get("/expiring_soon")
async def get_expiring_soon_projects(projects: ProjectsCol):
    return await repo.get_expiring_soon_projects(projects)


@router.get("/all_topics")
async def get_all_topics(projects: ProjectsCol):
    return await repo.get_all_topics(projects)


@router.get("/all_topics/search")
async def search_topics(projects: ProjectsCol, q: str = Query("")):
    return await repo.search_topics(projects, q)


@router.get("/search")
async def search_projects(
    projects: ProjectsCol,
    q: str = Query(""),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    project_id: str | None = None,
    keywords: str | None = None,
    status: str | None = None,
    acronym: str | None = None,
    title: str | None = None,
    programme: str | None = None,
    topics: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    min_contribution: float | None = None,
    max_contribution: float | None = None,
    min_total_cost: float | None = None,
    max_total_cost: float | None = None,
    countries: str | None = None,
    include_summary: bool = False,
):
    import re
    filters: dict = {}
    if project_id:
        filters["id"] = {"$regex": re.escape(project_id), "$options": "i"}
    if keywords:
        kws = [k.strip() for k in keywords.split(",") if k.strip()]
        if kws:
            filters["$or"] = [{"keywords": {"$regex": rf"\b{re.escape(k)}\b", "$options": "i"}} for k in kws]
    if status:
        filters["status"] = status
    if acronym:
        filters["acronym"] = {"$regex": rf"^{re.escape(acronym)}$", "$options": "i"}
    if title:
        filters["title"] = {"$regex": re.escape(title), "$options": "i"}
    if programme:
        filters["frameworkProgramme"] = programme
    if topics:
        filters["topics"] = topics
    if start_date:
        filters["startDate"] = {"$gte": start_date}
    if end_date:
        filters.setdefault("endDate", {})
        filters["endDate"]["$lte"] = end_date
    if min_contribution is not None and max_contribution is not None and (min_contribution > 0 or max_contribution < 1000000000):
        filters["ecMaxContribution"] = {"$gte": min_contribution, "$lte": max_contribution}
    if min_total_cost is not None and max_total_cost is not None and (min_total_cost > 0 or max_total_cost < 1000000000):
        filters["totalCost"] = {"$gte": min_total_cost, "$lte": max_total_cost}

    country_set = {c.strip() for c in countries.split(",") if c.strip()} if countries else None

    results, total = await repo.search_projects(
        projects, q, page, per_page, filters, country_set, include_summary
    )
    return {
        "projects": results,
        "total": total,
        "page": page,
        "pages": -(-total // per_page),
        "per_page": per_page,
    }


@router.get("/keywords/trending")
async def get_trending_keywords(projects: ProjectsCol, limit: int = Query(50, ge=1, le=100)):
    keywords = await repo.get_trending_keywords(projects, limit)
    return {"keywords": keywords, "total": len(keywords)}


@router.get("/keywords/suggestions")
async def get_keyword_suggestions(
    projects: ProjectsCol,
    q: str = Query(""),
    limit: int = Query(10, ge=1, le=20),
):
    suggestions = await repo.get_keyword_suggestions(projects, q, limit)
    return {"suggestions": suggestions, "query": q}


@router.get("/statistics/summary")
async def get_statistics_summary(projects: ProjectsCol, orgs: OrgsCol):
    return await repo.get_statistics_summary(projects, orgs)


@router.get("/by_organization/{organization_id}")
async def get_projects_by_organization(
    organization_id: str,
    projects: ProjectsCol,
    orgs: OrgsCol,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    role: str = Query("all"),
):
    return await repo.get_projects_by_organization(
        projects, orgs, organization_id, page, per_page, role.lower()
    )


@router.get("/organization/{organization_id}/summary")
async def get_org_project_summary(
    organization_id: str,
    projects: ProjectsCol,
    orgs: OrgsCol,
):
    result = await repo.get_org_project_summary(projects, orgs, organization_id)
    if not result:
        raise HTTPException(status_code=404, detail="Organization not found")
    return result


@router.get("/{project_id}/summary")
async def get_project_summary(project_id: str, projects: ProjectsCol):
    result = await repo.get_project_summary(projects, project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    if not result.get("has_objective"):
        raise HTTPException(status_code=404, detail="No objective available")
    return result


@router.get("/{project_id}/keywords")
async def get_project_keywords(project_id: str, projects: ProjectsCol):
    keywords = await repo.get_project_keywords(projects, project_id)
    if keywords is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"project_id": project_id, "keywords": keywords, "total": len(keywords)}


@router.get("/{project_id}")
async def get_project(project_id: str, projects: ProjectsCol):
    result = await repo.get_project_by_id(projects, project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return result

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from app.core.dependencies import OrgsCol, ProjectsCol
from app.repositories import organization_repository as repo

router = APIRouter(prefix="/api/organizations", tags=["organizations"])

# Shared scraping result store — BackgroundTask writes here, client polls or gets immediate
# For simplicity we keep the same sync-response contract as Flask:
# the router awaits fetch_org_info directly (it's async now via httpx).


class OrgInfoRequest(BaseModel):
    name: str | None = None
    url: str | None = None


@router.get("/stats/top-by-projects")
async def top_by_projects(orgs: OrgsCol, limit: int = Query(50, ge=1, le=200)):
    return await repo.get_top_by_projects(orgs, limit)


@router.get("/stats/top-by-coordinated")
async def top_by_coordinated(orgs: OrgsCol, limit: int = Query(50, ge=1, le=200)):
    return await repo.get_top_by_coordinated(orgs, limit)


@router.get("/stats/top-by-funding")
async def top_by_funding(
    orgs: OrgsCol,
    limit: int = Query(50, ge=1, le=200),
    type: str = Query("ec_contribution"),
):
    return await repo.get_top_by_funding(orgs, limit, type)


@router.get("/stats/overview")
async def get_overview(orgs: OrgsCol):
    return await repo.get_overview(orgs)


@router.get("/search")
async def search_organizations(
    orgs: OrgsCol,
    q: str = Query(""),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    return await repo.search_organizations(orgs, q, page, per_page)


@router.get("/")
async def list_organizations(
    orgs: OrgsCol,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    return await repo.list_organizations(orgs, page, per_page)


@router.get("/{organization_id}/projects")
async def get_projects_by_organization(
    organization_id: str,
    orgs: OrgsCol,
    projects: ProjectsCol,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    role: str = Query("all"),
):
    from app.repositories.project_repository import get_projects_by_organization
    return await get_projects_by_organization(projects, orgs, organization_id, page, per_page, role.lower())


@router.get("/{organization_id}/summary")
async def get_organization_summary(organization_id: str, orgs: OrgsCol):
    result = await repo.get_organization_summary(orgs, organization_id)
    if not result:
        raise HTTPException(status_code=404, detail="Organization not found")
    return result


@router.get("/{organization_id}")
async def get_organization(organization_id: str, orgs: OrgsCol, projects: ProjectsCol):
    result = await repo.get_organization(orgs, projects, organization_id)
    if not result:
        raise HTTPException(status_code=404, detail="Organization not found")
    return result


@router.post("/info")
async def get_organization_info(body: OrgInfoRequest):
    """
    Fetch organization info from ROR API + website scraping.
    Runs async via httpx — non-blocking unlike the Flask version.
    """
    if not body.name and not body.url:
        raise HTTPException(status_code=400, detail="Either organization name or URL is required")

    result = await repo.fetch_org_info(body.name, body.url)

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Could not find information for organization: {body.name}",
        )

    result["query_name"] = body.name
    result["query_url"] = body.url
    return {"success": True, "data": result}

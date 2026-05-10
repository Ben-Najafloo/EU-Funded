from fastapi import APIRouter
from app.core.dependencies import ProjectsCol, OrgsCol
import app.database as db_module

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/health")
async def health_check(projects: ProjectsCol, orgs: OrgsCol):
    try:
        projects_count = await projects.estimated_document_count()
        orgs_count = await orgs.estimated_document_count()
        return {"status": "healthy", "projects_count": projects_count, "organizations_count": orgs_count}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/projects_by_country")
async def projects_by_country(orgs: OrgsCol):
    pipeline = [
        {"$group": {"_id": "$country", "project_count": {"$addToSet": "$projectID"}}},
        {"$project": {"country": "$_id", "project_count": {"$size": "$project_count"}, "_id": 0}},
        {"$sort": {"project_count": -1}},
        {"$limit": 10},
    ]
    return await orgs.aggregate(pipeline).to_list(length=10)


@router.get("/projects_per_programme")
async def projects_per_programme(projects: ProjectsCol):
    pipeline = [
        {"$match": {"masterCall": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$masterCall", "project_count": {"$sum": 1}}},
        {"$project": {"programme": "$_id", "project_count": 1, "_id": 0}},
        {"$sort": {"project_count": -1}},
    ]
    return await projects.aggregate(pipeline).to_list(length=None)


@router.get("/eu_contribution_per_country")
async def eu_contribution_per_country(orgs: OrgsCol):
    pipeline = [
        {"$match": {"country": {"$exists": True, "$ne": None},
                    "ecContribution": {"$exists": True, "$ne": None, "$ne": ""}}},
        {"$addFields": {"cleaned": {"$replaceOne": {"input": "$ecContribution", "find": ",", "replacement": "."}}}},
        {"$addFields": {"numeric": {"$convert": {"input": "$cleaned", "to": "double", "onError": 0.0, "onNull": 0.0}}}},
        {"$group": {"_id": "$country", "total_contribution": {"$sum": "$numeric"}}},
        {"$project": {"country": "$_id", "total_eu_contribution": "$total_contribution", "_id": 0}},
        {"$sort": {"total_eu_contribution": -1}},
        {"$limit": 12},
    ]
    return await orgs.aggregate(pipeline, allowDiskUse=True).to_list(length=12)


@router.get("/projects_over_time")
async def projects_over_time(projects: ProjectsCol):
    pipeline = [
        {"$match": {"startDate": {"$exists": True, "$ne": None}}},
        {"$addFields": {"year": {"$substr": ["$startDate", 0, 4]}}},
        {"$group": {"_id": "$year", "project_count": {"$sum": 1}}},
        {"$project": {"year": "$_id", "project_count": 1, "_id": 0}},
        {"$sort": {"year": 1}},
    ]
    return await projects.aggregate(pipeline).to_list(length=None)


@router.get("/top_organizations")
async def top_organizations(orgs: OrgsCol, limit: int = 10):
    pipeline = [
        {"$match": {"name": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$name", "project_count": {"$sum": 1}}},
        {"$project": {"organization": "$_id", "project_count": 1, "_id": 0}},
        {"$sort": {"project_count": -1}},
        {"$limit": limit},
    ]
    return await orgs.aggregate(pipeline, allowDiskUse=True).to_list(length=limit)


@router.get("/top_projects_by_eu_contribution")
async def top_projects_by_eu_contribution(projects: ProjectsCol):
    pipeline = [
        {"$project": {"acronym": 1, "ecMaxContribution": {"$toDouble": "$ecMaxContribution"}, "title": 1}},
        {"$sort": {"ecMaxContribution": -1}},
        {"$limit": 15},
        {"$project": {
            "acronym": {"$ifNull": ["$acronym", "N/A"]},
            "project_topic": {"$ifNull": ["$title", "N/A"]},
            "eu_contribution": {"$ifNull": ["$ecMaxContribution", 0]},
            "_id": 0,
        }},
    ]
    return await projects.aggregate(pipeline).to_list(length=15)

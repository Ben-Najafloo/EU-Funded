import io
import csv
import zipfile
import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException
import httpx
from app.database import get_projects_collection, get_organizations_collection, create_indexes

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)

CORDIS_ZIP_URL = "https://cordis.europa.eu/data/cordis-HORIZONprojects-csv.zip"
BATCH_SIZE = 1000

# Track sync status so callers can see progress
_sync_status: dict = {"running": False, "last_result": None}


def _clean_document(doc: dict) -> dict:
    cleaned = {}
    for k, v in doc.items():
        if k is None:
            continue
        key = k.strip()
        value = v.strip() if isinstance(v, str) else v
        if key in ("ecMaxContribution", "totalCost") and isinstance(value, str):
            try:
                cleaned[key] = float(value.replace(",", "."))
            except ValueError:
                cleaned[key] = 0.0
        else:
            cleaned[key] = value
    return cleaned


async def _run_sync() -> dict:
    """
    Async CORDIS sync — uses httpx for the download, runs in a BackgroundTask.
    Recreates indexes after data load so the text search stays consistent.
    """
    global _sync_status
    _sync_status["running"] = True
    logger.info("CORDIS sync started")

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            logger.info("Downloading CORDIS zip...")
            resp = await client.get(CORDIS_ZIP_URL)
            resp.raise_for_status()
            zip_bytes = io.BytesIO(resp.content)

        def _read_csv(prefix: str) -> list[dict]:
            docs = []
            with zipfile.ZipFile(zip_bytes) as z:
                csv_name = next(
                    (n for n in z.namelist() if n.lower().startswith(prefix)), None
                )
                if not csv_name:
                    logger.warning("No %s CSV found in zip", prefix)
                    return docs
                with z.open(csv_name) as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8"), delimiter=";")
                    for row in reader:
                        docs.append(row)
            return docs

        projects_data = _read_csv("project")
        orgs_data = _read_csv("organization")
        logger.info("Extracted %d projects, %d orgs", len(projects_data), len(orgs_data))

        projects_col = get_projects_collection()
        orgs_col = get_organizations_collection()

        await projects_col.drop()
        await orgs_col.drop()

        # Batch insert
        async def _insert(col, docs):
            batch = []
            for doc in docs:
                batch.append(_clean_document(doc))
                if len(batch) >= BATCH_SIZE:
                    await col.insert_many(batch)
                    batch.clear()
            if batch:
                await col.insert_many(batch)

        await _insert(projects_col, projects_data)
        await _insert(orgs_col, orgs_data)

        # Recreate all indexes after data reload
        await create_indexes()
        logger.info("CORDIS sync complete")

        result = {
            "status": "success",
            "projects_inserted": len(projects_data),
            "organizations_inserted": len(orgs_data),
        }
        _sync_status["last_result"] = result
        return result

    except Exception as e:
        logger.exception("CORDIS sync failed: %s", e)
        _sync_status["last_result"] = {"status": "error", "message": str(e)}
        raise
    finally:
        _sync_status["running"] = False


@router.post("/sync-data")
async def sync_data(background_tasks: BackgroundTasks):
    """
    Trigger a CORDIS data sync.
    Runs as a BackgroundTask — responds immediately, sync continues in background.
    Poll /admin/sync-status to check progress.
    """
    if _sync_status["running"]:
        raise HTTPException(status_code=409, detail="Sync already in progress")

    background_tasks.add_task(_run_sync)
    return {
        "status": "success",
        "message": "CORDIS sync started in background",
    }


@router.get("/sync-status")
async def sync_status():
    """Check the current sync status."""
    return {
        "running": _sync_status["running"],
        "last_result": _sync_status["last_result"],
    }

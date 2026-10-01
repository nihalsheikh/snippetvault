from fastapi import APIRouter, status

from schemas.health_schema import HealthStatus
from utils.health_status import get_server_uptime, get_db_status

router = APIRouter(prefix="/api", tags=["Health"])


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    response_model=HealthStatus,
    summary="Health Check API",
    description="API Endpoint to check the health of snippetvault backend",
)
def health():
    return {
        "status": "OK",
        "message": "API is healthy",
        "db_status": get_db_status(),
        "server_uptime": get_server_uptime(),
    }

from pydantic import BaseModel


# Health API Response
class HealthStatus(BaseModel):
    status: str
    message: str
    db_status: str
    server_uptime: int

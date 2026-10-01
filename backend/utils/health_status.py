from datetime import datetime, timezone
from sqlalchemy import text

from database.db import engine

start_time = datetime.now(timezone.utc)


def get_server_uptime():
    uptime = datetime.now(timezone.utc) - start_time
    return int(uptime.total_seconds())


def get_db_status():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "Connected"
    except Exception:
        return "Disconnected"

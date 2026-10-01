from database.db import session_local


# Connect DB
def get_db():
    db = session_local()
    try:
        yield db
    finally:
        db.close()

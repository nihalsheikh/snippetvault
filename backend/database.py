from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


# Database URL (creates a local file called snippetvault.db)
SQLALCHEMY_DATABASE_URL = "sqlite:///./snippetvault.db"

# Connect to Database
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

# OOP part: all Database models will inherit from this Base class
Base = declarative_base()

# Create a new Database session for each request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Start DB session for each request and close it after completion
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# tell SQLAlchemy to create the table in .db file
Base.metadata.create_all(bind=engine)

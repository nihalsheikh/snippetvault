from sqlalchemy import create_engine, Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime


# Database URL (creates a local file called snippetvault.db)
SQLALCHEMY_DATABASE_URL = "sqlite:///./snippetvault.db"

# Connect to Database
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

# Create a new Database session for each request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# OOP part: all Database models will inherit from this Base class
Base = declarative_base()

# Start DB session for each request and close it after completion
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Schema
### User Schema
class User(Base):
    # table name in db
    __tablename__ = "users"

    # User table attributes
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_public = Column(Boolean, default=True)

    # link user to snippet
    snippets = relationship("Snippet", back_populates="owner")


### Snippet Schema
class Snippet(Base):
    # table name in db
    __tablename__ = "snippets"

    # Defining Columns for snippets table
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    code = Column(Text)
    language = Column(String)
    tags = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_public = Column(Boolean, default=False)

    # connecting a snippet to a user using ForeignKey
    user_id = Column(Integer, ForeignKey("users.id"))

    # linking snippet to a owner
    owner = relationship("User", back_populates="snippets")


# tell SQLAlchemy to create the table in .db file
Base.metadata.create_all(bind=engine)

from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


# User Schema
class User(Base):
    # table name in db
    __tablename__ = "users"

    # User table attributes
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_public = Column(Boolean, default=True)

    # link user to snippet
    snippets = relationship("Snippet", back_populates="owner", cascade="all, delete")


### Snippet Schema
class Snippet(Base):
    # table name in db
    __tablename__ = "snippets"

    # Defining Columns for snippets table
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    code = Column(Text, nullable=False)
    language = Column(String, nullable=False)
    tags = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_public = Column(Boolean, default=True)

    # connecting a snippet to a user using ForeignKey
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # linking snippet to a owner
    owner = relationship("User", back_populates="snippets")

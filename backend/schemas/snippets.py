from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# Snippet Model Request Body
class SnippetCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    code: str = Field(min_length=1)
    language: str = Field(min_length=1, max_length=50)
    tags: Optional[str] = None
    is_public: bool = True


# Snippet Response
class SnippetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    code: str
    language: str
    tags: Optional[str] = None
    created_at: datetime
    is_public: bool
    user_id: int


# Response Wrapper for a list of Snippets
class SnippetListResponse(BaseModel):
    user_snippets: List[SnippetResponse]


# Single Snippet Response
class SingleSnippetResponse(BaseModel):
    snippet: SnippetResponse


# All Snippet Response
class AllSnippetResponse(BaseModel):
    all_snippets: List[SnippetResponse]


# Created Snippet Response
class CreatedSnippetResponse(BaseModel):
    message: str
    snippet: SnippetResponse


# Update Snippet Response
class UpdateSnippetResponse(BaseModel):
    message: str
    snippet: SnippetResponse


# Partial Snippet Update
class SnippetPartialUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = None
    code: Optional[str] = None
    language: Optional[str] = None
    tags: Optional[str] = None
    is_public: Optional[bool] = None

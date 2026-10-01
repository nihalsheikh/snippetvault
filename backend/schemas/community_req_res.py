from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime

from schemas.snippet_req_res import SnippetDetails


# Community Details
class CommunityUserDetails(BaseModel):
    id: UUID
    username: str | None = None
    bio: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# All community users res
class AllCommunityUsersResponse(BaseModel):
    message: str
    users: list[CommunityUserDetails]
    page: int
    limit: int
    total: int
    has_next: bool

    model_config = ConfigDict(from_attributes=True)


# Community user res
class CommunityUserResponse(BaseModel):
    message: str
    user: CommunityUserDetails

    model_config = ConfigDict(from_attributes=True)


# Community users public snippet res
class CommunityUserSnippetsResponse(BaseModel):
    message: str
    snippets: list[SnippetDetails]
    page: int
    limit: int
    total: int
    has_next: bool

    model_config = ConfigDict(from_attributes=True)

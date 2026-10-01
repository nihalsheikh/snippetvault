from pydantic import BaseModel, Field


# Explain a snippet
class ExplainRequest(BaseModel):
    code: str = Field(..., min_length=1)
    language: str | None = None
    title: str | None = None


class ExplainResponse(BaseModel):
    message: str
    explanation: str


# Suggest a title
class GenerateTitleRequest(BaseModel):
    code: str = Field(..., min_length=1)
    language: str | None = None


class GenerateTitleResponse(BaseModel):
    message: str
    title: str

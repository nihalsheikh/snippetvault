from fastapi import APIRouter, Depends, HTTPException, Request, status

from middleware.rate_limit import limiter
from schemas.ai_req_res import (
    ExplainRequest,
    ExplainResponse,
    GenerateTitleRequest,
    GenerateTitleResponse,
)
from auth.token import get_current_user_id
from services.ai_service import AIServiceError, explain_snippet, generate_title

router = APIRouter(prefix="/api", tags=["AI"])


# Explain a code snippet with AI
@limiter.limit("10/minute")
@router.post(
    "/ai/explain",
    status_code=status.HTTP_200_OK,
    response_model=ExplainResponse,
    summary="Explain a snippet with AI",
    description="Generate a plain-prose explanation of the supplied code using Gemini.",
)
def ai_explain(
    request: Request,
    explain_data: ExplainRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        explanation = explain_snippet(
            code=explain_data.code,
            language=explain_data.language or "",
            title=explain_data.title,
        )
    except AIServiceError as exc:
        # `public_message`, never `str(exc)`: the provider's wording names the model
        # and host, and this response goes straight to the browser.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=exc.public_message,
        ) from exc

    return {"message": "Snippet explained successfully", "explanation": explanation}


# Suggest a title for an untitled snippet
@limiter.limit("10/minute")
@router.post(
    "/ai/generate-title",
    status_code=status.HTTP_200_OK,
    response_model=GenerateTitleResponse,
    summary="Generate a snippet title",
    description="Suggest a short descriptive title for the supplied code using Gemini.",
)
def ai_generate_title(
    request: Request,
    title_data: GenerateTitleRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        title = generate_title(code=title_data.code, language=title_data.language or "")
    except AIServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=exc.public_message,
        ) from exc

    return {"message": "Title generated successfully", "title": title}

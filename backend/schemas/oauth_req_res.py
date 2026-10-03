from pydantic import BaseModel


# Which providers this server can actually sign in with
class OAuthProvidersResponse(BaseModel):
    message: str
    providers: list[str]

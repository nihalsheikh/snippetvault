from pydantic import BaseModel


# Auth Token
class Token(BaseModel):
    access_token: str
    token_type: str

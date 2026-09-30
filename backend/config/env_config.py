from dotenv import load_dotenv
import os

load_dotenv()

if os.getenv("DATABASE_URL") is None:
    raise RuntimeError("ERROR: DATABASE_URL not set in Environment Variables")

if os.getenv("SECRET_KEY") is None:
    raise RuntimeError("SECRET_KEY not set")

if os.getenv("GOOGLE_GEMINI_API_KEY") is None:
    raise RuntimeError("AI_API_KEY not set")

if os.getenv("GOOGLE_GEMINI_MODEL") is None:
    raise RuntimeError("AI_MODEL not set")


class EnvSettings:
    db_url = os.getenv("DATABASE_URL")
    frontend_url = os.getenv("FRONTEND_URL")
    secret_key = os.getenv("SECRET_KEY")
    algorithm = os.getenv("ALGORITHM", "HS256")
    access_token_expire_days = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS"))
    refresh_token_expire_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"))
    google_gemini_api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
    google_gemini_model = os.getenv("GOOGLE_GEMINI_MODEL")


env_settings = EnvSettings()

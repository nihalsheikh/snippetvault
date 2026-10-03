from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from config.env_config import env_settings

db_url = env_settings.db_url

# SQLAlchemy hands the URL straight to the driver, and psycopg (v3) only recognises
# the `postgresql://` and `postgresql+psycopg://` schemes. Every Postgres host
# advertises the shorter `postgres://` alias — Render's dashboard, Neon, and
# Supabase all hand it out that way — so a URL that reads perfectly well in a
# dashboard fails here with an unhelpful "invalid dsn". Rewriting the prefix is
# cheaper than documenting which of the two forms to paste.
if db_url.startswith("postgres://"):
    db_url = "postgresql://" + db_url[len("postgres://") :]

engine = create_engine(db_url, pool_pre_ping=True)

session_local = sessionmaker(bind=engine)

Base = declarative_base()

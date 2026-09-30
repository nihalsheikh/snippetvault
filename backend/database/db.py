from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from config.env_config import env_settings

db_url = env_settings.db_url

engine = create_engine(db_url)

session_local = sessionmaker(bind=engine)

Base = declarative_base()

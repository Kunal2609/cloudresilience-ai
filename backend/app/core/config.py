"""CloudResilience AI - Backend configuration and environment settings."""
import os

class Settings:
    PROJECT_NAME: str = "CloudResilience AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Storage
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./cloudresilience.db")
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "resilience123")
    
    # LLM Settings (optional API key, fallback to deterministic engine)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()

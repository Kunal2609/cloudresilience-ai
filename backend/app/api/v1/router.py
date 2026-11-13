"""Main API v1 router combining all functional endpoints."""
from fastapi import APIRouter
from app.api.v1.endpoints import (
    architectures,
    simulation,
    scenarios,
    analysis,
    recommendations,
    history,
)

api_router = APIRouter()

api_router.include_router(architectures.router, prefix="/architectures", tags=["Architectures"])
api_router.include_router(simulation.router, prefix="/simulation", tags=["Simulation"])
api_router.include_router(scenarios.router, prefix="/scenarios", tags=["Scenarios"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Analysis & Graph"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations & What-If"])
api_router.include_router(history.router, prefix="/history", tags=["History & Reports"])

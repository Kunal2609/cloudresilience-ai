"""API endpoints for listing available simulation scenarios."""
from typing import List
from fastapi import APIRouter, HTTPException
from app.schemas.models import ScenarioDefinition
from app.engine.scenarios import AVAILABLE_SCENARIOS, get_scenario_by_id

router = APIRouter()

@router.get("", response_model=List[ScenarioDefinition])
def list_scenarios():
    """Returns the full catalog of operational failure and security simulation scenarios."""
    return AVAILABLE_SCENARIOS

@router.get("/{scenario_id}", response_model=ScenarioDefinition)
def get_scenario(scenario_id: str):
    """Retrieves metadata and parameter schema for a specific scenario."""
    s = get_scenario_by_id(scenario_id)
    if not s:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    return s

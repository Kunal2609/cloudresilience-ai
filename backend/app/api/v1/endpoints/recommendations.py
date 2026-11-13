"""API endpoints for resilience recommendations and What-If comparison experiments."""
from typing import List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter
from app.schemas.models import (
    VirtualArchitecture,
    RecommendationItem,
    WhatIfComparison,
)
from app.graph.networkx_graph import CloudArchitectureGraph
from app.analytics.recommendations import generate_recommendations, compute_what_if_comparison

router = APIRouter()

class WhatIfRequest(BaseModel):
    architecture: VirtualArchitecture
    scenario_id: str = "db_outage"
    initiating_resource_id: str = "db-aurora-primary"
    mitigation_type: str = "add_db_failover"

@router.post("/generate", response_model=List[RecommendationItem])
def get_recommendations(arch: VirtualArchitecture):
    """Generates prioritized architectural resilience recommendations."""
    graph = CloudArchitectureGraph(arch)
    blast_radius = graph.calculate_blast_radius(arch.resources[0].id if arch.resources else "")
    return generate_recommendations(arch, graph, blast_radius, "general")

@router.post("/what-if", response_model=WhatIfComparison)
def run_what_if(req: WhatIfRequest):
    """
    Executes a before-and-after What-If comparison experiment,
    measuring risk reduction, blast radius dampening, and preserved services.
    """
    return compute_what_if_comparison(
        original_architecture=req.architecture,
        scenario_id=req.scenario_id,
        initiating_resource_id=req.initiating_resource_id,
        mitigation_type=req.mitigation_type,
    )

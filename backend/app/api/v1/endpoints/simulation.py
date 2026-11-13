"""API endpoints for executing and controlling simulations."""
import json
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import ArchitectureModel, SimulationRunModel
from app.db.sample_data import get_sample_architecture_unmitigated, get_sample_architecture_mitigated
from app.schemas.models import (
    SimulationRunRequest,
    SimulationResult,
    VirtualArchitecture,
    ResourceState,
)
from app.engine.propagation import SimulationEngine

router = APIRouter()

@router.post("/run", response_model=SimulationResult)
def run_simulation(req: SimulationRunRequest, db: Session = Depends(get_db)):
    """
    Executes a complete discrete-event simulation run.
    Calculates failure propagation, blast radius, CRRS, recovery plan, and recommendations.
    Persists run to the database.
    """
    arch: Optional[VirtualArchitecture] = req.architecture

    if arch is None and req.architecture_id:
        rec = db.query(ArchitectureModel).filter(ArchitectureModel.id == req.architecture_id).first()
        if rec:
            arch = VirtualArchitecture(**json.loads(rec.graph_json))
        elif req.architecture_id == "arch-sample-unmitigated":
            arch = get_sample_architecture_unmitigated()
        elif req.architecture_id == "arch-sample-mitigated":
            arch = get_sample_architecture_mitigated()

    if arch is None:
        raise HTTPException(
            status_code=400,
            detail="Valid architecture object or architecture_id must be provided.",
        )

    engine = SimulationEngine(arch)
    try:
        result = engine.run_simulation(
            scenario_id=req.scenario_id,
            initiating_resource_id=req.initiating_resource_id,
            parameters=req.parameters,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Persist simulation run
    run_record = SimulationRunModel(
        id=result.simulation_id,
        architecture_id=arch.id,
        scenario_id=result.scenario_id,
        initiating_resource_id=result.initiating_resource_id,
        parameters_json=json.dumps(req.parameters),
        result_json=result.model_dump_json(),
        crrs_score=result.crrs.overall_score,
        blast_radius_pct=result.blast_radius.percentage_affected,
    )
    db.add(run_record)
    db.commit()

    return result

@router.post("/reset", response_model=VirtualArchitecture)
def reset_simulation(arch: VirtualArchitecture):
    """
    Resets all resources in the virtual architecture to their Healthy baseline state.
    """
    for res in arch.resources:
        res.state = ResourceState.HEALTHY
    return arch

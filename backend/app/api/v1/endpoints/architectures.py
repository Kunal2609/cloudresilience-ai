"""API endpoints for managing virtual cloud architectures."""
import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import ArchitectureModel
from app.db.sample_data import get_sample_architecture_unmitigated, get_sample_architecture_mitigated
from app.schemas.models import VirtualArchitecture
from app.graph.networkx_graph import CloudArchitectureGraph

router = APIRouter()

@router.get("", response_model=List[Dict[str, Any]])
def list_architectures(db: Session = Depends(get_db)):
    """Lists all stored virtual architectures."""
    records = db.query(ArchitectureModel).order_by(ArchitectureModel.updated_at.desc()).all()
    results = []
    for r in records:
        data = json.loads(r.graph_json)
        results.append({
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "version": r.version,
            "resource_count": len(data.get("resources", [])),
            "edge_count": len(data.get("edges", [])),
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        })
    return results

@router.get("/sample/unmitigated", response_model=VirtualArchitecture)
def get_sample_unmitigated():
    """Returns the baseline fictional cloud environment before adding failover."""
    return get_sample_architecture_unmitigated()

@router.get("/sample/mitigated", response_model=VirtualArchitecture)
def get_sample_mitigated():
    """Returns the resilient fictional cloud environment with active multi-AZ failover."""
    return get_sample_architecture_mitigated()

@router.get("/{arch_id}", response_model=VirtualArchitecture)
def get_architecture(arch_id: str, db: Session = Depends(get_db)):
    """Retrieves full architecture definition by ID."""
    # A saved architecture may deliberately retain a sample ID after the user
    # edits it. Prefer the persisted revision, then fall back to the built-in.
    record = db.query(ArchitectureModel).filter(ArchitectureModel.id == arch_id).first()
    if record:
        return VirtualArchitecture(**json.loads(record.graph_json))
    if arch_id == "arch-sample-unmitigated":
        return get_sample_architecture_unmitigated()
    if arch_id == "arch-sample-mitigated":
        return get_sample_architecture_mitigated()
    raise HTTPException(status_code=404, detail=f"Architecture '{arch_id}' not found.")

@router.post("", response_model=VirtualArchitecture)
def save_or_update_architecture(arch: VirtualArchitecture, db: Session = Depends(get_db)):
    """Saves or updates a virtual architecture."""
    record = db.query(ArchitectureModel).filter(ArchitectureModel.id == arch.id).first()
    ids = [resource.id for resource in arch.resources]
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=400, detail="Resource IDs must be unique within an architecture.")
    edge_ids = [edge.id for edge in arch.edges]
    if len(edge_ids) != len(set(edge_ids)):
        raise HTTPException(status_code=400, detail="Relationship IDs must be unique within an architecture.")
    resource_ids = set(ids)
    for edge in arch.edges:
        if edge.source not in resource_ids or edge.target not in resource_ids:
            raise HTTPException(status_code=400, detail=f"Relationship '{edge.id}' must reference existing resources.")
        if edge.source == edge.target:
            raise HTTPException(status_code=400, detail="A resource cannot have a relationship to itself.")

    if record:
        next_version = record.version + 1
        saved = arch.model_copy(update={"version": next_version})
        record.name = arch.name
        record.description = arch.description
        record.graph_json = saved.model_dump_json()
        record.version = next_version
    else:
        saved = arch.model_copy(update={"version": max(1, arch.version)})
        record = ArchitectureModel(
            id=arch.id,
            name=arch.name,
            description=arch.description,
            graph_json=saved.model_dump_json(),
            version=saved.version,
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return saved

@router.delete("/{arch_id}")
def delete_architecture(arch_id: str, db: Session = Depends(get_db)):
    """Deletes an architecture."""
    record = db.query(ArchitectureModel).filter(ArchitectureModel.id == arch_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Architecture '{arch_id}' not found.")
    db.delete(record)
    db.commit()
    return {"status": "deleted", "id": arch_id}

@router.post("/validate")
def validate_architecture(arch: VirtualArchitecture):
    """
    Validates virtual architecture topology for consistency, orphan edges,
    cyclic dependencies, and disconnected components.
    """
    graph = CloudArchitectureGraph(arch)
    warnings = []
    errors = []

    res_ids = set(graph.resources_by_id.keys())

    # Check edges point to existing nodes
    for edge in arch.edges:
        if edge.source not in res_ids:
            errors.append(f"Edge '{edge.id}' source '{edge.source}' does not exist.")
        if edge.target not in res_ids:
            errors.append(f"Edge '{edge.id}' target '{edge.target}' does not exist.")

    # Check cycles
    cycles = graph.detect_cycles()
    if cycles:
        warnings.append(f"Detected circular dependency cycle(s): {cycles}")

    # Check for Single Points of Failure
    spofs = graph.find_spofs()
    if spofs:
        warnings.append(f"Identified {len(spofs)} Single Point(s) of Failure: {spofs}")

    # Check for disconnected resources
    disconnected = [
        r.id for r in arch.resources
        if graph.g.degree(r.id) == 0 and r.type.value not in ("region", "vpc", "az")
    ]
    if disconnected:
        warnings.append(f"Found disconnected resource(s) with no relationships: {disconnected}")

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "spof_count": len(spofs),
        "total_nodes": len(arch.resources),
        "total_edges": len(arch.edges),
    }

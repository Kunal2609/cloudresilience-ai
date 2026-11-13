"""API endpoints for on-demand CRRS scoring, blast radius, and graph analytics."""
from typing import Dict, Any, List
from fastapi import APIRouter
from app.schemas.models import (
    VirtualArchitecture,
    CRRSScore,
    BlastRadiusAnalysis,
)
from app.graph.networkx_graph import CloudArchitectureGraph
from app.analytics.crrs import CRRSCalculator

router = APIRouter()

@router.post("/crrs", response_model=CRRSScore)
def calculate_crrs(arch: VirtualArchitecture):
    """Calculates the Cloud Resilience Risk Score (CRRS) for the architecture."""
    graph = CloudArchitectureGraph(arch)
    calc = CRRSCalculator()
    return calc.calculate_architecture_score(arch, graph)

@router.post("/blast-radius/{resource_id}", response_model=BlastRadiusAnalysis)
def calculate_blast_radius(resource_id: str, arch: VirtualArchitecture):
    """Calculates the theoretical blast radius if resource_id encounters a catastrophic failure."""
    graph = CloudArchitectureGraph(arch)
    return graph.calculate_blast_radius(resource_id)

@router.post("/attack-paths/{identity_id}", response_model=List[List[str]])
def calculate_attack_paths(identity_id: str, arch: VirtualArchitecture):
    """Traverses security relationships (ASSUMES_ROLE, HAS_PERMISSION) to map attack paths."""
    graph = CloudArchitectureGraph(arch)
    return graph.dfs_attack_paths(identity_id)

@router.post("/graph-metrics")
def get_graph_metrics(arch: VirtualArchitecture):
    """Returns centrality metrics, cycles, and Single Points of Failure."""
    graph = CloudArchitectureGraph(arch)
    return {
        "degree_centrality": graph.degree_centrality(),
        "betweenness_centrality": graph.betweenness_centrality(),
        "spofs": graph.find_spofs(),
        "cycles": graph.detect_cycles(),
        "topological_order": graph.topological_sort_dependencies(),
    }

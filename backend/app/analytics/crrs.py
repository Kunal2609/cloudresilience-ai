"""Cloud Resilience Risk Score (CRRS) calculation engine.

CRRS Formula:
Overall Score (0-100) = w_crit * S_crit + w_dep * S_dep + w_sec * S_sec + w_cent * S_cent
Default Configured Weights:
- Resource Criticality (w_crit): 0.30
- Downstream Dependency Impact (w_dep): 0.25
- Security Exposure (w_sec): 0.25
- Structural Centrality (w_cent): 0.20
"""
from typing import Dict, List, Any
from app.schemas.models import (
    VirtualArchitecture,
    VirtualResource,
    CriticalityLevel,
    SecurityExposure,
    CRRSScore,
    CRRSFactorScore,
)
from app.graph.networkx_graph import CloudArchitectureGraph

CRITICALITY_SCORES = {
    CriticalityLevel.CRITICAL: 100.0,
    CriticalityLevel.HIGH: 75.0,
    CriticalityLevel.MEDIUM: 45.0,
    CriticalityLevel.LOW: 20.0,
}

EXPOSURE_SCORES = {
    SecurityExposure.PUBLIC: 100.0,
    SecurityExposure.INTERNAL: 40.0,
    SecurityExposure.RESTRICTED: 15.0,
}

class CRRSCalculator:
    """Calculates deterministic, transparent Cloud Resilience Risk Scores."""

    def __init__(
        self,
        weight_criticality: float = 0.30,
        weight_dependency: float = 0.25,
        weight_security: float = 0.25,
        weight_centrality: float = 0.20,
    ):
        self.w_crit = weight_criticality
        self.w_dep = weight_dependency
        self.w_sec = weight_security
        self.w_cent = weight_centrality

    def calculate_resource_score(
        self,
        resource: VirtualResource,
        downstream_count: int,
        total_resources: int,
        betweenness: float,
    ) -> float:
        """Calculates 0-100 CRRS score for a single resource."""
        # 1. Criticality factor (0-100)
        crit_score = CRITICALITY_SCORES.get(resource.criticality, 50.0)
        # If resource lacks redundancy when critical, increase risk penalty
        if not resource.has_redundancy and resource.criticality in (CriticalityLevel.CRITICAL, CriticalityLevel.HIGH):
            crit_score = min(100.0, crit_score * 1.15)
        elif resource.has_redundancy:
            crit_score = max(10.0, crit_score * 0.70)

        # 2. Dependency factor (0-100): fraction of the entire architecture dependent on this node
        dep_ratio = (downstream_count / max(1, total_resources - 1)) if total_resources > 1 else 0.0
        dep_score = min(100.0, dep_ratio * 100.0)

        # 3. Security exposure factor (0-100)
        sec_score = EXPOSURE_SCORES.get(resource.security_exposure, 40.0)
        # Overprivileged IAM or lack of encryption check in config
        if resource.config.get("sensitive", False) and resource.security_exposure == SecurityExposure.PUBLIC:
            sec_score = 100.0
        elif resource.config.get("mfa_required") is False and resource.type.value == "iam_role":
            sec_score = min(100.0, sec_score + 25.0)

        # 4. Structural centrality factor (0-100)
        cent_score = min(100.0, betweenness * 200.0) # Normalized betweenness

        res_score = (
            self.w_crit * crit_score +
            self.w_dep * dep_score +
            self.w_sec * sec_score +
            self.w_cent * cent_score
        )
        return round(res_score, 1)

    def calculate_architecture_score(
        self,
        architecture: VirtualArchitecture,
        graph: CloudArchitectureGraph = None
    ) -> CRRSScore:
        """Calculates holistic architecture-level CRRS and factor breakdown."""
        if graph is None:
            graph = CloudArchitectureGraph(architecture)

        total_nodes = len(architecture.resources)
        if total_nodes == 0:
            return CRRSScore(
                overall_score=0.0,
                risk_category="Low",
                factors=[],
                resource_scores={},
                formula_explanation="No resources in architecture."
            )

        betweenness_map = graph.betweenness_centrality()
        
        # Calculate downstream dependents count per node
        downstream_counts = {}
        for r in architecture.resources:
            # BFS on propagation graph tells us how many resources break if r breaks
            bfs_results = graph.bfs_propagation(r.id)
            # If r has redundancy, the downstream impact is significantly mitigated
            if r.has_redundancy or graph.failover_graph.out_degree(r.id) > 0:
                downstream_counts[r.id] = 0
            else:
                downstream_counts[r.id] = len(bfs_results)

        # Compute individual resource scores
        resource_scores: Dict[str, float] = {}
        crit_sum = 0.0
        dep_sum = 0.0
        sec_sum = 0.0
        cent_sum = 0.0

        for r in architecture.resources:
            crit = CRITICALITY_SCORES.get(r.criticality, 50.0)
            if not r.has_redundancy and r.criticality in (CriticalityLevel.CRITICAL, CriticalityLevel.HIGH):
                crit = min(100.0, crit * 1.15)
            elif r.has_redundancy:
                crit = max(10.0, crit * 0.70)
            crit_sum += crit

            dep_ratio = (downstream_counts[r.id] / max(1, total_nodes - 1)) if total_nodes > 1 else 0.0
            dep = min(100.0, dep_ratio * 100.0)
            dep_sum += dep

            sec = EXPOSURE_SCORES.get(r.security_exposure, 40.0)
            if r.config.get("sensitive", False) and r.security_exposure == SecurityExposure.PUBLIC:
                sec = 100.0
            sec_sum += sec

            cent = min(100.0, betweenness_map.get(r.id, 0.0) * 200.0)
            cent_sum += cent

            r_score = self.calculate_resource_score(
                r,
                downstream_counts[r.id],
                total_nodes,
                betweenness_map.get(r.id, 0.0),
            )
            resource_scores[r.id] = r_score

        # Average factor scores
        avg_crit = round(crit_sum / total_nodes, 1)
        avg_dep = round(dep_sum / total_nodes, 1)
        avg_sec = round(sec_sum / total_nodes, 1)
        avg_cent = round(cent_sum / total_nodes, 1)

        overall = round(
            self.w_crit * avg_crit +
            self.w_dep * avg_dep +
            self.w_sec * avg_sec +
            self.w_cent * avg_cent,
            1
        )

        # Risk classification
        if overall >= 75.0:
            category = "Critical"
        elif overall >= 55.0:
            category = "High"
        elif overall >= 35.0:
            category = "Moderate"
        else:
            category = "Low"

        factors = [
            CRRSFactorScore(
                name="Resource Criticality",
                weight=self.w_crit,
                score=avg_crit,
                description=f"Weighted tier of vital services (30%). Redundancy buffers lower the criticality strain."
            ),
            CRRSFactorScore(
                name="Downstream Dependency Impact",
                weight=self.w_dep,
                score=avg_dep,
                description=f"Average blast radius potential (25%) based on directed operational dependencies."
            ),
            CRRSFactorScore(
                name="Security Exposure",
                weight=self.w_sec,
                score=avg_sec,
                description=f"Perimeter exposure and privilege reachability (25%) across IAM & network interfaces."
            ),
            CRRSFactorScore(
                name="Structural Centrality",
                weight=self.w_cent,
                score=avg_cent,
                description=f"Network betweenness centrality (20%) identifying high-traffic bottleneck nodes."
            ),
        ]

        formula_desc = (
            f"CRRS = ({self.w_crit} × Criticality: {avg_crit}) + "
            f"({self.w_dep} × Dependency: {avg_dep}) + "
            f"({self.w_sec} × Security: {avg_sec}) + "
            f"({self.w_cent} × Centrality: {avg_cent}) = {overall}/100"
        )

        return CRRSScore(
            overall_score=overall,
            risk_category=category,
            factors=factors,
            resource_scores=resource_scores,
            formula_explanation=formula_desc
        )

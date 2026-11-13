"""Architectural resilience recommendations and What-If comparison engine."""
from typing import List, Dict, Any
import copy
from app.schemas.models import (
    VirtualArchitecture,
    VirtualResource,
    VirtualEdge,
    RelationshipType,
    ResourceType,
    BlastRadiusAnalysis,
    RecommendationItem,
    WhatIfComparison,
)
from app.graph.networkx_graph import CloudArchitectureGraph
from app.analytics.crrs import CRRSCalculator

def generate_recommendations(
    architecture: VirtualArchitecture,
    graph: CloudArchitectureGraph,
    blast_radius: BlastRadiusAnalysis,
    scenario_id: str,
) -> List[RecommendationItem]:
    """Generates concrete, evidence-backed architectural recommendations."""
    items: List[RecommendationItem] = []
    spofs = graph.find_spofs()

    # Recommendation 1: Database Multi-AZ Failover
    db_spofs = [
        r_id for r_id in spofs
        if graph.resources_by_id.get(r_id) and graph.resources_by_id[r_id].type == ResourceType.DATABASE
    ]
    if db_spofs:
        primary_id = db_spofs[0]
        primary_res = graph.resources_by_id[primary_id]
        dependents = list(graph.propagation_graph.successors(primary_id)) if primary_id in graph.propagation_graph else []
        items.append(
            RecommendationItem(
                id="rec-db-failover",
                title="Enable Synchronous Multi-AZ Standby Failover",
                category="Redundancy",
                severity="Critical",
                problem_statement=(
                    f"Primary database '{primary_res.name}' is an unmitigated Single Point of Failure. "
                    f"A failure in this datastore cascades to {len(dependents)} downstream service(s)."
                ),
                solution_description=(
                    "Provision a multi-AZ standby database replica in an alternate Availability Zone (e.g., us-east-1b) "
                    "with synchronous replication and automated DNS CNAME failover (30-second target RTO)."
                ),
                targeted_resource_ids=[primary_id],
                evidence_path=[primary_id] + dependents[:3],
                expected_risk_reduction_points=24.5,
            )
        )

    # Recommendation 2: Overprivileged IAM Role Hardening
    for res in architecture.resources:
        if res.type == ResourceType.IAM_ROLE:
            # Check outgoing HAS_PERMISSION edges
            perm_targets = [
                e.target for e in architecture.edges
                if e.source == res.id and e.relationship == RelationshipType.HAS_PERMISSION
            ]
            if len(perm_targets) >= 2 or any(
                graph.resources_by_id.get(t) and graph.resources_by_id[t].config.get("sensitive")
                for t in perm_targets
            ):
                items.append(
                    RecommendationItem(
                        id=f"rec-iam-hardening-{res.id}",
                        title="Enforce Least-Privilege IAM & Role Segmentation",
                        category="IAM Hardening",
                        severity="High",
                        problem_statement=(
                            f"IAM role '{res.name}' grants access across multiple distinct tiers ({', '.join(perm_targets)}). "
                            "A compromised workload token allows lateral privilege escalation into sensitive data."
                        ),
                        solution_description=(
                            "Split monolithic role into purpose-bound task roles. Remove wildcard actions and attach "
                            "inline resource-scoped ARNs with Condition blocks requiring aws:SourceVpc and MFA."
                        ),
                        targeted_resource_ids=[res.id] + perm_targets,
                        evidence_path=[res.id] + perm_targets,
                        expected_risk_reduction_points=18.0,
                    )
                )

    # Recommendation 3: Multi-AZ Compute Dispersion
    app_services = [r for r in architecture.resources if r.type == ResourceType.APP_SERVICE]
    az_counts: Dict[str, int] = {}
    for app in app_services:
        az_counts[app.az or "default"] = az_counts.get(app.az or "default", 0) + 1
    if len(az_counts) <= 1 and len(app_services) > 1:
        items.append(
            RecommendationItem(
                id="rec-multi-az-compute",
                title="Distribute Microservices Across Multiple Availability Zones",
                category="Multi-AZ",
                severity="High",
                problem_statement=(
                    f"All application services reside in a single Availability Zone ({list(az_counts.keys())[0]}). "
                    "A localized zone partition causes complete application downtime."
                ),
                solution_description=(
                    "Configure Auto Scaling groups to balance instances across a minimum of 2 or 3 Availability Zones "
                    "behind the Application Load Balancer with cross-zone load balancing enabled."
                ),
                targeted_resource_ids=[a.id for a in app_services],
                evidence_path=[a.id for a in app_services],
                expected_risk_reduction_points=15.0,
            )
        )

    # Recommendation 4: Storage Hardening
    s3_buckets = [r for r in architecture.resources if r.type == ResourceType.STORAGE_S3]
    for s3 in s3_buckets:
        if s3.security_exposure == "public" or s3.config.get("public_access_block") is False:
            items.append(
                RecommendationItem(
                    id=f"rec-s3-protect-{s3.id}",
                    title="Enforce S3 Block Public Access & Private VPC Endpoints",
                    category="Storage",
                    severity="Critical",
                    problem_statement=f"Storage bucket '{s3.name}' is exposed to public network reachability.",
                    solution_description="Enable account-level S3 Block Public Access and configure Gateway VPC Endpoints for private traffic routing.",
                    targeted_resource_ids=[s3.id],
                    evidence_path=[s3.id],
                    expected_risk_reduction_points=22.0,
                )
            )

    return items

def compute_what_if_comparison(
    original_architecture: VirtualArchitecture,
    scenario_id: str,
    initiating_resource_id: str,
    mitigation_type: str = "add_db_failover",
) -> WhatIfComparison:
    """
    Computes before-and-after simulation comparison proving risk reduction.
    """
    from app.engine.propagation import SimulationEngine

    # 1. Run on original baseline
    engine_orig = SimulationEngine(original_architecture)
    orig_res = engine_orig.run_simulation(scenario_id, initiating_resource_id)

    # 2. Build synthetic mitigated architecture
    mitigated_arch = copy.deepcopy(original_architecture)
    mitigated_arch.id = f"{original_architecture.id}-mitigated"

    if mitigation_type == "add_db_failover":
        mitigation_title = "Automated Multi-AZ Database Failover"
        for r in mitigated_arch.resources:
            if r.id == initiating_resource_id or r.type == ResourceType.DATABASE:
                r.has_redundancy = True
                r.redundant_target_id = "db-standby-replica"
                r.is_spof = False
                r.config["multi_az_failover"] = True

        # Ensure standby exists or add it
        has_standby = any(r.id == "db-standby-replica" for r in mitigated_arch.resources)
        if not has_standby:
            from app.schemas.models import CriticalityLevel, SecurityExposure, ResourceState
            standby = VirtualResource(
                id="db-standby-replica",
                name="Standby Database Replica (AZ-B)",
                type=ResourceType.BACKUP_RESOURCE,
                provider="aws",
                region="us-east-1",
                az="us-east-1b",
                criticality=CriticalityLevel.HIGH,
                state=ResourceState.HEALTHY,
                security_exposure=SecurityExposure.INTERNAL,
                rto_minutes=15,
                rpo_minutes=0,
                has_redundancy=False,
                is_spof=False,
                position_x=860,
                position_y=320,
                config={"auto_promote": True},
            )
            mitigated_arch.resources.append(standby)

        mitigated_arch.edges.append(
            VirtualEdge(
                id="edge-failover-autogen",
                source=initiating_resource_id,
                target="db-standby-replica",
                relationship=RelationshipType.FAILOVER_TO,
            )
        )

    elif mitigation_type == "least_privilege_iam":
        mitigation_title = "Least-Privilege Role Segmentation"
        # Disconnect overprivileged edge
        mitigated_arch.edges = [
            e for e in mitigated_arch.edges
            if not (e.relationship == RelationshipType.HAS_PERMISSION and e.permission_level == "admin")
        ]
    else:
        mitigation_title = "High Availability Topology Hardening"

    # 3. Run on mitigated architecture
    engine_mit = SimulationEngine(mitigated_arch)
    mit_res = engine_mit.run_simulation(scenario_id, initiating_resource_id)

    orig_affected = len(orig_res.blast_radius.directly_affected_ids) + len(orig_res.blast_radius.indirectly_affected_ids) + 1
    mit_affected = len(mit_res.blast_radius.directly_affected_ids) + len(mit_res.blast_radius.indirectly_affected_ids) + 1

    saved = [
        rid for rid in (orig_res.blast_radius.directly_affected_ids + orig_res.blast_radius.indirectly_affected_ids)
        if rid not in (mit_res.blast_radius.directly_affected_ids + mit_res.blast_radius.indirectly_affected_ids)
    ]

    summary_text = (
        f"Applying '{mitigation_title}' reduced CRRS risk by {round(orig_res.crrs.overall_score - mit_res.crrs.overall_score, 1)} points "
        f"(from {orig_res.crrs.overall_score} to {mit_res.crrs.overall_score}). Blast radius dropped from "
        f"{orig_res.blast_radius.percentage_affected}% to {mit_res.blast_radius.percentage_affected}%, successfully insulating "
        f"{len(saved)} vital service(s) from outage cascading."
    )

    return WhatIfComparison(
        original_scenario_id=scenario_id,
        mitigation_title=mitigation_title,
        original_crrs=orig_res.crrs.overall_score,
        mitigated_crrs=mit_res.crrs.overall_score,
        original_affected_count=orig_affected,
        mitigated_affected_count=mit_affected,
        original_blast_radius_pct=orig_res.blast_radius.percentage_affected,
        mitigated_blast_radius_pct=mit_res.blast_radius.percentage_affected,
        saved_resources=saved,
        summary=summary_text,
    )

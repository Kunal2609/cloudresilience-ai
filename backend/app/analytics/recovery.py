"""Automated dependency-aware disaster recovery orchestrator and RTO/RPO calculation."""
from typing import List, Dict
from app.schemas.models import (
    VirtualArchitecture,
    ResourceState,
    RecoveryPlan,
    RecoveryAction,
    SimulationStepEvent,
)
from app.graph.networkx_graph import CloudArchitectureGraph

def generate_recovery_plan(
    architecture: VirtualArchitecture,
    events: List[SimulationStepEvent],
    final_states: Dict[str, ResourceState],
) -> RecoveryPlan:
    """
    Builds an optimal, dependency-ordered Disaster Recovery orchestration sequence.
    Recovers base tier infrastructure before dependent compute and edge gateways.
    """
    graph = CloudArchitectureGraph(architecture)
    
    # Identify all affected resources needing recovery
    affected_ids = [
        r_id for r_id, state in final_states.items()
        if state in (ResourceState.FAILED, ResourceState.DEGRADED, ResourceState.COMPROMISED, ResourceState.ISOLATED)
    ]

    if not affected_ids:
        return RecoveryPlan(
            total_estimated_recovery_minutes=0,
            max_rto_minutes=0,
            max_rpo_minutes=0,
            rto_breached=False,
            actions=[]
        )

    # Get topological order of dependencies (leaf dependencies come first)
    topo_order = graph.topological_sort_dependencies()
    # Filter to only affected resources
    ordered_recovery_ids = [r_id for r_id in topo_order if r_id in affected_ids]
    # Append any remaining affected resources not captured in topo sort
    for r_id in affected_ids:
        if r_id not in ordered_recovery_ids:
            ordered_recovery_ids.append(r_id)

    actions: List[RecoveryAction] = []
    accumulated_time = 0
    max_rto = 0
    max_rpo = 0
    rto_breached = False

    for idx, r_id in enumerate(ordered_recovery_ids, start=1):
        res = graph.resources_by_id.get(r_id)
        if not res:
            continue

        # Baseline recovery estimation based on resource type
        r_type = res.type.value if hasattr(res.type, "value") else str(res.type)
        if r_type == "database":
            est_minutes = 25 if res.has_redundancy else 75
            action_desc = "Promote standby read replica / Restore point-in-time snapshot and verify connection pooling"
        elif r_type == "iam_role":
            est_minutes = 10
            action_desc = "Revoke compromised STS session tokens, rotate access keys, and apply least-privilege IAM policy"
        elif r_type in ("compute_ec2", "app_service"):
            est_minutes = 15
            action_desc = "Deploy replacement auto-scaling instances and reconnect upstream datastore pool"
        elif r_type == "storage_s3":
            est_minutes = 20
            action_desc = "Re-enable S3 Block Public Access and restore corrupted/deleted objects from S3 Versioning"
        elif r_type == "load_balancer":
            est_minutes = 15
            action_desc = "Rebind target groups and verify health-check HTTP 200 OK responses"
        else:
            est_minutes = 10
            action_desc = f"Restart service '{res.name}' and verify network socket readiness"

        accumulated_time += est_minutes
        max_rto = max(max_rto, res.rto_minutes)
        max_rpo = max(max_rpo, res.rpo_minutes)

        if accumulated_time > res.rto_minutes:
            rto_breached = True

        # Pre-requisite dependencies that must be operational before this step
        prereqs = [
            dep for dep in graph.dependency_graph.successors(r_id)
            if dep in affected_ids and dep != r_id
        ]

        actions.append(
            RecoveryAction(
                sequence=idx,
                resource_id=r_id,
                resource_name=res.name,
                action=action_desc,
                estimated_time_minutes=est_minutes,
                prerequisite_resource_ids=prereqs,
                notes=(
                    f"RTO Target: {res.rto_minutes}m. Accumulated MTTR: {accumulated_time}m. "
                    + ("⚠️ RTO SLA BREACHED!" if accumulated_time > res.rto_minutes else "✓ Within RTO tolerance.")
                )
            )
        )

    return RecoveryPlan(
        total_estimated_recovery_minutes=accumulated_time,
        max_rto_minutes=max_rto,
        max_rpo_minutes=max_rpo,
        rto_breached=rto_breached,
        actions=actions
    )

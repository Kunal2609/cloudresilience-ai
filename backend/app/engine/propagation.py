"""Simulation engine core event generator, discrete state machine, and propagation engine."""
from typing import Dict, List, Set, Any, Tuple, Optional
import uuid
from datetime import datetime
from app.schemas.models import (
    VirtualArchitecture,
    VirtualResource,
    VirtualEdge,
    ResourceState,
    ResourceType,
    CriticalityLevel,
    RelationshipType,
    SimulationStepEvent,
    SimulationResult,
    BlastRadiusAnalysis,
)
from app.graph.networkx_graph import CloudArchitectureGraph
from app.analytics.crrs import CRRSCalculator

class SimulationEngine:
    """
    Deterministic, discrete-event simulation engine.
    Computes exact state transitions, relationship traversals, and temporal sequence.
    """

    def __init__(self, architecture: VirtualArchitecture):
        self.architecture = architecture
        self.graph = CloudArchitectureGraph(architecture)
        self.crrs_calc = CRRSCalculator()

    def run_simulation(
        self,
        scenario_id: str,
        initiating_resource_id: str,
        parameters: Dict[str, Any] = None,
    ) -> SimulationResult:
        if parameters is None:
            parameters = {}

        simulation_id = f"sim-{uuid.uuid4().hex[:8]}"
        initial_states = {r.id: r.state for r in self.architecture.resources}
        current_states = dict(initial_states)

        events: List[SimulationStepEvent] = []
        step_counter = 1
        time_offset = 0

        # Verify initiating resource exists
        if initiating_resource_id not in self.graph.resources_by_id:
            raise ValueError(f"Initiating resource '{initiating_resource_id}' does not exist in architecture.")

        initiator = self.graph.resources_by_id[initiating_resource_id]

        compatible_types = {
            "db_outage": {ResourceType.DATABASE},
            "ec2_failure": {ResourceType.COMPUTE_EC2},
            "app_service_failure": {ResourceType.APP_SERVICE, ResourceType.MICROSERVICE},
            "lb_failure": {ResourceType.LOAD_BALANCER},
            "network_partition": {ResourceType.VPC},
            "queue_failure": {ResourceType.MESSAGE_QUEUE},
            "storage_unavailability": {ResourceType.STORAGE_S3},
            "iam_role_compromise": {ResourceType.IAM_ROLE},
            "excessive_permissions": {ResourceType.APP_SERVICE, ResourceType.MICROSERVICE},
            "public_storage_exposure": {ResourceType.STORAGE_S3},
            "unintended_network_reachability": {
                ResourceType.DATABASE, ResourceType.COMPUTE_EC2, ResourceType.APP_SERVICE
            },
        }
        allowed = compatible_types.get(scenario_id)
        if allowed and initiator.type not in allowed:
            names = ", ".join(sorted(resource_type.value.replace("_", " ") for resource_type in allowed))
            raise ValueError(
                f"Scenario '{scenario_id}' requires a compatible target ({names}); "
                f"'{initiator.name}' is a {initiator.type.value.replace('_', ' ')}."
            )

        # Determine scenario category
        is_security_scenario = scenario_id in [
            "iam_role_compromise",
            "excessive_permissions",
            "public_storage_exposure",
            "unintended_network_reachability",
            "compromised_app_service",
            "lateral_movement",
        ]

        if is_security_scenario:
            events, current_states = self._execute_security_simulation(
                initiator, scenario_id, parameters, current_states
            )
        elif scenario_id == "az_outage":
            events, current_states = self._execute_az_outage_simulation(
                initiator, parameters, current_states
            )
        elif scenario_id == "region_outage":
            events, current_states = self._execute_region_outage_simulation(
                initiator, parameters, current_states
            )
        elif scenario_id == "multi_resource_failure":
            events, current_states = self._execute_multi_resource_simulation(
                initiator, parameters, current_states
            )
        else:
            # Standard operational failure (e.g. Database outage, EC2 failure, LB failure)
            events, current_states = self._execute_operational_failure_simulation(
                initiator, scenario_id, parameters, current_states
            )

        # Calculate blast radius from the actual final state impact
        blast_radius = self.graph.calculate_blast_radius(initiating_resource_id)

        # Calculate CRRS for post-simulation state
        crrs_score = self.crrs_calc.calculate_architecture_score(self.architecture, self.graph)

        # Generate recovery plan & recommendations
        from app.analytics.recovery import generate_recovery_plan
        from app.analytics.recommendations import generate_recommendations
        from app.analytics.ai_explainer import generate_simulation_explanation

        recovery_plan = generate_recovery_plan(self.architecture, events, current_states)
        recommendations = generate_recommendations(self.architecture, self.graph, blast_radius, scenario_id)
        ai_explanation = generate_simulation_explanation(
            scenario_id, initiator, blast_radius, crrs_score, recommendations
        )

        return SimulationResult(
            simulation_id=simulation_id,
            scenario_id=scenario_id,
            initiating_resource_id=initiating_resource_id,
            status="completed",
            total_steps=len(events),
            events=events,
            initial_states=initial_states,
            final_states=current_states,
            blast_radius=blast_radius,
            crrs=crrs_score,
            recovery_plan=recovery_plan,
            recommendations=recommendations,
            ai_explanation=ai_explanation,
            created_at=datetime.utcnow().isoformat(),
        )

    # ------------------ Operational Simulation Runner ------------------

    def _execute_operational_failure_simulation(
        self,
        initiator: VirtualResource,
        scenario_id: str,
        parameters: Dict[str, Any],
        current_states: Dict[str, ResourceState],
    ) -> Tuple[List[SimulationStepEvent], Dict[str, ResourceState]]:
        events: List[SimulationStepEvent] = []
        step = 1
        time_offset_ms = 0

        # Step 1: Initiator fails
        prev_state = current_states[initiator.id]
        new_state = ResourceState.FAILED
        current_states[initiator.id] = new_state

        events.append(
            SimulationStepEvent(
                step_number=step,
                timestamp_offset_ms=time_offset_ms,
                event_type="STATE_CHANGE",
                source_resource_id=initiator.id,
                target_resource_id=initiator.id,
                relationship_type=None,
                previous_state=prev_state,
                new_state=new_state,
                reason=f"Primary incident injected: {initiator.name} encountered catastrophic outage ({scenario_id}).",
                propagation_path=[initiator.id],
                details={"incident_origin": True},
            )
        )

        # Step 2: Check redundancy / failover mechanisms
        standby_targets = list(self.graph.failover_graph.successors(initiator.id))
        has_failover = (len(standby_targets) > 0) or (initiator.has_redundancy and initiator.redundant_target_id is not None)

        if has_failover:
            target_standby_id = standby_targets[0] if standby_targets else initiator.redundant_target_id
            target_standby = self.graph.resources_by_id.get(target_standby_id)
            step += 1
            time_offset_ms += 1200

            events.append(
                SimulationStepEvent(
                    step_number=step,
                    timestamp_offset_ms=time_offset_ms,
                    event_type="FAILOVER_TRIGGERED",
                    source_resource_id=initiator.id,
                    target_resource_id=target_standby_id,
                    relationship_type=RelationshipType.FAILOVER_TO,
                    previous_state=current_states.get(target_standby_id, ResourceState.HEALTHY),
                    new_state=ResourceState.RECOVERED,
                    reason=f"Automated health checks detected {initiator.name} failure. Heartbeat transferred to standby {target_standby.name if target_standby else target_standby_id}.",
                    propagation_path=[initiator.id, target_standby_id],
                    details={"failover_success": True},
                )
            )
            current_states[target_standby_id] = ResourceState.RECOVERED

            # Failover prevents downstream collapse! Downstream dependencies are preserved.
            step += 1
            time_offset_ms += 800
            events.append(
                SimulationStepEvent(
                    step_number=step,
                    timestamp_offset_ms=time_offset_ms,
                    event_type="FAILOVER_MITIGATION",
                    source_resource_id=target_standby_id,
                    target_resource_id=initiator.id,
                    relationship_type=RelationshipType.FAILOVER_TO,
                    previous_state=ResourceState.FAILED,
                    new_state=ResourceState.ISOLATED,
                    reason=f"Traffic gracefully rerouted to {target_standby_id}. Upstream services remain operational without downstream disruption.",
                    propagation_path=[initiator.id, target_standby_id],
                    details={"blast_radius_absorbed": True},
                )
            )
            return events, current_states

        # No failover: Cascade through propagation graph (BFS order)
        bfs_steps = self.graph.bfs_propagation(initiator.id)
        visited_nodes: Set[str] = {initiator.id}

        # Group by propagation depth so waves appear sequentially
        depth_groups: Dict[int, List[Tuple[str, str]]] = {}
        for parent, node, depth in bfs_steps:
            depth_groups.setdefault(depth, []).append((parent, node))

        for depth in sorted(depth_groups.keys()):
            for parent_id, node_id in depth_groups[depth]:
                target_res = self.graph.resources_by_id.get(node_id)
                if not target_res:
                    continue

                step += 1
                time_offset_ms += 1500

                # Determine impact level:
                # If target is critical and depends strictly on failed parent -> FAILED or DEGRADED
                prev_st = current_states.get(node_id, ResourceState.HEALTHY)
                propagation_attrs = self.graph.propagation_graph.get_edge_data(parent_id, node_id) or {}
                dependency_strength = propagation_attrs.get("dependency_strength")
                
                # Check if target has alternative operational redundants
                if target_res.has_redundancy and target_res.redundant_target_id:
                    next_st = ResourceState.DEGRADED
                    reason_msg = (
                        f"Operational dependency '{parent_id}' unavailable. "
                        f"{target_res.name} transitioned to DEGRADED (operating on redundant capacity)."
                    )
                elif dependency_strength is not None and dependency_strength < 0.5:
                    next_st = ResourceState.DEGRADED
                    reason_msg = f"Weak dependency ({dependency_strength:.1f}) on unavailable resource '{parent_id}' reduced {target_res.name} to DEGRADED."
                else:
                    next_st = ResourceState.FAILED if target_res.criticality == CriticalityLevel.CRITICAL else ResourceState.DEGRADED
                    reason_msg = (
                        f"Dependent service '{target_res.name}' lost upstream connection to failed dependency '{parent_id}'. "
                        f"Health check timeouts exceeded."
                    )

                current_states[node_id] = next_st
                visited_nodes.add(node_id)

                events.append(
                    SimulationStepEvent(
                        step_number=step,
                        timestamp_offset_ms=time_offset_ms,
                        event_type="SERVICE_DEGRADED" if next_st == ResourceState.DEGRADED else "STATE_CHANGE",
                        source_resource_id=parent_id,
                        target_resource_id=node_id,
                        relationship_type=RelationshipType.DEPENDS_ON,
                        previous_state=prev_st,
                        new_state=next_st,
                        reason=reason_msg,
                        propagation_path=[initiator.id, parent_id, node_id],
                        details={"depth": depth, "loss_of_dependency": parent_id, "dependency_strength": dependency_strength},
                    )
                )

        return events, current_states

    # ------------------ AZ Outage Simulation ------------------

    def _execute_region_outage_simulation(
        self,
        initiator: VirtualResource,
        parameters: Dict[str, Any],
        current_states: Dict[str, ResourceState],
    ) -> Tuple[List[SimulationStepEvent], Dict[str, ResourceState]]:
        region = initiator.region or parameters.get("region")
        affected = [resource for resource in self.architecture.resources if resource.region == region]
        events: List[SimulationStepEvent] = []
        for index, resource in enumerate(affected, start=1):
            previous = current_states[resource.id]
            current_states[resource.id] = ResourceState.FAILED
            events.append(SimulationStepEvent(
                step_number=index,
                timestamp_offset_ms=(index - 1) * 400,
                event_type="STATE_CHANGE",
                source_resource_id=initiator.id,
                target_resource_id=resource.id,
                relationship_type=None,
                previous_state=previous,
                new_state=ResourceState.FAILED,
                reason=f"{resource.name} is unavailable due to regional outage in '{region}'.",
                propagation_path=[initiator.id] if resource.id == initiator.id else [initiator.id, resource.id],
                details={"region": region},
            ))
        return events, current_states

    # ------------------ AZ Outage Simulation ------------------

    def _execute_az_outage_simulation(
        self,
        initiator: VirtualResource,
        parameters: Dict[str, Any],
        current_states: Dict[str, ResourceState],
    ) -> Tuple[List[SimulationStepEvent], Dict[str, ResourceState]]:
        events: List[SimulationStepEvent] = []
        step = 1
        time_offset_ms = 0

        target_az = initiator.az or parameters.get("az", "us-east-1a")
        az_resources = [r for r in self.architecture.resources if r.az == target_az]

        events.append(
            SimulationStepEvent(
                step_number=step,
                timestamp_offset_ms=time_offset_ms,
                event_type="AZ_POWER_LOSS",
                source_resource_id=initiator.id,
                target_resource_id=initiator.id,
                relationship_type=None,
                previous_state=ResourceState.HEALTHY,
                new_state=ResourceState.FAILED,
                reason=f"Major datacenter power & network loss in Availability Zone '{target_az}'.",
                propagation_path=[r.id for r in az_resources],
                details={"target_az": target_az, "affected_az_count": len(az_resources)},
            )
        )

        for res in az_resources:
            step += 1
            time_offset_ms += 400
            prev_st = current_states[res.id]
            current_states[res.id] = ResourceState.FAILED

            events.append(
                SimulationStepEvent(
                    step_number=step,
                    timestamp_offset_ms=time_offset_ms,
                    event_type="STATE_CHANGE",
                    source_resource_id=initiator.id,
                    target_resource_id=res.id,
                    relationship_type=None,
                    previous_state=prev_st,
                    new_state=ResourceState.FAILED,
                    reason=f"{res.name} physically situated in severed zone '{target_az}'. All health checks unreachable.",
                    propagation_path=[res.id],
                    details={"az": target_az},
                )
            )

        # Check cross-AZ services surviving or degrading
        surviving_resources = [r for r in self.architecture.resources if r.az != target_az]
        for s_res in surviving_resources:
            # If s_res strictly depends on any failed AZ resource and has no multi-az redundancy
            failed_deps = [
                d for d in self.graph.dependency_graph.successors(s_res.id)
                if current_states.get(d) == ResourceState.FAILED
            ]
            if failed_deps and not s_res.has_redundancy:
                step += 1
                time_offset_ms += 900
                prev_st = current_states[s_res.id]
                current_states[s_res.id] = ResourceState.DEGRADED
                events.append(
                    SimulationStepEvent(
                        step_number=step,
                        timestamp_offset_ms=time_offset_ms,
                        event_type="SERVICE_DEGRADED",
                        source_resource_id=failed_deps[0],
                        target_resource_id=s_res.id,
                        relationship_type=RelationshipType.DEPENDS_ON,
                        previous_state=prev_st,
                        new_state=ResourceState.DEGRADED,
                        reason=f"{s_res.name} resides in surviving AZ but lost critical dependent {failed_deps[0]}.",
                        propagation_path=[failed_deps[0], s_res.id],
                        details={"cross_az_dependent": True},
                    )
                )

        return events, current_states

    # ------------------ Multi-Resource Failure ------------------

    def _execute_multi_resource_simulation(
        self,
        initiator: VirtualResource,
        parameters: Dict[str, Any],
        current_states: Dict[str, ResourceState],
    ) -> Tuple[List[SimulationStepEvent], Dict[str, ResourceState]]:
        events: List[SimulationStepEvent] = []
        target_ids = parameters.get("target_resource_ids", [initiator.id])
        if initiator.id not in target_ids:
            target_ids.insert(0, initiator.id)

        step = 0
        time_offset_ms = 0
        for tid in target_ids:
            res = self.graph.resources_by_id.get(tid)
            if not res:
                continue
            step += 1
            time_offset_ms += 500
            prev_st = current_states[tid]
            current_states[tid] = ResourceState.FAILED
            events.append(
                SimulationStepEvent(
                    step_number=step,
                    timestamp_offset_ms=time_offset_ms,
                    event_type="STATE_CHANGE",
                    source_resource_id=tid,
                    target_resource_id=tid,
                    relationship_type=None,
                    previous_state=prev_st,
                    new_state=ResourceState.FAILED,
                    reason=f"Concurrent failure triggered on {res.name}.",
                    propagation_path=[tid],
                    details={"multi_failure_batch": True},
                )
            )
        return events, current_states

    # ------------------ Security Simulation Runner ------------------

    def _execute_security_simulation(
        self,
        initiator: VirtualResource,
        scenario_id: str,
        parameters: Dict[str, Any],
        current_states: Dict[str, ResourceState],
    ) -> Tuple[List[SimulationStepEvent], Dict[str, ResourceState]]:
        events: List[SimulationStepEvent] = []
        step = 1
        time_offset_ms = 0

        # Step 1: Initiating role or host compromised
        prev_state = current_states[initiator.id]
        current_states[initiator.id] = ResourceState.COMPROMISED

        events.append(
            SimulationStepEvent(
                step_number=step,
                timestamp_offset_ms=time_offset_ms,
                event_type="EXPLOIT_PROPAGATION",
                source_resource_id=initiator.id,
                target_resource_id=initiator.id,
                relationship_type=None,
                previous_state=prev_state,
                new_state=ResourceState.COMPROMISED,
                reason=f"Security scenario triggered: {initiator.name} security credentials/token compromised via {scenario_id}.",
                propagation_path=[initiator.id],
                details={"credential_theft": True},
            )
        )

        # Step 2: Traverse permission and network reachability graph
        attack_paths = self.graph.dfs_attack_paths(initiator.id, max_depth=5)
        compromised_resources: Set[str] = {initiator.id}

        for path in attack_paths:
            if len(path) < 2:
                continue
            source_id = path[-2]
            target_id = path[-1]

            if target_id in compromised_resources:
                continue

            target_res = self.graph.resources_by_id.get(target_id)
            if not target_res:
                continue

            edge_data = self.graph.security_graph.get_edge_data(source_id, target_id)
            rel_type = edge_data.get("relationship", "HAS_PERMISSION") if edge_data else "HAS_PERMISSION"
            perm_level = edge_data.get("permission_level", "read") if edge_data else "read"

            step += 1
            time_offset_ms += 1400

            prev_st = current_states.get(target_id, ResourceState.HEALTHY)
            # If target holds sensitive data or is DB/S3 -> COMPROMISED
            if target_res.type in (ResourceType.STORAGE_S3, ResourceType.DATABASE) or target_res.config.get("sensitive"):
                next_st = ResourceState.COMPROMISED
                reason_msg = (
                    f"Adversary pivoted from '{source_id}' to '{target_res.name}' via {rel_type} (Privilege: {perm_level}). "
                    f"Confidential datastore accessed without MFA."
                )
            else:
                next_st = ResourceState.ISOLATED
                reason_msg = (
                    f"Automated SecOps detected lateral probe from '{source_id}' to '{target_res.name}'. "
                    f"Host network segment isolated to prevent breach expansion."
                )

            current_states[target_id] = next_st
            compromised_resources.add(target_id)

            events.append(
                SimulationStepEvent(
                    step_number=step,
                    timestamp_offset_ms=time_offset_ms,
                    event_type="EXPLOIT_PROPAGATION" if next_st == ResourceState.COMPROMISED else "CONTAINMENT_TRIGGERED",
                    source_resource_id=source_id,
                    target_resource_id=target_id,
                    relationship_type=RelationshipType(rel_type) if rel_type in RelationshipType._value2member_map_ else RelationshipType.HAS_PERMISSION,
                    previous_state=prev_st,
                    new_state=next_st,
                    reason=reason_msg,
                    propagation_path=path,
                    details={"privilege_used": perm_level, "attack_vector": rel_type},
                )
            )

        return events, current_states

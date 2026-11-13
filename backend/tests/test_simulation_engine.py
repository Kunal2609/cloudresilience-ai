"""Unit and integration tests for CloudResilience AI graph algorithms and simulation engine."""
import pytest
from app.db.sample_data import get_sample_architecture_unmitigated, get_sample_architecture_mitigated
from app.graph.networkx_graph import CloudArchitectureGraph
from app.engine.propagation import SimulationEngine
from app.analytics.crrs import CRRSCalculator
from app.analytics.recovery import generate_recovery_plan
from app.analytics.recommendations import compute_what_if_comparison
from app.schemas.models import (
    ResourceState, ResourceType, VirtualArchitecture, VirtualResource, VirtualEdge, RelationshipType,
)

def test_graph_construction_and_spof_detection():
    arch = get_sample_architecture_unmitigated()
    graph = CloudArchitectureGraph(arch)
    
    assert len(graph.resources_by_id) == 9
    assert len(graph.edges_by_id) == 11
    
    # Primary DB is unmitigated SPOF
    spofs = graph.find_spofs()
    assert "db-aurora-primary" in spofs

def test_unmitigated_database_outage_propagation():
    arch = get_sample_architecture_unmitigated()
    engine = SimulationEngine(arch)
    
    result = engine.run_simulation(
        scenario_id="db_outage",
        initiating_resource_id="db-aurora-primary"
    )
    
    assert result.status == "completed"
    assert result.initiating_resource_id == "db-aurora-primary"
    # Initiating database must be FAILED
    assert result.final_states["db-aurora-primary"] == ResourceState.FAILED
    
    # Dependent app services must be affected
    assert result.final_states["app-service-az1"] in (ResourceState.FAILED, ResourceState.DEGRADED)
    assert result.final_states["app-service-az2"] in (ResourceState.FAILED, ResourceState.DEGRADED)
    
    # Blast radius must reflect dependent impact
    assert "app-service-az1" in result.blast_radius.directly_affected_ids
    assert "app-service-az2" in result.blast_radius.directly_affected_ids
    assert result.blast_radius.percentage_affected > 30.0

def test_mitigated_database_failover_preservation():
    arch = get_sample_architecture_mitigated()
    engine = SimulationEngine(arch)
    
    result = engine.run_simulation(
        scenario_id="db_outage",
        initiating_resource_id="db-aurora-primary"
    )
    
    # Standby must have taken over
    assert "db-aurora-standby" in result.blast_radius.redundancy_saved_ids or result.final_states.get("db-aurora-standby") == ResourceState.RECOVERED
    # Downstream app services should NOT be failed
    assert result.final_states["app-service-az1"] == ResourceState.HEALTHY
    assert result.final_states["app-service-az2"] == ResourceState.HEALTHY

def test_security_iam_compromise_attack_paths():
    arch = get_sample_architecture_unmitigated()
    engine = SimulationEngine(arch)
    
    result = engine.run_simulation(
        scenario_id="iam_role_compromise",
        initiating_resource_id="iam-app-exec-role"
    )
    
    # S3 and DB have HAS_PERMISSION from role, so must be compromised
    assert result.final_states["iam-app-exec-role"] == ResourceState.COMPROMISED
    assert result.final_states["s3-finance-data"] == ResourceState.COMPROMISED
    assert result.final_states["db-aurora-primary"] == ResourceState.COMPROMISED

def test_network_connectivity_alone_does_not_create_authorized_attack_path():
    from app.graph.networkx_graph import CloudArchitectureGraph

    architecture = VirtualArchitecture(
        id="network-only-security-test",
        name="Network-only path",
        resources=[
            VirtualResource(id="attacker", name="Compromised host", type=ResourceType.COMPUTE_EC2),
            VirtualResource(id="private-db", name="Private database", type=ResourceType.DATABASE),
        ],
        edges=[
            VirtualEdge(
                id="network-link",
                source="attacker",
                target="private-db",
                relationship=RelationshipType.NETWORK_REACHABLE,
            )
        ],
    )

    assert CloudArchitectureGraph(architecture).dfs_attack_paths("attacker") == []

def test_crrs_score_calculation():
    arch = get_sample_architecture_unmitigated()
    calc = CRRSCalculator()
    score = calc.calculate_architecture_score(arch)
    
    assert 0.0 <= score.overall_score <= 100.0
    assert len(score.factors) == 4
    assert score.risk_category in ("Critical", "High", "Moderate", "Low")

def test_what_if_comparison_demonstrates_risk_reduction():
    arch = get_sample_architecture_unmitigated()
    comp = compute_what_if_comparison(
        original_architecture=arch,
        scenario_id="db_outage",
        initiating_resource_id="db-aurora-primary",
        mitigation_type="add_db_failover"
    )
    
    assert comp.mitigated_crrs < comp.original_crrs
    assert comp.mitigated_blast_radius_pct < comp.original_blast_radius_pct
    assert len(comp.saved_resources) > 0

def test_recovery_plan_topological_ordering():
    arch = get_sample_architecture_unmitigated()
    engine = SimulationEngine(arch)
    result = engine.run_simulation("db_outage", "db-aurora-primary")
    
    plan = result.recovery_plan
    assert len(plan.actions) > 0
    # Base database should be recovered before dependent application tiers
    action_resource_ids = [a.resource_id for a in plan.actions]
    assert "db-aurora-primary" in action_resource_ids


def test_custom_database_failure_uses_user_defined_dependency_graph():
    database = VirtualResource(id="custom-db", name="Primary-DB", type=ResourceType.DATABASE)
    web1 = VirtualResource(id="web-01", name="Web-Server-01", type=ResourceType.COMPUTE_EC2)
    web2 = VirtualResource(id="web-02", name="Web-Server-02", type=ResourceType.COMPUTE_EC2)
    architecture = VirtualArchitecture(
        id="custom-architecture",
        name="Custom topology",
        resources=[database, web1, web2],
        edges=[
            VirtualEdge(id="edge-web-01-db", source=web1.id, target=database.id, relationship=RelationshipType.DEPENDS_ON),
            VirtualEdge(id="edge-web-02-db", source=web2.id, target=database.id, relationship=RelationshipType.DEPENDS_ON),
        ],
    )

    result = SimulationEngine(architecture).run_simulation("db_outage", database.id)

    assert result.final_states[database.id] == ResourceState.FAILED
    assert result.final_states[web1.id] == ResourceState.DEGRADED
    assert result.final_states[web2.id] == ResourceState.DEGRADED
    assert set(result.blast_radius.directly_affected_ids) == {web1.id, web2.id}


def test_simulation_rejects_incompatible_custom_resource_target():
    architecture = VirtualArchitecture(
        id="custom-architecture",
        name="Custom topology",
        resources=[VirtualResource(id="web-01", name="Web-Server-01", type=ResourceType.COMPUTE_EC2)],
    )
    with pytest.raises(ValueError, match="requires a compatible target"):
        SimulationEngine(architecture).run_simulation("db_outage", "web-01")


def test_zero_strength_dependency_does_not_propagate_failure():
    database = VirtualResource(id="custom-db", name="Primary-DB", type=ResourceType.DATABASE)
    web = VirtualResource(id="web-01", name="Web-Server-01", type=ResourceType.COMPUTE_EC2)
    architecture = VirtualArchitecture(
        id="custom-architecture",
        name="Custom topology",
        resources=[database, web],
        edges=[VirtualEdge(
            id="edge-web-db", source=web.id, target=database.id,
            relationship=RelationshipType.DEPENDS_ON, dependency_strength=0,
        )],
    )
    result = SimulationEngine(architecture).run_simulation("db_outage", database.id)
    assert result.final_states[web.id] == ResourceState.HEALTHY
    assert web.id in result.blast_radius.unaffected_ids

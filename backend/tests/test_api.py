"""End-to-end API tests for CloudResilience AI FastAPI server."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "CloudResilience AI"

def test_get_sample_unmitigated_architecture():
    response = client.get("/api/v1/architectures/sample/unmitigated")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "arch-sample-unmitigated"
    assert len(data["resources"]) >= 8
    assert len(data["edges"]) >= 10

def test_get_sample_mitigated_architecture():
    response = client.get("/api/v1/architectures/sample/mitigated")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "arch-sample-mitigated"
    # Must have failover edge
    failover_edges = [e for e in data["edges"] if e["relationship"] == "FAILOVER_TO"]
    assert len(failover_edges) >= 1

def test_list_scenarios():
    response = client.get("/api/v1/scenarios")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 10
    ids = [s["id"] for s in data]
    assert "db_outage" in ids
    assert "iam_role_compromise" in ids
    assert "az_outage" in ids

def test_run_simulation_api():
    # Fetch sample architecture first
    sample = client.get("/api/v1/architectures/sample/unmitigated").json()
    
    payload = {
        "architecture": sample,
        "scenario_id": "db_outage",
        "initiating_resource_id": "db-aurora-primary",
        "parameters": {}
    }
    
    response = client.post("/api/v1/simulation/run", json=payload)
    assert response.status_code == 200
    sim_data = response.json()
    assert sim_data["scenario_id"] == "db_outage"
    assert sim_data["initiating_resource_id"] == "db-aurora-primary"
    assert len(sim_data["events"]) > 0
    assert sim_data["crrs"]["overall_score"] > 0
    assert sim_data["blast_radius"]["percentage_affected"] > 0
    assert len(sim_data["recommendations"]) > 0

def test_what_if_comparison_api():
    sample = client.get("/api/v1/architectures/sample/unmitigated").json()
    payload = {
        "architecture": sample,
        "scenario_id": "db_outage",
        "initiating_resource_id": "db-aurora-primary",
        "mitigation_type": "add_db_failover"
    }
    response = client.post("/api/v1/recommendations/what-if", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["mitigated_crrs"] < data["original_crrs"]
    assert data["mitigated_blast_radius_pct"] < data["original_blast_radius_pct"]

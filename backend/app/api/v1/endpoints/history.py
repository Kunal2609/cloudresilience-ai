"""API endpoints for simulation run history, side-by-side run comparisons, and audit reports."""
import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import SimulationRunModel, ArchitectureModel
from app.schemas.models import SimulationResult

router = APIRouter()

@router.get("", response_model=List[Dict[str, Any]])
def list_history(limit: int = 50, db: Session = Depends(get_db)):
    """Returns a list of all historical simulation executions."""
    records = db.query(SimulationRunModel).order_by(SimulationRunModel.created_at.desc()).limit(limit).all()
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "architecture_id": r.architecture_id,
            "scenario_id": r.scenario_id,
            "initiating_resource_id": r.initiating_resource_id,
            "crrs_score": r.crrs_score,
            "blast_radius_pct": r.blast_radius_pct,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return results

@router.get("/{run_id}", response_model=SimulationResult)
def get_run_details(run_id: str, db: Session = Depends(get_db)):
    """Retrieves full details and events of an earlier simulation run."""
    record = db.query(SimulationRunModel).filter(SimulationRunModel.id == run_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Simulation run '{run_id}' not found.")
    return SimulationResult(**json.loads(record.result_json))

@router.post("/compare")
def compare_runs(payload: Dict[str, str], db: Session = Depends(get_db)):
    """Compares two historical simulation runs side-by-side."""
    run1_id = payload.get("run1_id")
    run2_id = payload.get("run2_id")

    rec1 = db.query(SimulationRunModel).filter(SimulationRunModel.id == run1_id).first()
    rec2 = db.query(SimulationRunModel).filter(SimulationRunModel.id == run2_id).first()

    if not rec1 or not rec2:
        raise HTTPException(status_code=404, detail="One or both simulation runs not found.")

    res1 = SimulationResult(**json.loads(rec1.result_json))
    res2 = SimulationResult(**json.loads(rec2.result_json))

    return {
        "run1": {
            "id": res1.simulation_id,
            "scenario": res1.scenario_id,
            "crrs": res1.crrs.overall_score,
            "blast_radius_pct": res1.blast_radius.percentage_affected,
            "affected_count": len(res1.blast_radius.directly_affected_ids) + len(res1.blast_radius.indirectly_affected_ids) + 1,
            "steps": res1.total_steps,
        },
        "run2": {
            "id": res2.simulation_id,
            "scenario": res2.scenario_id,
            "crrs": res2.crrs.overall_score,
            "blast_radius_pct": res2.blast_radius.percentage_affected,
            "affected_count": len(res2.blast_radius.directly_affected_ids) + len(res2.blast_radius.indirectly_affected_ids) + 1,
            "steps": res2.total_steps,
        },
        "delta": {
            "crrs_diff": round(res2.crrs.overall_score - res1.crrs.overall_score, 1),
            "blast_radius_diff": round(res2.blast_radius.percentage_affected - res1.blast_radius.percentage_affected, 1),
            "improved": res2.crrs.overall_score < res1.crrs.overall_score,
        }
    }

@router.post("/{run_id}/report")
def generate_report(run_id: str, db: Session = Depends(get_db)):
    """Generates an executive markdown report for export or printing."""
    rec = db.query(SimulationRunModel).filter(SimulationRunModel.id == run_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Run not found.")

    res = SimulationResult(**json.loads(rec.result_json))

    report = f"""# CloudResilience AI — Executive Incident & Resilience Report

**Simulation Run ID:** `{res.simulation_id}`  
**Timestamp:** {res.created_at}  
**Scenario Injected:** `{res.scenario_id}`  
**Initiating Resource:** `{res.initiating_resource_id}`  

---

## 1. Resilience Risk Assessment
- **Cloud Resilience Risk Score (CRRS):** **{res.crrs.overall_score} / 100** ({res.crrs.risk_category} Risk)
- **Blast Radius:** **{res.blast_radius.percentage_affected}%** of architecture affected
- **Directly Affected Resources:** {len(res.blast_radius.directly_affected_ids)}
- **Indirectly Affected Resources:** {len(res.blast_radius.indirectly_affected_ids)}
- **Single Points of Failure (SPOF) Present:** {len(res.blast_radius.spof_ids)}

---

## 2. Event Propagation Sequence
| Step | Offset (ms) | Event Type | Source | Target | State Change | Reason |
|---|---|---|---|---|---|---|
"""
    for e in res.events:
        report += f"| {e.step_number} | +{e.timestamp_offset_ms}ms | {e.event_type} | `{e.source_resource_id}` | `{e.target_resource_id}` | {e.previous_state} → **{e.new_state}** | {e.reason} |\n"

    report += f"""
---

## 3. Disaster Recovery Orchestration (Topological Order)
- **Estimated Total Recovery Time:** {res.recovery_plan.total_estimated_recovery_minutes} minutes
- **Max Target RTO:** {res.recovery_plan.max_rto_minutes} minutes
- **SLA Breach Status:** {"⚠️ CRITICAL RTO SLA BREACHED" if res.recovery_plan.rto_breached else "✓ Within SLA"}

### Recovery Steps:
"""
    for action in res.recovery_plan.actions:
        report += f"{action.sequence}. **{action.resource_name}** (`{action.resource_id}`) — Est: {action.estimated_time_minutes}m  \n   *Action:* {action.action}  \n   *Status:* {action.notes}\n"

    report += f"""
---

## 4. Prioritized Architectural Recommendations
"""
    for r in res.recommendations:
        report += f"### [{r.severity}] {r.title} ({r.category})\n"
        report += f"**Problem:** {r.problem_statement}\n\n"
        report += f"**Solution:** {r.solution_description}\n\n"
        report += f"**Expected Risk Reduction:** -{r.expected_risk_reduction_points} CRRS points\n\n"

    report += f"""
---
*Generated autonomously by CloudResilience AI Simulation Platform.*
"""
    return {"run_id": run_id, "report_markdown": report}

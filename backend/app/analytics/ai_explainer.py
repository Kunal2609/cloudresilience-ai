"""AI explanation layer producing clear, executive-grade engineering insights for simulation results."""
from typing import List, Optional
import os
from app.schemas.models import (
    VirtualResource,
    BlastRadiusAnalysis,
    CRRSScore,
    RecommendationItem,
)
from app.core.config import settings

def generate_simulation_explanation(
    scenario_id: str,
    initiator: VirtualResource,
    blast_radius: BlastRadiusAnalysis,
    crrs: CRRSScore,
    recommendations: List[RecommendationItem],
) -> str:
    """
    Generates an authoritative, structured explanation of simulation events,
    failure paths, risk calculations, and architectural remediations.
    """
    # Check if live LLM is configured
    if settings.OPENAI_API_KEY:
        try:
            import httpx
            prompt = (
                f"You are a Principal Cloud Resilience Architect. Explain this simulated incident in structured Markdown:\n"
                f"Scenario: {scenario_id}\n"
                f"Initiating Resource: {initiator.name} ({initiator.type.value})\n"
                f"Blast Radius: {blast_radius.percentage_affected}% affected ({len(blast_radius.directly_affected_ids)} direct, {len(blast_radius.indirectly_affected_ids)} indirect)\n"
                f"CRRS Score: {crrs.overall_score}/100 ({crrs.risk_category})\n"
                f"Recommendations: {[r.title for r in recommendations]}\n"
                f"Format sections: 1. Executive Summary 2. Propagation Mechanism 3. Risk Score Justification 4. Priority Remediation."
            )
            response = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                },
                timeout=8.0,
            )
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception:
            pass # Fallback to deterministic engine

    # High quality deterministic explanation
    top_rec = recommendations[0].title if recommendations else "Provision redundant resources and partition network paths"
    direct_names = ", ".join(blast_radius.directly_affected_ids) if blast_radius.directly_affected_ids else "None"
    indirect_names = ", ".join(blast_radius.indirectly_affected_ids) if blast_radius.indirectly_affected_ids else "None"
    saved_names = ", ".join(blast_radius.redundancy_saved_ids) if blast_radius.redundancy_saved_ids else "None"

    lines = [
        f"### 🛡️ Incident Post-Mortem & Architecture Analysis",
        f"",
        f"**1. What Happened:**",
        f"A simulated **{scenario_id.replace('_', ' ').title()}** event was injected directly into **{initiator.name}** (`{initiator.id}`). The resource transitioned to a disrupted state, triggering health-check timeouts and upstream error bubbling across connected tiers.",
        f"",
        f"**2. Why the Failure Propagated:**",
    ]

    if blast_radius.redundancy_saved_ids:
        lines.append(
            f"The incident was **successfully absorbed** by configured failover targets (`{saved_names}`). Automated health monitors rerouted active traffic, insulating downstream microservices from catastrophic outages."
        )
    else:
        lines.append(
            f"The architecture lacked active failover decoupling for `{initiator.id}`. In accordance with directed `DEPENDS_ON` relationships, synchronous call timeouts cascaded through the connection pool, compromising dependent services `{direct_names}`."
        )

    lines.extend([
        f"",
        f"**3. Impacted Surface (Blast Radius):**",
        f"- **Directly Impacted:** {len(blast_radius.directly_affected_ids)} resources (`{direct_names}`)",
        f"- **Indirectly Impacted:** {len(blast_radius.indirectly_affected_ids)} resources (`{indirect_names}`)",
        f"- **Total Affected Surface:** **{blast_radius.percentage_affected}%** of virtual cloud resources",
        f"- **Single Points of Failure (SPOF) Identified:** {len(blast_radius.spof_ids)} node(s)",
        f"",
        f"**4. Cloud Resilience Risk Score (CRRS) Justification:**",
        f"The architecture registered a **CRRS of {crrs.overall_score}/100 ({crrs.risk_category} Risk)**.",
        f"Contributing factors: {crrs.formula_explanation}.",
        f"",
        f"**5. Priority Remediation:**",
        f"**Top Recommended Action:** *{top_rec}*.",
        f"Implementing this configuration dampens propagation paths and reduces overall architecture blast radius significantly.",
    ])

    return "\n".join(lines)

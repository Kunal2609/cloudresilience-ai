"""Scenario library and template metadata for operational and security simulations."""
from typing import List, Dict, Optional
from app.schemas.models import (
    ScenarioDefinition,
    ScenarioCategory,
    ResourceType,
)

AVAILABLE_SCENARIOS: List[ScenarioDefinition] = [
    # Operational Failure Scenarios
    ScenarioDefinition(
        id="db_outage",
        title="Database Outage",
        category=ScenarioCategory.OPERATIONAL,
        description="Simulates unexpected primary database engine crash or underlying EBS volume stall. Evaluates whether dependent application services degrade or if active multi-AZ standby failover successfully takes over traffic.",
        default_target_type=ResourceType.DATABASE,
        parameters_schema={
            "duration_minutes": {"type": "integer", "default": 60, "description": "Hypothetical downtime duration"},
            "simulate_data_corruption": {"type": "boolean", "default": False, "description": "Trigger WAL/transaction log corruption"}
        },
        prerequisites=["Primary database must have configured dependent compute or failover standby replica."]
    ),
    ScenarioDefinition(
        id="ec2_failure",
        title="Compute Instance (EC2) Failure",
        category=ScenarioCategory.OPERATIONAL,
        description="Injects physical host hardware degradation or hypervisor kernel panic on virtual compute instance.",
        default_target_type=ResourceType.COMPUTE_EC2,
        parameters_schema={
            "auto_recovery_enabled": {"type": "boolean", "default": True, "description": "CloudWatch instance auto-recovery"}
        },
        prerequisites=["Target must be a virtual compute instance."]
    ),
    ScenarioDefinition(
        id="app_service_failure",
        title="Application Service Failure",
        category=ScenarioCategory.OPERATIONAL,
        description="Simulates catastrophic application crash, container Out-Of-Memory (OOM) kill, or unhandled 500 error cascade.",
        default_target_type=ResourceType.APP_SERVICE,
        parameters_schema={
            "error_rate_pct": {"type": "integer", "default": 100, "description": "Injected synthetic error percentage"}
        },
        prerequisites=["Target should be a registered app service or containerized workload."]
    ),
    ScenarioDefinition(
        id="lb_failure",
        title="Load Balancer Outage",
        category=ScenarioCategory.OPERATIONAL,
        description="Simulates ingress gateway disruption, TLS certificate expiration, or ALB health check cascade failure.",
        default_target_type=ResourceType.LOAD_BALANCER,
        parameters_schema={},
        prerequisites=["Target must be an application or network load balancer."]
    ),
    ScenarioDefinition(
        id="az_outage",
        title="Availability Zone Outage",
        category=ScenarioCategory.OPERATIONAL,
        description="Simulates complete physical datacenter loss across an entire Availability Zone (cooling failure, fiber cuts). Evaluates whether multi-AZ redundant services survive or if single-AZ components halt the entire stack.",
        default_target_type=None,
        parameters_schema={
            "az": {"type": "string", "default": "us-east-1a", "description": "Target Availability Zone to sever"}
        },
        prerequisites=["Architecture contains resources mapped to specific AZs."]
    ),
    ScenarioDefinition(
        id="region_outage",
        title="Regional Cloud Outage",
        category=ScenarioCategory.OPERATIONAL,
        description="Simulates widespread cloud provider control plane disruption across an entire geographic region.",
        default_target_type=None,
        parameters_schema={
            "region": {"type": "string", "default": "us-east-1", "description": "Target geographic cloud region"}
        },
        prerequisites=["Resources distributed across regional identifiers."]
    ),
    ScenarioDefinition(
        id="network_partition",
        title="VPC Network Partition",
        category=ScenarioCategory.OPERATIONAL,
        description="Injects subnet routing table misconfiguration or transit gateway peering drop between tiers.",
        default_target_type=ResourceType.VPC,
        parameters_schema={},
        prerequisites=["VPC and networked subnets present."]
    ),
    ScenarioDefinition(
        id="queue_failure",
        title="Message Queue Outage",
        category=ScenarioCategory.OPERATIONAL,
        description="Simulates message queue throttling, Dead Letter Queue saturation, or message broker partition.",
        default_target_type=ResourceType.MESSAGE_QUEUE,
        parameters_schema={
            "retention_exhausted": {"type": "boolean", "default": True}
        },
        prerequisites=["Target must be an asynchronous message queue."]
    ),
    ScenarioDefinition(
        id="storage_unavailability",
        title="Object Storage Unavailability",
        category=ScenarioCategory.OPERATIONAL,
        description="Simulates cloud storage API throttling, localized bucket 503 SlowDown errors, or read-only lockouts.",
        default_target_type=ResourceType.STORAGE_S3,
        parameters_schema={},
        prerequisites=["Target must be an object storage or S3 bucket."]
    ),
    ScenarioDefinition(
        id="multi_resource_failure",
        title="Multiple Concurrent Failures",
        category=ScenarioCategory.OPERATIONAL,
        description="Injects simultaneous coordinated failures across multiple tiers to test disaster recovery resiliency.",
        default_target_type=None,
        parameters_schema={
            "target_resource_ids": {"type": "array", "default": [], "description": "List of resource IDs to fail concurrently"}
        },
        prerequisites=["Multiple resources configured in topology."]
    ),

    # Security Scenarios
    ScenarioDefinition(
        id="iam_role_compromise",
        title="IAM Role Credential Compromise",
        category=ScenarioCategory.SECURITY,
        description="Simulates leaked STS temporary credentials or an SSRF attack on IMDSv1 stealing instance profile role credentials. Explores the blast radius of accessible datastores and databases granted by the role.",
        default_target_type=ResourceType.IAM_ROLE,
        parameters_schema={
            "privilege_escalation_attempt": {"type": "boolean", "default": True, "description": "Attempt to enumerate permissions"}
        },
        prerequisites=["Target IAM role connected via HAS_PERMISSION or ASSUMES_ROLE relationships."]
    ),
    ScenarioDefinition(
        id="excessive_permissions",
        title="Excessive Permissions & Lateral Movement",
        category=ScenarioCategory.SECURITY,
        description="Simulates an attacker gaining foothold on an internal application service and discovering wildcard IAM policies to pivot laterally into restricted databases and S3 buckets.",
        default_target_type=ResourceType.APP_SERVICE,
        parameters_schema={
            "wildcard_actions": {"type": "boolean", "default": True}
        },
        prerequisites=["Service connected to IAM role with downstream datastore permissions."]
    ),
    ScenarioDefinition(
        id="public_storage_exposure",
        title="Public Object Storage Exposure",
        category=ScenarioCategory.SECURITY,
        description="Simulates S3 Block Public Access misconfiguration exposing confidential customer or transactional objects to the public internet.",
        default_target_type=ResourceType.STORAGE_S3,
        parameters_schema={},
        prerequisites=["Object storage bucket present in topology."]
    ),
    ScenarioDefinition(
        id="unintended_network_reachability",
        title="Unintended Network Reachability",
        category=ScenarioCategory.SECURITY,
        description="Simulates overly permissive Security Group ingress (0.0.0.0/0 on internal ports) allowing direct external probing into private datastores.",
        default_target_type=ResourceType.DATABASE,
        parameters_schema={},
        prerequisites=["Database or compute resource in private boundary."]
    ),
]

def get_scenario_by_id(scenario_id: str) -> Optional[ScenarioDefinition]:
    for s in AVAILABLE_SCENARIOS:
        if s.id == scenario_id:
            return s
    return None

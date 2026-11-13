"""Realistic fictional sample cloud architectures for CloudResilience AI demonstrations."""
from typing import Dict
from app.schemas.models import (
    VirtualArchitecture,
    VirtualResource,
    VirtualEdge,
    ResourceType,
    ResourceState,
    CriticalityLevel,
    SecurityExposure,
    RelationshipType,
)

def get_sample_architecture_unmitigated() -> VirtualArchitecture:
    """Returns the baseline fictional cloud environment before adding DB failover redundancy."""
    resources = [
        VirtualResource(
            id="apigw-edge-01",
            name="API Gateway (Public Edge)",
            type=ResourceType.API_GATEWAY,
            provider="aws",
            region="us-east-1",
            az="us-east-1a",
            vpc_id="vpc-prod-01",
            criticality=CriticalityLevel.HIGH,
            state=ResourceState.HEALTHY,
            security_exposure=SecurityExposure.PUBLIC,
            rto_minutes=30,
            rpo_minutes=5,
            has_redundancy=True,
            is_spof=False,
            position_x=80,
            position_y=220,
            config={"rate_limiting": True, "auth": "JWT"},
            metadata={"environment": "production-simulated", "description": "Public entrance gateway"}
        ),
        VirtualResource(
            id="lb-public-01",
            name="ALB Public Ingress",
            type=ResourceType.LOAD_BALANCER,
            provider="aws",
            region="us-east-1",
            az="us-east-1a",
            vpc_id="vpc-prod-01",
            criticality=CriticalityLevel.CRITICAL,
            state=ResourceState.HEALTHY,
            security_exposure=SecurityExposure.PUBLIC,
            rto_minutes=15,
            rpo_minutes=0,
            has_redundancy=True,
            is_spof=True,
            position_x=320,
            position_y=220,
            config={"scheme": "internet-facing", "health_check_interval_sec": 10},
            metadata={"environment": "production-simulated"}
        ),
        VirtualResource(
            id="app-service-az1",
            name="Orders Core Service (AZ-1)",
            type=ResourceType.APP_SERVICE,
            provider="aws",
            region="us-east-1",
            az="us-east-1a",
            vpc_id="vpc-prod-01",
            criticality=CriticalityLevel.CRITICAL,
            state=ResourceState.HEALTHY,
            security_exposure=SecurityExposure.INTERNAL,
            rto_minutes=20,
            rpo_minutes=5,
            has_redundancy=True,
            redundant_target_id="app-service-az2",
            is_spof=False,
            position_x=580,
            position_y=120,
            config={"replicas": 3, "auto_scaling": True},
            metadata={"environment": "production-simulated"}
        ),
        VirtualResource(
            id="app-service-az2",
            name="Orders Core Service (AZ-2)",
            type=ResourceType.APP_SERVICE,
            provider="aws",
            region="us-east-1",
            az="us-east-1b",
            vpc_id="vpc-prod-01",
            criticality=CriticalityLevel.CRITICAL,
            state=ResourceState.HEALTHY,
            security_exposure=SecurityExposure.INTERNAL,
            rto_minutes=20,
            rpo_minutes=5,
            has_redundancy=True,
            redundant_target_id="app-service-az1",
            is_spof=False,
            position_x=580,
            position_y=320,
            config={"replicas": 3, "auto_scaling": True},
            metadata={"environment": "production-simulated"}
        ),
        VirtualResource(
            id="db-aurora-primary",
            name="PostgreSQL Primary DB",
            type=ResourceType.DATABASE,
            provider="aws",
            region="us-east-1",
            az="us-east-1a",
            vpc_id="vpc-prod-01",
            criticality=CriticalityLevel.CRITICAL,
            state=ResourceState.HEALTHY,
            security_exposure=SecurityExposure.INTERNAL,
            rto_minutes=120,
            rpo_minutes=30,
            has_redundancy=False, # Single point of failure in unmitigated baseline
            is_spof=True,
            position_x=860,
            position_y=140,
            config={"engine": "PostgreSQL 16", "multi_az_failover": False, "storage_gb": 500},
            metadata={"environment": "production-simulated", "note": "Primary transactional datastore"}
        ),
        VirtualResource(
            id="db-aurora-standby",
            name="PostgreSQL Standby Replica",
            type=ResourceType.BACKUP_RESOURCE,
            provider="aws",
            region="us-east-1",
            az="us-east-1b",
            vpc_id="vpc-prod-01",
            criticality=CriticalityLevel.HIGH,
            state=ResourceState.HEALTHY,
            security_exposure=SecurityExposure.INTERNAL,
            rto_minutes=60,
            rpo_minutes=15,
            has_redundancy=False,
            is_spof=False,
            position_x=860,
            position_y=320,
            config={"replication_mode": "async", "auto_promote": False},
            metadata={"environment": "production-simulated", "note": "Uncoupled standby replica"}
        ),
        VirtualResource(
            id="sqs-async-events",
            name="Order Processing Queue",
            type=ResourceType.MESSAGE_QUEUE,
            provider="aws",
            region="us-east-1",
            az="us-east-1a",
            vpc_id="vpc-prod-01",
            criticality=CriticalityLevel.MEDIUM,
            state=ResourceState.HEALTHY,
            security_exposure=SecurityExposure.INTERNAL,
            rto_minutes=45,
            rpo_minutes=0,
            has_redundancy=True,
            is_spof=False,
            position_x=860,
            position_y=-40,
            config={"dlq_enabled": True, "retention_days": 4},
            metadata={"environment": "production-simulated"}
        ),
        VirtualResource(
            id="iam-app-exec-role",
            name="AppExecutionRole (IAM)",
            type=ResourceType.IAM_ROLE,
            provider="aws",
            region="us-east-1",
            criticality=CriticalityLevel.HIGH,
            state=ResourceState.HEALTHY,
            security_exposure=SecurityExposure.RESTRICTED,
            rto_minutes=10,
            rpo_minutes=0,
            has_redundancy=True,
            is_spof=False,
            position_x=580,
            position_y=500,
            config={"permission_policies": ["AmazonS3FullAccess", "RDSFullAccess"], "mfa_required": False},
            metadata={"environment": "production-simulated", "note": "Overprivileged IAM identity"}
        ),
        VirtualResource(
            id="s3-finance-data",
            name="Financial Records Bucket (S3)",
            type=ResourceType.STORAGE_S3,
            provider="aws",
            region="us-east-1",
            criticality=CriticalityLevel.CRITICAL,
            state=ResourceState.HEALTHY,
            security_exposure=SecurityExposure.RESTRICTED,
            rto_minutes=60,
            rpo_minutes=5,
            has_redundancy=True,
            is_spof=False,
            position_x=860,
            position_y=500,
            config={"versioning": True, "encryption": "AES-256", "public_access_block": True, "sensitive": True},
            metadata={"environment": "production-simulated", "note": "Contains confidential transactions"}
        )
    ]

    edges = [
        VirtualEdge(
            id="edge-apigw-to-lb",
            source="apigw-edge-01",
            target="lb-public-01",
            relationship=RelationshipType.CONNECTS_TO,
            latency_ms=3
        ),
        VirtualEdge(
            id="edge-lb-to-app1",
            source="lb-public-01",
            target="app-service-az1",
            relationship=RelationshipType.CONNECTS_TO,
            latency_ms=2
        ),
        VirtualEdge(
            id="edge-lb-to-app2",
            source="lb-public-01",
            target="app-service-az2",
            relationship=RelationshipType.CONNECTS_TO,
            latency_ms=2
        ),
        VirtualEdge(
            id="edge-app1-to-db",
            source="app-service-az1",
            target="db-aurora-primary",
            relationship=RelationshipType.DEPENDS_ON, # Operational dependency
            latency_ms=5
        ),
        VirtualEdge(
            id="edge-app2-to-db",
            source="app-service-az2",
            target="db-aurora-primary",
            relationship=RelationshipType.DEPENDS_ON, # Operational dependency
            latency_ms=5
        ),
        VirtualEdge(
            id="edge-app1-to-queue",
            source="app-service-az1",
            target="sqs-async-events",
            relationship=RelationshipType.DEPENDS_ON,
            latency_ms=4
        ),
        VirtualEdge(
            id="edge-app2-to-queue",
            source="app-service-az2",
            target="sqs-async-events",
            relationship=RelationshipType.DEPENDS_ON,
            latency_ms=4
        ),
        VirtualEdge(
            id="edge-app1-assumes-iam",
            source="app-service-az1",
            target="iam-app-exec-role",
            relationship=RelationshipType.ASSUMES_ROLE
        ),
        VirtualEdge(
            id="edge-app2-assumes-iam",
            source="app-service-az2",
            target="iam-app-exec-role",
            relationship=RelationshipType.ASSUMES_ROLE
        ),
        VirtualEdge(
            id="edge-iam-perm-s3",
            source="iam-app-exec-role",
            target="s3-finance-data",
            relationship=RelationshipType.HAS_PERMISSION,
            permission_level="admin"
        ),
        VirtualEdge(
            id="edge-iam-perm-db",
            source="iam-app-exec-role",
            target="db-aurora-primary",
            relationship=RelationshipType.HAS_PERMISSION,
            permission_level="admin"
        ),
    ]

    return VirtualArchitecture(
        id="arch-sample-unmitigated",
        name="Production Ecommerce Architecture (Unmitigated Baseline)",
        description="Simulated multi-tier production environment with single point of failure on primary database and overprivileged IAM role.",
        resources=resources,
        edges=edges,
        version=1
    )

def get_sample_architecture_mitigated() -> VirtualArchitecture:
    """Returns the improved architecture with multi-AZ failover and least-privilege IAM separation."""
    arch = get_sample_architecture_unmitigated()
    arch.id = "arch-sample-mitigated"
    arch.name = "Production Ecommerce Architecture (Resilient Multi-AZ + Failover)"
    arch.description = "Hardened environment with automated database failover, read replica coupling, and partitioned IAM roles."
    
    # Enable redundancy on primary database
    for res in arch.resources:
        if res.id == "db-aurora-primary":
            res.has_redundancy = True
            res.redundant_target_id = "db-aurora-standby"
            res.is_spof = False
            res.config["multi_az_failover"] = True
            res.config["auto_failover_enabled"] = True
        elif res.id == "db-aurora-standby":
            res.type = ResourceType.DATABASE
            res.config["auto_promote"] = True

    # Add FAILOVER_TO edge from primary to standby
    arch.edges.append(
        VirtualEdge(
            id="edge-db-failover-standby",
            source="db-aurora-primary",
            target="db-aurora-standby",
            relationship=RelationshipType.FAILOVER_TO,
            latency_ms=1
        )
    )

    return arch

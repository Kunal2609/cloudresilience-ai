"""Pydantic schemas and domain models for CloudResilience AI."""
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ResourceType(str, Enum):
    COMPUTE_EC2 = "compute_ec2"
    APP_SERVICE = "app_service"
    MICROSERVICE = "microservice"
    DATABASE = "database"
    STORAGE_S3 = "storage_s3"
    IAM_ROLE = "iam_role"
    LOAD_BALANCER = "load_balancer"
    VPC = "vpc"
    AZ = "az"
    REGION = "region"
    MESSAGE_QUEUE = "message_queue"
    API_GATEWAY = "api_gateway"
    BACKUP_RESOURCE = "backup_resource"

class ResourceState(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILED = "failed"
    COMPROMISED = "compromised"
    ISOLATED = "isolated"
    RECOVERING = "recovering"
    RECOVERED = "recovered"

class CriticalityLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class SecurityExposure(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    RESTRICTED = "restricted"

class RelationshipType(str, Enum):
    DEPENDS_ON = "DEPENDS_ON"            # Operational dependency (A depends on B: if B fails, A degrades/fails)
    NETWORK_REACHABLE = "NETWORK_REACHABLE" # Network reachability between subnets/hosts
    HAS_PERMISSION = "HAS_PERMISSION"    # IAM permission granting access to resource
    ASSUMES_ROLE = "ASSUMES_ROLE"        # Entity assumes IAM role
    FAILOVER_TO = "FAILOVER_TO"          # Standby / redundant failover target
    CONNECTS_TO = "CONNECTS_TO"          # General bidirectional or generic network link
    DATA_FLOW = "DATA_FLOW"                # Directional application/data movement
    BACKUP_TO = "BACKUP_TO"                  # Backup copy association; does not imply live failover

class VirtualResource(BaseModel):
    id: str
    name: str
    type: ResourceType
    provider: str = "aws"
    region: str = "us-east-1"
    az: Optional[str] = "us-east-1a"
    vpc_id: Optional[str] = None
    criticality: CriticalityLevel = CriticalityLevel.HIGH
    state: ResourceState = ResourceState.HEALTHY
    security_exposure: SecurityExposure = SecurityExposure.INTERNAL
    rto_minutes: int = 60
    rpo_minutes: int = 15
    has_redundancy: bool = False
    redundant_target_id: Optional[str] = None
    is_spof: bool = False
    position_x: float = 0.0
    position_y: float = 0.0
    config: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class VirtualEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship: RelationshipType
    is_active: bool = True
    latency_ms: int = 5
    permission_level: Optional[str] = None # e.g., 'admin', 'read', 'write'
    description: Optional[str] = None
    dependency_strength: Optional[float] = Field(default=None, ge=0, le=1)
    propagation_rules: Dict[str, Any] = Field(default_factory=dict)
    config: Dict[str, Any] = Field(default_factory=dict)

class VirtualArchitecture(BaseModel):
    id: str
    name: str
    description: str = ""
    resources: List[VirtualResource] = Field(default_factory=list)
    edges: List[VirtualEdge] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    version: int = 1

class ScenarioCategory(str, Enum):
    OPERATIONAL = "operational"
    SECURITY = "security"

class ScenarioDefinition(BaseModel):
    id: str
    title: str
    category: ScenarioCategory
    description: str
    default_target_type: Optional[ResourceType] = None
    parameters_schema: Dict[str, Any] = Field(default_factory=dict)
    prerequisites: List[str] = Field(default_factory=list)

class SimulationStepEvent(BaseModel):
    step_number: int
    timestamp_offset_ms: int
    event_type: str # 'STATE_CHANGE', 'FAILOVER_TRIGGERED', 'EXPLOIT_PROPAGATION', 'SERVICE_DEGRADED', 'RECOVERY_INITIATED'
    source_resource_id: str
    target_resource_id: str
    relationship_type: Optional[RelationshipType] = None
    previous_state: ResourceState
    new_state: ResourceState
    reason: str
    propagation_path: List[str] = Field(default_factory=list)
    details: Dict[str, Any] = Field(default_factory=dict)

class SimulationRunRequest(BaseModel):
    architecture_id: Optional[str] = None
    architecture: Optional[VirtualArchitecture] = None
    scenario_id: str
    initiating_resource_id: str
    parameters: Dict[str, Any] = Field(default_factory=dict)

class BlastRadiusAnalysis(BaseModel):
    initiating_resource_id: str
    total_resources: int
    directly_affected_ids: List[str]
    indirectly_affected_ids: List[str]
    unaffected_ids: List[str]
    critical_services_at_risk_ids: List[str]
    spof_ids: List[str]
    percentage_affected: float
    propagation_paths: List[List[str]]
    redundancy_saved_ids: List[str] = Field(default_factory=list)

class CRRSFactorScore(BaseModel):
    name: str
    weight: float
    score: float
    description: str

class CRRSScore(BaseModel):
    overall_score: float # 0 - 100
    risk_category: str # "Low", "Moderate", "High", "Critical"
    factors: List[CRRSFactorScore]
    resource_scores: Dict[str, float]
    formula_explanation: str

class RecoveryAction(BaseModel):
    sequence: int
    resource_id: str
    resource_name: str
    action: str
    estimated_time_minutes: int
    prerequisite_resource_ids: List[str]
    notes: str

class RecoveryPlan(BaseModel):
    total_estimated_recovery_minutes: int
    max_rto_minutes: int
    max_rpo_minutes: int
    rto_breached: bool
    actions: List[RecoveryAction]

class RecommendationItem(BaseModel):
    id: str
    title: str
    category: str # "Redundancy", "Network Segmentation", "IAM Hardening", "Multi-AZ", "Backup"
    severity: str # "Critical", "High", "Medium"
    problem_statement: str
    solution_description: str
    targeted_resource_ids: List[str]
    evidence_path: List[str]
    expected_risk_reduction_points: float

class WhatIfComparison(BaseModel):
    original_scenario_id: str
    mitigation_title: str
    original_crrs: float
    mitigated_crrs: float
    original_affected_count: int
    mitigated_affected_count: int
    original_blast_radius_pct: float
    mitigated_blast_radius_pct: float
    saved_resources: List[str]
    summary: str

class SimulationResult(BaseModel):
    simulation_id: str
    scenario_id: str
    initiating_resource_id: str
    status: str # 'completed', 'stopped'
    total_steps: int
    events: List[SimulationStepEvent]
    initial_states: Dict[str, ResourceState]
    final_states: Dict[str, ResourceState]
    blast_radius: BlastRadiusAnalysis
    crrs: CRRSScore
    recovery_plan: RecoveryPlan
    recommendations: List[RecommendationItem]
    ai_explanation: Optional[str] = None
    created_at: str

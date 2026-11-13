export type ResourceType =
  | 'compute_ec2'
  | 'app_service'
  | 'microservice'
  | 'database'
  | 'storage_s3'
  | 'iam_role'
  | 'load_balancer'
  | 'vpc'
  | 'az'
  | 'region'
  | 'message_queue'
  | 'api_gateway'
  | 'backup_resource';

export type ResourceState =
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'compromised'
  | 'isolated'
  | 'recovering'
  | 'recovered';

export type CriticalityLevel = 'critical' | 'high' | 'medium' | 'low';

export type SecurityExposure = 'public' | 'internal' | 'restricted';

export type RelationshipType =
  | 'DEPENDS_ON'
  | 'NETWORK_REACHABLE'
  | 'HAS_PERMISSION'
  | 'ASSUMES_ROLE'
  | 'FAILOVER_TO'
  | 'CONNECTS_TO'
  | 'DATA_FLOW'
  | 'BACKUP_TO';

export interface VirtualResource {
  id: string;
  name: string;
  type: ResourceType;
  provider?: string;
  region?: string;
  az?: string;
  vpc_id?: string;
  criticality: CriticalityLevel;
  state: ResourceState;
  security_exposure: SecurityExposure;
  rto_minutes: number;
  rpo_minutes: number;
  has_redundancy: boolean;
  redundant_target_id?: string | null;
  is_spof: boolean;
  position_x: number;
  position_y: number;
  config: Record<string, any>;
  metadata: Record<string, any>;
}

export interface VirtualEdge {
  id: string;
  source: string;
  target: string;
  relationship: RelationshipType;
  is_active: boolean;
  latency_ms: number;
  permission_level?: string | null;
  description?: string | null;
  dependency_strength?: number | null;
  propagation_rules?: Record<string, any>;
  config?: Record<string, any>;
}

export interface VirtualArchitecture {
  id: string;
  name: string;
  description: string;
  resources: VirtualResource[];
  edges: VirtualEdge[];
  created_at?: string;
  updated_at?: string;
  version: number;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  category: 'operational' | 'security';
  description: string;
  default_target_type?: ResourceType | null;
  parameters_schema: Record<string, any>;
  prerequisites: string[];
}

export interface SimulationStepEvent {
  step_number: number;
  timestamp_offset_ms: number;
  event_type: string;
  source_resource_id: string;
  target_resource_id: string;
  relationship_type?: RelationshipType | null;
  previous_state: ResourceState;
  new_state: ResourceState;
  reason: string;
  propagation_path: string[];
  details: Record<string, any>;
}

export interface BlastRadiusAnalysis {
  initiating_resource_id: string;
  total_resources: number;
  directly_affected_ids: string[];
  indirectly_affected_ids: string[];
  unaffected_ids: string[];
  critical_services_at_risk_ids: string[];
  spof_ids: string[];
  percentage_affected: number;
  propagation_paths: string[][];
  redundancy_saved_ids: string[];
}

export interface CRRSFactorScore {
  name: string;
  weight: number;
  score: number;
  description: string;
}

export interface CRRSScore {
  overall_score: number;
  risk_category: 'Low' | 'Moderate' | 'High' | 'Critical';
  factors: CRRSFactorScore[];
  resource_scores: Record<string, number>;
  formula_explanation: string;
}

export interface RecoveryAction {
  sequence: number;
  resource_id: string;
  resource_name: string;
  action: string;
  estimated_time_minutes: number;
  prerequisite_resource_ids: string[];
  notes: string;
}

export interface RecoveryPlan {
  total_estimated_recovery_minutes: number;
  max_rto_minutes: number;
  max_rpo_minutes: number;
  rto_breached: boolean;
  actions: RecoveryAction[];
}

export interface RecommendationItem {
  id: string;
  title: string;
  category: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  problem_statement: string;
  solution_description: string;
  targeted_resource_ids: string[];
  evidence_path: string[];
  expected_risk_reduction_points: number;
}

export interface WhatIfComparison {
  original_scenario_id: string;
  mitigation_title: string;
  original_crrs: number;
  mitigated_crrs: number;
  original_affected_count: number;
  mitigated_affected_count: number;
  original_blast_radius_pct: number;
  mitigated_blast_radius_pct: number;
  saved_resources: string[];
  summary: string;
}

export interface SimulationResult {
  simulation_id: string;
  scenario_id: string;
  initiating_resource_id: string;
  status: string;
  total_steps: number;
  events: SimulationStepEvent[];
  initial_states: Record<string, ResourceState>;
  final_states: Record<string, ResourceState>;
  blast_radius: BlastRadiusAnalysis;
  crrs: CRRSScore;
  recovery_plan: RecoveryPlan;
  recommendations: RecommendationItem[];
  ai_explanation?: string;
  created_at: string;
}

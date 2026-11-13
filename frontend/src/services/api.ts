import {
  VirtualArchitecture,
  ScenarioDefinition,
  SimulationResult,
  CRRSScore,
  BlastRadiusAnalysis,
  WhatIfComparison,
} from '../types/cloud';

const BASE_URL = '/api/v1';

export async function fetchSampleArchitecture(type: 'unmitigated' | 'mitigated' = 'unmitigated'): Promise<VirtualArchitecture> {
  const res = await fetch(`${BASE_URL}/architectures/sample/${type}`);
  if (!res.ok) throw new Error('Failed to load sample architecture');
  return res.json();
}

export async function fetchArchitecture(id: string): Promise<VirtualArchitecture> {
  const res = await fetch(`${BASE_URL}/architectures/${id}`);
  if (!res.ok) throw new Error(`Failed to load architecture ${id}`);
  return res.json();
}

export async function fetchArchitectures(): Promise<Array<{ id: string; name: string; updated_at?: string }>> {
  const res = await fetch(`${BASE_URL}/architectures`);
  if (!res.ok) throw new Error('Failed to load saved architectures');
  return res.json();
}

export async function saveArchitecture(arch: VirtualArchitecture): Promise<VirtualArchitecture> {
  const res = await fetch(`${BASE_URL}/architectures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arch),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to save architecture');
  }
  return res.json();
}

export async function validateArchitecture(arch: VirtualArchitecture): Promise<any> {
  const res = await fetch(`${BASE_URL}/architectures/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arch),
  });
  if (!res.ok) throw new Error('Failed to validate architecture');
  return res.json();
}

export async function fetchScenarios(): Promise<ScenarioDefinition[]> {
  const res = await fetch(`${BASE_URL}/scenarios`);
  if (!res.ok) throw new Error('Failed to load scenarios');
  return res.json();
}

export async function executeSimulation(payload: {
  architecture?: VirtualArchitecture;
  architecture_id?: string;
  scenario_id: string;
  initiating_resource_id: string;
  parameters?: Record<string, any>;
}): Promise<SimulationResult> {
  const res = await fetch(`${BASE_URL}/simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Simulation execution failed');
  }
  return res.json();
}

export async function resetArchitecture(arch: VirtualArchitecture): Promise<VirtualArchitecture> {
  const res = await fetch(`${BASE_URL}/simulation/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arch),
  });
  if (!res.ok) throw new Error('Failed to reset simulation states');
  return res.json();
}

export async function fetchCRRS(arch: VirtualArchitecture): Promise<CRRSScore> {
  const res = await fetch(`${BASE_URL}/analysis/crrs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arch),
  });
  if (!res.ok) throw new Error('Failed to calculate CRRS');
  return res.json();
}

export async function fetchBlastRadius(resourceId: string, arch: VirtualArchitecture): Promise<BlastRadiusAnalysis> {
  const res = await fetch(`${BASE_URL}/analysis/blast-radius/${resourceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arch),
  });
  if (!res.ok) throw new Error('Failed to calculate blast radius');
  return res.json();
}

export async function fetchAttackPaths(identityId: string, arch: VirtualArchitecture): Promise<string[][]> {
  const res = await fetch(`${BASE_URL}/analysis/attack-paths/${identityId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arch),
  });
  if (!res.ok) throw new Error('Failed to calculate attack paths');
  return res.json();
}

export async function executeWhatIf(payload: {
  architecture: VirtualArchitecture;
  scenario_id: string;
  initiating_resource_id: string;
  mitigation_type: string;
}): Promise<WhatIfComparison> {
  const res = await fetch(`${BASE_URL}/recommendations/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to calculate What-If comparison');
  return res.json();
}

export async function fetchSimulationHistory(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/history`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

export async function fetchRunDetails(runId: string): Promise<SimulationResult> {
  const res = await fetch(`${BASE_URL}/history/${runId}`);
  if (!res.ok) throw new Error('Failed to load run details');
  return res.json();
}

export async function compareSimulationRuns(run1Id: string, run2Id: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/history/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run1_id: run1Id, run2_id: run2Id }),
  });
  if (!res.ok) throw new Error('Failed to compare runs');
  return res.json();
}

export async function generateReportMarkdown(runId: string): Promise<{ run_id: string; report_markdown: string }> {
  const res = await fetch(`${BASE_URL}/history/${runId}/report`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to generate report');
  return res.json();
}

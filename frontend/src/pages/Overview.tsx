import React from 'react';
import {
  ShieldAlert,
  Server,
  Zap,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Play,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { VirtualArchitecture, ScenarioDefinition, CRRSScore } from '../types/cloud';

interface OverviewProps {
  architecture: VirtualArchitecture;
  crrs: CRRSScore | null;
  scenarios: ScenarioDefinition[];
  onLaunchSimulation: (scenarioId: string, resourceId: string) => void;
  onNavigate: (page: any) => void;
  onSwitchArchitecture: (type: 'unmitigated' | 'mitigated') => void;
}

export const Overview: React.FC<OverviewProps> = ({
  architecture,
  crrs,
  scenarios,
  onLaunchSimulation,
  onNavigate,
  onSwitchArchitecture,
}) => {
  const isUnmitigated = architecture.id.includes('unmitigated');
  const spofCount = architecture.resources.filter((r) => r.is_spof).length;
  const criticalCount = architecture.resources.filter((r) => r.criticality === 'critical').length;
  const availabilityZoneCount = new Set(architecture.resources.map((r) => r.az).filter(Boolean)).size;

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/60 border border-slate-800 p-6 shadow-2xl">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Interactive Cloud Laboratory
              </span>
              <span className="text-xs text-slate-400 font-mono">Platform v1.0.0</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Cloud Attack-Path & Resilience Simulation Platform
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Design virtual cloud topologies, inject operational disruptions and adversarial IAM compromises,
              trace failure propagation paths, and validate disaster recovery strategies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('simulator')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-slate-950" /> Open Simulator Canvas
            </button>
            <button
              onClick={() => onNavigate('recommendations')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all"
            >
              <Sparkles className="w-4 h-4 text-purple-400" /> What-If Studio
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CRRS Score */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono uppercase font-semibold">Resilience Score (CRRS)</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-cyan-400">
              {crrs ? crrs.overall_score : '—'}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 100</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                crrs?.risk_category === 'Critical'
                  ? 'bg-rose-500/20 text-rose-300'
                  : crrs?.risk_category === 'High'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {crrs ? `${crrs.risk_category} Risk` : 'Calculating'}
            </span>
            <button
              onClick={() => onNavigate('risk')}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
            >
              Formula <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Resources & Components */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono uppercase font-semibold">Virtual Resources</span>
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-slate-100">
              {architecture.resources.length}
            </span>
              <span className="text-xs text-slate-400">nodes across {availabilityZoneCount} AZs</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>{criticalCount} Critical Tiers</span>
            <span className="font-mono">{architecture.edges.length} Directed Edges</span>
          </div>
        </div>

        {/* Single Points of Failure */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono uppercase font-semibold">Vulnerabilities (SPOF)</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-black font-mono ${
                spofCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {spofCount}
            </span>
            <span className="text-xs text-slate-400">Single Point(s) of Failure</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {spofCount > 0 ? (
              <span className="text-rose-400 font-semibold">
                ⚠️ {spofCount} resource(s) flagged as single points of failure
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">
                ✓ No resources are flagged as single points of failure
              </span>
            )}
          </div>
        </div>

        {/* Active Architecture Environment */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono uppercase font-semibold">Environment Mode</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="truncate font-bold text-sm text-slate-100 mb-1">
            {isUnmitigated ? 'Baseline Ecommerce' : 'Hardened Multi-AZ'}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onSwitchArchitecture(isUnmitigated ? 'mitigated' : 'unmitigated')}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold border border-slate-700 flex items-center gap-1 transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Toggle Mode
            </button>
          </div>
        </div>
      </div>

      {/* Featured Demonstrations Workflow Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Demo 1: Database Outage */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Primary Master Demonstration
              </span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <h3 className="font-bold text-base text-slate-100 mb-1">
              Simulate Database Outage
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Trigger unexpected primary database crash. Observe cascading timeouts halting the core orders microservice,
              review the blast radius, and test how standby failover mitigates the impact.
            </p>
          </div>
          <button
            onClick={() => onLaunchSimulation('db_outage', 'db-aurora-primary')}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-rose-600/20 transition-all"
          >
            Launch Database Outage <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Core Demo 2: IAM Compromise */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Security Scenario
              </span>
              <ShieldAlert className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="font-bold text-base text-slate-100 mb-1">
              IAM Credential Compromise
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Simulate token exfiltration on overprivileged AppExecutionRole.
              Trace lateral reachability into sensitive S3 buckets and transactional databases without live network access.
            </p>
          </div>
          <button
            onClick={() => onLaunchSimulation('iam_role_compromise', 'iam-app-exec-role')}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-purple-600/20 transition-all"
          >
            Launch IAM Attack Path <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Core Demo 3: Datacenter AZ Outage */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Physical Zone Loss
              </span>
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="font-bold text-base text-slate-100 mb-1">
              Availability Zone Outage
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Sever all physical compute and networking in Availability Zone <code>us-east-1a</code>.
              Inspect cross-zone survivability and detect isolated dependent services.
            </p>
          </div>
          <button
            onClick={() => onLaunchSimulation('az_outage', 'app-service-az1')}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-600/20 transition-all"
          >
            Launch AZ Outage <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

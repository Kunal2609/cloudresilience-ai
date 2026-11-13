import React from 'react';
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ListOrdered,
} from 'lucide-react';
import { VirtualArchitecture, RecoveryPlan } from '../types/cloud';

interface RecoveryPlannerProps {
  architecture: VirtualArchitecture;
  recoveryPlan: RecoveryPlan | null;
}

export const RecoveryPlanner: React.FC<RecoveryPlannerProps> = ({ architecture, recoveryPlan }) => {
  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-teal-400" /> Automated Disaster Recovery Orchestrator
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Dependency-ordered disaster recovery sequence generated via topological sort.
          Ensures foundational datastores and IAM vaults stabilize before compute and ingress tiers boot.
        </p>
      </div>

      {/* Recovery Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
            Total Estimated MTTR
          </span>
          <div className="text-3xl font-black font-mono text-cyan-400">
            {recoveryPlan ? `${recoveryPlan.total_estimated_recovery_minutes} min` : '45 min'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Sequential orchestration duration required to bring all affected components back to Healthy status.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
            Recovery Time Objective (RTO) SLA
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-3xl font-black font-mono ${
                recoveryPlan?.rto_breached ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {recoveryPlan?.rto_breached ? 'BREACHED' : 'COMPLIANT'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {recoveryPlan?.rto_breached
              ? 'Estimated recovery time exceeds maximum configured RTO SLA tolerances.'
              : 'All restoration sequences execute within business operational tolerances.'}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
            Orchestration Action Steps
          </span>
          <div className="text-3xl font-black font-mono text-slate-100">
            {recoveryPlan ? recoveryPlan.actions.length : 3}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Topologically sequenced automated runbook tasks.
          </p>
        </div>
      </div>

      {/* Sequenced Action Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-base text-slate-100 mb-4 flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-cyan-400" /> Sequenced Recovery Playbook (Topological Order)
        </h3>

        {!recoveryPlan || recoveryPlan.actions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No active incident state. All resources are currently Healthy or no simulation has been run.
          </div>
        ) : (
          <div className="space-y-3">
            {recoveryPlan.actions.map((act) => (
              <div
                key={act.sequence}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-start gap-3 max-w-2xl">
                  <span className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800/60 text-cyan-400 font-mono font-bold flex items-center justify-center shrink-0">
                    {act.sequence}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-slate-100 text-sm">{act.resource_name}</h4>
                      <span className="font-mono text-[10px] text-slate-400">({act.resource_id})</span>
                    </div>
                    <p className="text-slate-300 mb-1.5">{act.action}</p>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {act.notes}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right shrink-0">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Est. Time</span>
                    <span className="text-sm font-bold font-mono text-cyan-300">
                      +{act.estimated_time_minutes} min
                    </span>
                  </div>
                  {act.prerequisite_resource_ids.length > 0 && (
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                      Prereq: {act.prerequisite_resource_ids.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

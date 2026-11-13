import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRightLeft,
  Flame,
  Zap,
} from 'lucide-react';
import { VirtualArchitecture, RecommendationItem, WhatIfComparison } from '../types/cloud';
import { executeWhatIf } from '../services/api';

interface RecommendationsProps {
  architecture: VirtualArchitecture;
  recommendations: RecommendationItem[];
  onApplyMitigationInSimulator: () => void;
}

export const Recommendations: React.FC<RecommendationsProps> = ({
  architecture,
  recommendations,
  onApplyMitigationInSimulator,
}) => {
  const [whatIfResult, setWhatIfResult] = useState<WhatIfComparison | null>(null);
  const [selectedMitigationType, setSelectedMitigationType] = useState<string>('add_db_failover');
  const [isRunningWhatIf, setIsRunningWhatIf] = useState<boolean>(false);

  const handleRunWhatIf = async () => {
    setIsRunningWhatIf(true);
    try {
      const res = await executeWhatIf({
        architecture,
        scenario_id: 'db_outage',
        initiating_resource_id: 'db-aurora-primary',
        mitigation_type: selectedMitigationType,
      });
      setWhatIfResult(res);
    } catch (err: any) {
      alert(`What-If error: ${err.message}`);
    } finally {
      setIsRunningWhatIf(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-400" /> Architectural Recommendations & What-If Studio
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Explore evidence-based resilience improvements and test hypothetical mitigations in the What-If laboratory
          before applying them to live production designs.
        </p>
      </div>

      {/* Interactive What-If Experiment Studio */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/40 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded">
              Laboratory Sandbox
            </span>
            <h2 className="text-lg font-bold text-white mt-1">
              "What-If" Countermeasure Experimentation
            </h2>
            <p className="text-xs text-slate-400">
              Run comparative simulations to quantify the exact risk and blast radius reduction of proposed changes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedMitigationType}
              onChange={(e) => setSelectedMitigationType(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-400"
            >
              <option value="add_db_failover">Hypothesis: Add Multi-AZ Database Failover</option>
              <option value="least_privilege_iam">Hypothesis: Enforce Least-Privilege IAM Boundary</option>
            </select>

            <button
              onClick={handleRunWhatIf}
              disabled={isRunningWhatIf}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
            >
              {isRunningWhatIf ? 'Simulating Delta...' : 'Run Before & After Experiment'}
            </button>
          </div>
        </div>

        {/* What-If Comparative Output */}
        {whatIfResult && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: CRRS Score Reduction */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  CRRS Risk Score Delta
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black font-mono text-rose-400">
                    {whatIfResult.original_crrs}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {whatIfResult.mitigated_crrs}
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-bold block mt-1">
                  ↓ -{round(whatIfResult.original_crrs - whatIfResult.mitigated_crrs, 1)} Risk Points Reduced
                </span>
              </div>

              {/* Card 2: Blast Radius Reduction */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  Blast Radius Impact Delta
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black font-mono text-rose-400">
                    {whatIfResult.original_blast_radius_pct}%
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {whatIfResult.mitigated_blast_radius_pct}%
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-bold block mt-1">
                  ↓ -{round(whatIfResult.original_blast_radius_pct - whatIfResult.mitigated_blast_radius_pct, 1)}% Affected Surface
                </span>
              </div>

              {/* Card 3: Saved Resources */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  Insulated Services
                </span>
                <div className="text-2xl font-black font-mono text-teal-400">
                  {whatIfResult.saved_resources.length} Service(s)
                </div>
                <p className="text-[11px] text-slate-400 mt-1 truncate" title={whatIfResult.saved_resources.join(', ')}>
                  Saved: {whatIfResult.saved_resources.join(', ')}
                </p>
              </div>
            </div>

            {/* Narrative Summary */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans flex items-start justify-between gap-4">
              <p>{whatIfResult.summary}</p>
              <button
                onClick={onApplyMitigationInSimulator}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs shrink-0 transition-all"
              >
                Open Hardened Arch in Simulator
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Prioritized Recommendations Catalog */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" /> Architectural Resilience Recommendations
        </h2>

        {recommendations.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
            Run a simulation to generate tailored recommendations.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between text-xs space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        rec.severity === 'Critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      [{rec.severity}] {rec.category}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">
                      -{rec.expected_risk_reduction_points} CRRS Pts
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-100 mb-1">{rec.title}</h3>
                  <p className="text-slate-300 leading-relaxed mb-3">{rec.problem_statement}</p>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                    <strong className="text-cyan-400 block mb-0.5 text-[10px] uppercase font-mono">
                      Remediation Action:
                    </strong>
                    {rec.solution_description}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Targets: {rec.targeted_resource_ids.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function round(val: number, decimals: number) {
  return Number(Math.round(Number(val + 'e' + decimals)) + 'e-' + decimals);
}

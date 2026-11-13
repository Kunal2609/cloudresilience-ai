import React from 'react';
import {
  BarChart3,
  Shield,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from 'recharts';
import { VirtualArchitecture, CRRSScore } from '../types/cloud';

interface RiskAssessmentProps {
  architecture: VirtualArchitecture;
  crrs: CRRSScore | null;
}

export const RiskAssessment: React.FC<RiskAssessmentProps> = ({ architecture, crrs }) => {
  const factorsData = crrs
    ? crrs.factors.map((f) => ({
        subject: f.name,
        score: f.score,
        weight: `${Math.round(f.weight * 100)}%`,
      }))
    : [
        { subject: 'Criticality', score: 70, weight: '30%' },
        { subject: 'Dependency', score: 60, weight: '25%' },
        { subject: 'Security', score: 55, weight: '25%' },
        { subject: 'Centrality', score: 45, weight: '20%' },
      ];

  const resourceRiskData = crrs
    ? Object.entries(crrs.resource_scores)
        .map(([id, score]) => {
          const res = architecture.resources.find((r) => r.id === id);
          return {
            id,
            name: res ? res.name : id,
            score,
            is_spof: res?.is_spof || false,
          };
        })
        .sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-cyan-400" /> Cloud Resilience Risk Score (CRRS) Assessment
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Mathematically transparent scoring methodology assessing topology criticality, blast radius potential,
          network betweenness centrality, and security exposures.
        </p>
      </div>

      {/* Main Score & Formula Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">
              Architecture CRRS Score
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black font-mono text-cyan-400">
                {crrs ? crrs.overall_score : 58.4}
              </span>
              <span className="text-sm text-slate-400 font-mono">/ 100</span>
            </div>
            <div className="mt-2">
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                  crrs?.risk_category === 'Critical'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : crrs?.risk_category === 'High'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {crrs ? `${crrs.risk_category} Risk Category` : 'High Risk Category'}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
            <span className="text-slate-300 font-semibold block">Deterministic Formulation:</span>
            <p className="font-mono text-[11px] text-cyan-300 bg-slate-950 p-2 rounded border border-slate-800">
              {crrs?.formula_explanation || 'CRRS = 0.3*Crit + 0.25*Dep + 0.25*Sec + 0.2*Cent'}
            </p>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-slate-300 uppercase font-mono mb-2">
            Factor Dimension Radar
          </span>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={factorsData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
                <Radar name="Risk Factor" dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Factor Breakdown List */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase font-mono mb-2">
            Weighted Factor Breakdown
          </span>
          <div className="space-y-3">
            {crrs?.factors.map((f) => (
              <div key={f.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-semibold">
                    {f.name} ({Math.round(f.weight * 100)}%)
                  </span>
                  <span className="text-cyan-400 font-bold">{f.score}/100</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full"
                    style={{ width: `${f.score}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resource-Level Risk Leaderboard */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-base text-slate-100 mb-4">
          Individual Resource Risk Index (Ranked)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {resourceRiskData.map((item) => (
            <div
              key={item.id}
              className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <h4 className="font-bold text-slate-200 truncate max-w-[170px]" title={item.name}>
                    {item.name}
                  </h4>
                  {item.is_spof && (
                    <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[9px] font-bold">
                      SPOF
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-400">{item.id}</span>
              </div>

              <div className="text-right">
                <span className="text-lg font-black font-mono text-cyan-400 block">
                  {item.score}
                </span>
                <span className="text-[9px] text-slate-500 uppercase font-mono">Risk Pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

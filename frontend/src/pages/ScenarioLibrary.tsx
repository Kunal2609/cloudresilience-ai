import React, { useState } from 'react';
import {
  Flame,
  ShieldAlert,
  Server,
  Database,
  HardDrive,
  Layers,
  Network,
  Cpu,
  Play,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { ScenarioDefinition, VirtualArchitecture } from '../types/cloud';

interface ScenarioLibraryProps {
  scenarios: ScenarioDefinition[];
  architecture: VirtualArchitecture;
  onLaunchScenario: (scenarioId: string, resourceId: string) => void;
}

export const ScenarioLibrary: React.FC<ScenarioLibraryProps> = ({
  scenarios,
  architecture,
  onLaunchScenario,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'operational' | 'security'>('all');
  const [targetSelections, setTargetSelections] = useState<Record<string, string>>({});

  const filteredScenarios = scenarios.filter((s) => {
    if (selectedCategory === 'all') return true;
    return s.category === selectedCategory;
  });

  const getTargetForScenario = (scenario: ScenarioDefinition): string => {
    if (targetSelections[scenario.id]) {
      return targetSelections[scenario.id];
    }
    // Pick suitable default resource from architecture
    if (scenario.default_target_type) {
      const match = architecture.resources.find((r) => r.type === scenario.default_target_type);
      if (match) return match.id;
    }
    return architecture.resources[0]?.id || '';
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6 text-slate-100">
      {/* Header & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-rose-500" /> Scenario Library & Injection Templates
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Choose from pre-configured failure modes and adversarial security exploits to simulate on your virtual topology.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedCategory === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Scenarios ({scenarios.length})
          </button>
          <button
            onClick={() => setSelectedCategory('operational')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedCategory === 'operational'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Operational Failures
          </button>
          <button
            onClick={() => setSelectedCategory('security')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedCategory === 'security'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Security & IAM Exploits
          </button>
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredScenarios.map((scenario) => {
          const currentTarget = getTargetForScenario(scenario);
          const isSecurity = scenario.category === 'security';

          return (
            <div
              key={scenario.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all backdrop-blur-md group"
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      isSecurity
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {scenario.category}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">#{scenario.id}</span>
                </div>

                <h3 className="font-bold text-base text-slate-100 group-hover:text-cyan-400 transition-colors mb-2">
                  {scenario.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {scenario.description}
                </p>

                {/* Prerequisites */}
                {scenario.prerequisites.length > 0 && (
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 mb-4 text-[11px] text-slate-400">
                    <strong className="text-slate-300 block mb-0.5 text-[10px] uppercase font-mono">
                      Prerequisites:
                    </strong>
                    {scenario.prerequisites.join(' ')}
                  </div>
                )}
              </div>

              {/* Target Selector & Run Trigger */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Target:</label>
                  <select
                    value={currentTarget}
                    onChange={(e) =>
                      setTargetSelections({
                        ...targetSelections,
                        [scenario.id]: e.target.value,
                      })
                    }
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-400 max-w-[180px] truncate"
                  >
                    {architecture.resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.id})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => onLaunchScenario(scenario.id, currentTarget)}
                  className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl shadow-lg transition-all ${
                    isSecurity
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> Simulate Scenario
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

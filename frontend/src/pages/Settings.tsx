import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Sparkles,
  Database,
  CheckCircle2,
  Save,
  RotateCcw,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [critWeight, setCritWeight] = useState<number>(30);
  const [depWeight, setDepWeight] = useState<number>(25);
  const [secWeight, setSecWeight] = useState<number>(25);
  const [centWeight, setCentWeight] = useState<number>(20);
  const [apiKey, setApiKey] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const totalWeight = critWeight + depWeight + secWeight + centWeight;

  const handleSave = () => {
    setSavedNotice('Settings updated successfully!');
    setTimeout(() => setSavedNotice(null), 2500);
  };

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-cyan-400" /> Platform Configuration & Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Tune the CRRS weighting coefficients, configure LLM narrative endpoints, and review graph database persistence.
        </p>
      </div>

      {savedNotice && (
        <div className="bg-emerald-950 text-emerald-300 border border-emerald-800 p-3 rounded-xl text-xs font-mono">
          ✓ {savedNotice}
        </div>
      )}

      {/* CRRS Risk Scoring Weights */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-100">
              CRRS Weighting Coefficients (Total: {totalWeight}%)
            </h3>
          </div>
          <span className={`text-xs font-mono font-bold ${totalWeight === 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalWeight === 100 ? 'Normalized to 100%' : 'Must equal 100%'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="flex justify-between mb-1 font-mono">
              <span className="text-slate-300">Resource Criticality:</span>
              <span className="text-cyan-400 font-bold">{critWeight}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              value={critWeight}
              onChange={(e) => setCritWeight(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1 font-mono">
              <span className="text-slate-300">Dependency Blast Radius:</span>
              <span className="text-cyan-400 font-bold">{depWeight}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              value={depWeight}
              onChange={(e) => setDepWeight(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1 font-mono">
              <span className="text-slate-300">Security Exposure:</span>
              <span className="text-cyan-400 font-bold">{secWeight}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              value={secWeight}
              onChange={(e) => setSecWeight(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1 font-mono">
              <span className="text-slate-300">Structural Centrality:</span>
              <span className="text-cyan-400 font-bold">{centWeight}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              value={centWeight}
              onChange={(e) => setCentWeight(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* AI Explanation Layer Configuration */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-sm text-slate-100">AI Explanation Engine</h3>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-slate-300">
            CloudResilience AI features a built-in deterministic rule-based explainer that operates without external keys.
            Optionally specify an OpenAI API key below to enable dynamic LLM narrative generation.
          </p>

          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              OpenAI / LLM API Key (Optional)
            </label>
            <input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Persistence Architecture Status */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Database className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-sm text-slate-100">Storage & Graph Backend Status</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block">Relational Persistence</span>
              <span className="text-slate-200 font-bold">SQLite / PostgreSQL ORM</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px]">
              ONLINE
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block">Graph Engine</span>
              <span className="text-slate-200 font-bold">NetworkX + Neo4j Client</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px]">
              ACTIVE
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg"
        >
          <Save className="w-4 h-4" /> Save Configuration
        </button>
      </div>
    </div>
  );
};

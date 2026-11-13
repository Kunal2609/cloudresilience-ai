import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Square,
  Gauge,
  Flame,
  CheckCircle,
} from 'lucide-react';
import { ScenarioDefinition, VirtualResource } from '../../types/cloud';

interface SimulationControlsProps {
  scenarios: ScenarioDefinition[];
  scenario?: ScenarioDefinition;
  resources: VirtualResource[];
  selectedScenarioId: string;
  onSelectScenarioId: (id: string) => void;
  selectedInitiatorId: string;
  onSelectInitiatorId: (id: string) => void;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  currentStep: number;
  totalSteps: number;
  speedMultiplier: number;
  onSetSpeedMultiplier: (speed: number) => void;
  onRun: () => void;
  onPause: () => void;
  onResume: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onStop: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  scenarios,
  scenario,
  resources,
  selectedScenarioId,
  onSelectScenarioId,
  selectedInitiatorId,
  onSelectInitiatorId,
  isRunning,
  isPaused,
  isCompleted,
  currentStep,
  totalSteps,
  speedMultiplier,
  onSetSpeedMultiplier,
  onRun,
  onPause,
  onResume,
  onStepForward,
  onReset,
  onStop,
}) => {
  const progressPercent = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
      {/* Scenario & Target selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-400" /> Scenario
          </label>
          <select
            value={selectedScenarioId}
            onChange={(e) => onSelectScenarioId(e.target.value)}
            disabled={isRunning && !isPaused}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 disabled:opacity-50"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.category})
              </option>
            ))}
          </select>
          {scenario && <p className="text-[9px] text-slate-500 max-w-[250px]">{scenario.description}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
            Epicenter (Initiator)
          </label>
          <select
            value={selectedInitiatorId}
            onChange={(e) => onSelectInitiatorId(e.target.value)}
            disabled={isRunning && !isPaused}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 disabled:opacity-50 min-w-[160px]"
          >
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.id})
              </option>
            ))}
            {!resources.length && <option value="">No compatible resources</option>}
          </select>
          {!resources.length && <p className="text-[9px] text-amber-400 max-w-[200px]">Add a resource supported by this scenario or select another scenario.</p>}
        </div>
      </div>

      {/* Playback action buttons */}
      <div className="flex items-center gap-2">
        {!isRunning ? (
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-cyan-500/20 transition-all transform active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            {currentStep > 0 ? 'Restart Simulation' : 'Run Simulation'}
          </button>
        ) : isPaused ? (
          <button
            onClick={onResume}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> Resume
          </button>
        ) : (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-lg transition-all"
          >
            <Pause className="w-3.5 h-3.5" /> Pause
          </button>
        )}

        {/* Step Forward */}
        <button
          onClick={onStepForward}
          disabled={isRunning && !isPaused}
          title="Execute Next Discrete Step"
          className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg disabled:opacity-40 transition-all"
        >
          <SkipForward className="w-3.5 h-3.5 text-cyan-400" /> Step Forward
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          title="Reset Architecture States"
          className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Reset
        </button>

        {/* Stop */}
        {isRunning && (
          <button
            onClick={onStop}
            title="Stop Simulation"
            className="flex items-center gap-1 px-3 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold rounded-lg transition-all"
          >
            <Square className="w-3.5 h-3.5" /> Stop
          </button>
        )}
      </div>

      {/* Speed & Progress */}
      <div className="flex items-center gap-4">
        {/* Playback Speed */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/70 border border-slate-800 px-2 py-1 rounded-lg">
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] text-slate-400 font-mono">Speed:</span>
          {[0.5, 1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => onSetSpeedMultiplier(spd)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                speedMultiplier === spd
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Progress Badge */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400">
              Step {currentStep}/{totalSteps}
            </span>
            <span
              className={`font-bold ${
                isCompleted
                  ? 'text-emerald-400'
                  : isRunning
                  ? 'text-cyan-400'
                  : 'text-slate-400'
              }`}
            >
              {isCompleted ? 'COMPLETED' : isRunning ? (isPaused ? 'PAUSED' : 'RUNNING') : 'READY'}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

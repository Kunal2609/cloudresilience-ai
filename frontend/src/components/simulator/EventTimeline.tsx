import React from 'react';
import { Clock, ArrowRight, ShieldAlert, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { SimulationStepEvent } from '../../types/cloud';

interface EventTimelineProps {
  events: SimulationStepEvent[];
  activeStep: number;
  onSelectStep: (stepNumber: number) => void;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  events,
  activeStep,
  onSelectStep,
}) => {
  if (events.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-center text-slate-400 text-xs">
        <Clock className="w-6 h-6 mx-auto mb-2 text-slate-600 animate-pulse" />
        No simulation events executed yet. Configure a scenario and click <strong>Run Simulation</strong> or <strong>Step Forward</strong>.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur-md flex flex-col h-full max-h-[380px]">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
        <span className="font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <Zap className="w-3.5 h-3.5 text-cyan-400" /> Event Timeline ({events.length} Steps)
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          Click step to scrub
        </span>
      </div>

      <div className="overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {events.map((evt) => {
          const isActive = evt.step_number === activeStep;
          const isPassed = evt.step_number <= activeStep;

          return (
            <div
              key={evt.step_number}
              onClick={() => onSelectStep(evt.step_number)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer text-xs ${
                isActive
                  ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_12px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400'
                  : isPassed
                  ? 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                  : 'border-slate-800/40 bg-slate-950/30 opacity-60'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] font-bold text-cyan-400">
                  Step #{evt.step_number} (+{evt.timestamp_offset_ms}ms)
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {evt.event_type.replace('_', ' ')}
                </span>
              </div>

              {/* Source -> Target */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-200 mb-1">
                <span className="truncate max-w-[90px] font-semibold text-slate-300" title={evt.source_resource_id}>
                  {evt.source_resource_id}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate max-w-[90px] font-semibold text-slate-100" title={evt.target_resource_id}>
                  {evt.target_resource_id}
                </span>
                {evt.relationship_type && (
                  <span className="text-[9px] text-blue-400 font-bold ml-auto shrink-0">
                    [{evt.relationship_type}]
                  </span>
                )}
              </div>

              {/* State Transition */}
              <div className="flex items-center gap-1 text-[10px] mb-1">
                <span className="text-slate-400 capitalize">{evt.previous_state}</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                <span
                  className={`font-bold uppercase ${
                    evt.new_state === 'failed'
                      ? 'text-rose-400'
                      : evt.new_state === 'degraded'
                      ? 'text-amber-400'
                      : evt.new_state === 'compromised'
                      ? 'text-purple-400'
                      : evt.new_state === 'recovered'
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }`}
                >
                  {evt.new_state}
                </span>
              </div>

              {/* Reason */}
              <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed font-sans">
                {evt.reason}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  Info,
  Server,
  Shield,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Share2,
  ShieldAlert,
  ArrowRightLeft,
  X,
} from 'lucide-react';
import { VirtualResource, VirtualEdge, SimulationStepEvent, CriticalityLevel, ResourceState, SecurityExposure } from '../../types/cloud';

interface ResourceInspectorProps {
  resource: VirtualResource | null;
  edges: VirtualEdge[];
  allResources: VirtualResource[];
  events: SimulationStepEvent[];
  onClose: () => void;
  onSave: (resource: VirtualResource) => Promise<void>;
  onDelete: (resourceId: string) => Promise<void>;
}

export const ResourceInspector: React.FC<ResourceInspectorProps> = ({
  resource,
  edges,
  allResources,
  events,
  onClose,
  onSave,
  onDelete,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<VirtualResource | null>(resource);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => { setDraft(resource); setEditing(false); setEditError(''); }, [resource?.id]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (editing && draft && resource && JSON.stringify(draft) !== JSON.stringify(resource)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [draft, editing, resource]);

  const updateDraft = (patch: Partial<VirtualResource>) => setDraft((current) => current ? { ...current, ...patch } : current);
  const fieldClass = 'w-full bg-slate-950 border border-slate-700 text-slate-100 rounded px-2 py-1.5 text-[11px]';
  const fieldLabel = 'text-[9px] text-slate-400 uppercase font-mono block mb-1';
  if (!resource) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-center text-slate-400 text-xs shadow-xl backdrop-blur-md">
        <Info className="w-6 h-6 mx-auto mb-2 text-slate-600" />
        Select any cloud resource node on the canvas to inspect its simulated state, dependencies, and blast impact.
      </div>
    );
  }

  // Find upstream dependencies (who this resource depends on)
  const upstreamEdges = edges.filter((e) => e.source === resource.id);
  // Find downstream dependents (who depends on this resource)
  const downstreamEdges = edges.filter((e) => e.target === resource.id);

  // Find events that affected this resource
  const affectingEvents = events.filter((e) => e.target_resource_id === resource.id);
  const primaryIncident = events.find(
    (e) => e.source_resource_id === resource.id && e.target_resource_id === resource.id
  );

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-2xl backdrop-blur-md flex flex-col h-full max-h-[500px] text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase font-bold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60">
              {resource.type.replace('_', ' ')}
            </span>
            <span className="font-mono text-[10px] text-slate-400">{resource.id}</span>
          </div>
          <h3 className="font-bold text-sm text-slate-100 mt-0.5 truncate max-w-[240px]">
            {resource.name}
          </h3>
        </div>
        <div className="flex items-center gap-1">
        {!editing ? <button onClick={() => { setDraft(resource); setEditing(true); }} className="px-2 py-1 bg-cyan-950 border border-cyan-800 text-cyan-300 rounded text-[10px] font-bold">Edit</button> : null}
        <button
          onClick={() => {
            if (editing && draft && JSON.stringify(draft) !== JSON.stringify(resource) && !window.confirm('Discard unsaved resource edits?')) return;
            onClose();
          }}
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-all"
        >
          <X className="w-4 h-4" />
        </button>
        </div>
      </div>

      <div className="overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {editing && draft && <div className="bg-slate-950 p-2.5 rounded-lg border border-cyan-900 space-y-2">
          <div><label className={fieldLabel}>Name</label><input className={fieldClass} value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={fieldLabel}>Provider</label><select className={fieldClass} value={draft.provider || 'aws'} onChange={(e) => updateDraft({ provider: e.target.value })}><option value="aws">AWS</option><option value="azure">Azure</option><option value="gcp">GCP</option><option value="generic">Generic</option></select></div>
            <div><label className={fieldLabel}>Status</label><select className={fieldClass} value={draft.state} onChange={(e) => updateDraft({ state: e.target.value as ResourceState })}><option value="healthy">Healthy</option><option value="degraded">Degraded</option><option value="failed">Failed</option><option value="compromised">Compromised</option><option value="isolated">Isolated</option><option value="recovering">Recovering</option><option value="recovered">Recovered</option></select></div>
            <div><label className={fieldLabel}>Criticality</label><select className={fieldClass} value={draft.criticality} onChange={(e) => updateDraft({ criticality: e.target.value as CriticalityLevel })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
            <div><label className={fieldLabel}>Exposure</label><select className={fieldClass} value={draft.security_exposure} onChange={(e) => updateDraft({ security_exposure: e.target.value as SecurityExposure })}><option value="internal">Internal</option><option value="restricted">Restricted</option><option value="public">Public</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-2"><div><label className={fieldLabel}>Region</label><input className={fieldClass} value={draft.region} onChange={(e) => updateDraft({ region: e.target.value })} /></div><div><label className={fieldLabel}>Availability zone</label><input className={fieldClass} value={draft.az || ''} onChange={(e) => updateDraft({ az: e.target.value || undefined })} /></div></div>
          <div><label className={fieldLabel}>Network / VPC</label><input className={fieldClass} value={draft.vpc_id || ''} onChange={(e) => updateDraft({ vpc_id: e.target.value || undefined })} /></div>
          {(draft.type === 'compute_ec2' || draft.type === 'app_service' || draft.type === 'microservice' || draft.type === 'backup_resource') && <>
            <div><label className={fieldLabel}>Instance size</label><input className={fieldClass} value={draft.config.instance_type || ''} onChange={(e) => updateDraft({ config: { ...draft.config, instance_type: e.target.value } })} /></div>
            <div className="grid grid-cols-2 gap-2"><div><label className={fieldLabel}>CPU cores</label><input type="number" min="0" className={fieldClass} value={draft.config.cpu ?? ''} onChange={(e) => updateDraft({ config: { ...draft.config, cpu: Number(e.target.value) } })} /></div><div><label className={fieldLabel}>Memory (GB)</label><input type="number" min="0" step="0.5" className={fieldClass} value={draft.config.memory_gb ?? ''} onChange={(e) => updateDraft({ config: { ...draft.config, memory_gb: Number(e.target.value) } })} /></div></div>
          </>}
          <div className="grid grid-cols-2 gap-2"><div><label className={fieldLabel}>RTO (minutes)</label><input type="number" min="0" className={fieldClass} value={draft.rto_minutes} onChange={(e) => updateDraft({ rto_minutes: Number(e.target.value) })} /></div><div><label className={fieldLabel}>RPO (minutes)</label><input type="number" min="0" className={fieldClass} value={draft.rpo_minutes} onChange={(e) => updateDraft({ rpo_minutes: Number(e.target.value) })} /></div></div>
          {editError && <p role="alert" className="text-rose-300 text-[10px]">{editError}</p>}
          <div className="flex justify-between"><button disabled={saving} onClick={async () => { setSaving(true); setEditError(''); try { await onDelete(resource.id); } catch (error) { setEditError(error instanceof Error ? error.message : 'Delete failed.'); } finally { setSaving(false); } }} className="px-2 py-1.5 bg-rose-950 border border-rose-900 text-rose-300 rounded text-[10px] font-bold">Delete</button><div className="flex gap-1.5"><button disabled={saving} onClick={() => { if (JSON.stringify(draft) !== JSON.stringify(resource) && !window.confirm('Discard unsaved resource edits?')) return; setDraft(resource); setEditing(false); }} className="px-2 py-1.5 bg-slate-800 text-slate-300 rounded text-[10px]">Cancel</button><button disabled={saving || !draft.name.trim()} onClick={async () => { setSaving(true); setEditError(''); try { await onSave(draft); setEditing(false); } catch (error) { setEditError(error instanceof Error ? error.message : 'Save failed.'); } finally { setSaving(false); } }} className="px-2 py-1.5 bg-cyan-600 text-white rounded text-[10px] font-bold">{saving ? 'Saving…' : 'Save changes'}</button></div></div>
        </div>}
        {/* Current State & Epicenter Alert */}
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Simulated State:</span>
            <span
              className={`font-bold uppercase text-xs px-2 py-0.5 rounded ${
                resource.state === 'failed'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : resource.state === 'degraded'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : resource.state === 'compromised'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : resource.state === 'recovered'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {resource.state}
            </span>
          </div>

          {/* Root cause reason if affected */}
          {affectingEvents.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
              <span className="text-[10px] font-bold text-amber-400 uppercase block mb-0.5">
                ⚡ Impact Rationale:
              </span>
              <p className="leading-relaxed bg-slate-900 p-2 rounded border border-slate-800">
                {affectingEvents[affectingEvents.length - 1].reason}
              </p>
            </div>
          )}
        </div>

        {/* SLA & Risk Specs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Criticality Level</span>
            <span className="font-bold text-slate-200 uppercase">{resource.criticality}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Security Exposure</span>
            <span className="font-bold text-slate-200 uppercase">{resource.security_exposure}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Target RTO</span>
            <span className="font-bold text-slate-200">{resource.rto_minutes} min</span>
          </div>
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Target RPO</span>
            <span className="font-bold text-slate-200">{resource.rpo_minutes} min</span>
          </div>
        </div>

        {/* Redundancy & SPOF Status */}
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Single Point of Failure:</span>
            <span className={`font-bold ${resource.is_spof ? 'text-rose-400' : 'text-emerald-400'}`}>
              {resource.is_spof ? 'YES (Vulnerable)' : 'No (Protected)'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Automated Redundancy:</span>
            <span className={`font-bold ${resource.has_redundancy ? 'text-emerald-400' : 'text-slate-400'}`}>
              {resource.has_redundancy ? 'Configured (Active)' : 'None'}
            </span>
          </div>
          {resource.redundant_target_id && (
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              Standby Target: <strong className="text-cyan-300 font-mono">{resource.redundant_target_id}</strong>
            </div>
          )}
        </div>

        {/* Directed Dependencies */}
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1.5">
            Outgoing Dependencies ({upstreamEdges.length})
          </span>
          {upstreamEdges.length === 0 ? (
            <span className="text-[11px] text-slate-500 italic">No outgoing dependencies</span>
          ) : (
            <div className="space-y-1">
              {upstreamEdges.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-[11px] p-1 bg-slate-900 rounded border border-slate-800/60 font-mono">
                  <span className="text-slate-300 truncate max-w-[140px]">{e.target}</span>
                  <span className="text-[9px] text-blue-400 font-bold uppercase">{e.relationship}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Downstream Dependents */}
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1.5">
            Incoming Dependents ({downstreamEdges.length})
          </span>
          {downstreamEdges.length === 0 ? (
            <span className="text-[11px] text-slate-500 italic">No incoming dependents</span>
          ) : (
            <div className="space-y-1">
              {downstreamEdges.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-[11px] p-1 bg-slate-900 rounded border border-slate-800/60 font-mono">
                  <span className="text-slate-300 truncate max-w-[140px]">{e.source}</span>
                  <span className="text-[9px] text-cyan-400 font-bold uppercase">{e.relationship}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

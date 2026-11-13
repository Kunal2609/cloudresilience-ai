import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { CriticalityLevel, ResourceState, ResourceType, SecurityExposure, VirtualResource } from '../../types/cloud';

export const RESOURCE_TYPES: { type: ResourceType; label: string }[] = [
  { type: 'compute_ec2', label: 'EC2 Instance / Virtual Machine' },
  { type: 'app_service', label: 'Application Server' },
  { type: 'microservice', label: 'Microservice' },
  { type: 'load_balancer', label: 'Load Balancer' },
  { type: 'database', label: 'Database' },
  { type: 'storage_s3', label: 'S3 Bucket / Object Storage' },
  { type: 'iam_role', label: 'IAM Role' },
  { type: 'vpc', label: 'VPC / Network' },
  { type: 'az', label: 'Availability Zone' },
  { type: 'region', label: 'Cloud Region' },
  { type: 'api_gateway', label: 'API Gateway' },
  { type: 'message_queue', label: 'Message Queue' },
  { type: 'backup_resource', label: 'Backup Instance' },
];

const newId = () => `res-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

interface ResourceFormProps {
  onClose: () => void;
  onCreate: (resource: VirtualResource) => Promise<void>;
  existingIds: string[];
  existingPositions: Array<{ x: number; y: number }>;
}

export const ResourceForm: React.FC<ResourceFormProps> = ({ onClose, onCreate, existingIds, existingPositions }) => {
  const [type, setType] = useState<ResourceType>('compute_ec2');
  const [id] = useState(newId);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('aws');
  const [region, setRegion] = useState('us-east-1');
  const [az, setAz] = useState('us-east-1a');
  const [instanceType, setInstanceType] = useState('t3.micro');
  const [cpu, setCpu] = useState('2');
  const [memory, setMemory] = useState('4');
  const [criticality, setCriticality] = useState<CriticalityLevel>('high');
  const [state, setState] = useState<ResourceState>('healthy');
  const [exposure, setExposure] = useState<SecurityExposure>('internal');
  const [rto, setRto] = useState('60');
  const [rpo, setRpo] = useState('15');
  const [vpcId, setVpcId] = useState('');
  const [extra, setExtra] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const label = useMemo(() => RESOURCE_TYPES.find((item) => item.type === type)?.label ?? type, [type]);
  const compute = type === 'compute_ec2' || type === 'app_service' || type === 'microservice' || type === 'backup_resource';

  const fieldClass = 'w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400';
  const labelClass = 'text-[10px] text-slate-400 uppercase font-mono block mb-1';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError('Enter a resource name.'); return; }
    if (existingIds.includes(id)) { setError('The generated resource ID already exists. Close and reopen the form to generate another ID.'); return; }
    const rtoValue = Number(rto || 0);
    const rpoValue = Number(rpo || 0);
    if (!Number.isFinite(rtoValue) || rtoValue < 0 || !Number.isFinite(rpoValue) || rpoValue < 0) {
      setError('RTO and RPO must be zero or a positive number.'); return;
    }
    const config: Record<string, any> = {};
    if (compute) {
      config.instance_type = instanceType.trim() || undefined;
      if (cpu) config.cpu = Number(cpu);
      if (memory) config.memory_gb = Number(memory);
    } else if (type === 'database') config.engine = extra.trim() || 'PostgreSQL';
    else if (type === 'storage_s3') config.bucket_class = extra.trim() || 'standard';
    else if (type === 'iam_role') config.trust_policy = extra.trim() || undefined;
    else if (type === 'vpc') config.cidr = extra.trim() || undefined;
    else if (type === 'message_queue') config.queue_type = extra.trim() || 'standard';
    else if (type === 'api_gateway') config.protocol = extra.trim() || 'HTTPS';
    else if (type === 'load_balancer') config.scheme = extra.trim() || 'internal';

    const candidate = Array.from({ length: 100 }, (_, index) => ({ x: 220 + (index % 5) * 230, y: 140 + Math.floor(index / 5) * 170 }))
      .find((point) => existingPositions.every((position) => Math.abs(position.x - point.x) > 150 || Math.abs(position.y - point.y) > 90))
      ?? { x: 220, y: 140 };
    const resource: VirtualResource = {
      id, name: name.trim(), type, provider, region: region.trim(), az: az.trim() || undefined,
      vpc_id: vpcId.trim() || undefined, criticality, state, security_exposure: exposure,
      rto_minutes: rtoValue, rpo_minutes: rpoValue, has_redundancy: false, is_spof: false,
      position_x: candidate.x,
      position_y: candidate.y,
      config, metadata: {},
    };
    setSaving(true); setError('');
    try { await onCreate(resource); }
    catch (err) { setError(err instanceof Error ? err.message : 'Resource creation failed.'); }
    finally { setSaving(false); }
  };

  const extraLabel: Partial<Record<ResourceType, string>> = {
    database: 'Database engine', storage_s3: 'Storage class', iam_role: 'Trust policy', vpc: 'CIDR range',
    message_queue: 'Queue type', api_gateway: 'Protocol', load_balancer: 'Load balancer scheme',
  };

  return <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="resource-form-title">
    <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <div><h3 id="resource-form-title" className="font-bold text-base text-slate-100">Add Resource</h3><p className="text-[11px] text-slate-400 mt-1">Virtual simulation object · no cloud account required</p></div>
        <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-slate-400 hover:bg-slate-800"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2"><label className={labelClass}>Resource type</label><select className={fieldClass} value={type} onChange={(e) => setType(e.target.value as ResourceType)}>{RESOURCE_TYPES.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select></div>
        <div><label className={labelClass}>Name *</label><input autoFocus className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Web-Server-01" required /></div>
        <div><label className={labelClass}>Generated resource ID</label><input className={`${fieldClass} font-mono text-slate-400`} value={id} readOnly /></div>
        <div><label className={labelClass}>Cloud provider</label><select className={fieldClass} value={provider} onChange={(e) => setProvider(e.target.value)}><option value="aws">AWS</option><option value="azure">Azure</option><option value="gcp">GCP</option><option value="generic">Generic</option></select></div>
        <div><label className={labelClass}>Region</label><input className={fieldClass} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="us-east-1" /></div>
        <div><label className={labelClass}>Availability zone</label><input className={fieldClass} value={az} onChange={(e) => setAz(e.target.value)} placeholder="Optional" /></div>
        <div><label className={labelClass}>Network / VPC ID</label><input className={fieldClass} value={vpcId} onChange={(e) => setVpcId(e.target.value)} placeholder="Optional" /></div>
        {compute && <>
          <div><label className={labelClass}>{type === 'compute_ec2' ? 'Instance type / size' : 'Compute size'}</label><input className={fieldClass} value={instanceType} onChange={(e) => setInstanceType(e.target.value)} placeholder="t3.micro" /></div>
          <div className="grid grid-cols-2 gap-2"><div><label className={labelClass}>CPU cores</label><input type="number" min="0" className={fieldClass} value={cpu} onChange={(e) => setCpu(e.target.value)} /></div><div><label className={labelClass}>Memory (GB)</label><input type="number" min="0" step="0.5" className={fieldClass} value={memory} onChange={(e) => setMemory(e.target.value)} /></div></div>
        </>}
        {extraLabel[type] && <div className="md:col-span-2"><label className={labelClass}>{extraLabel[type]}</label><input className={fieldClass} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Optional" /></div>}
        <div><label className={labelClass}>Operating status</label><select className={fieldClass} value={state} onChange={(e) => setState(e.target.value as ResourceState)}><option value="healthy">Healthy</option><option value="degraded">Degraded</option><option value="failed">Failed</option></select></div>
        <div><label className={labelClass}>Criticality</label><select className={fieldClass} value={criticality} onChange={(e) => setCriticality(e.target.value as CriticalityLevel)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
        <div><label className={labelClass}>Security exposure</label><select className={fieldClass} value={exposure} onChange={(e) => setExposure(e.target.value as SecurityExposure)}><option value="internal">Internal</option><option value="restricted">Restricted</option><option value="public">Public</option></select></div>
        <div className="grid grid-cols-2 gap-2"><div><label className={labelClass}>RTO (minutes)</label><input type="number" min="0" className={fieldClass} value={rto} onChange={(e) => setRto(e.target.value)} /></div><div><label className={labelClass}>RPO (minutes)</label><input type="number" min="0" className={fieldClass} value={rpo} onChange={(e) => setRpo(e.target.value)} /></div></div>
      </div>
      {error && <p role="alert" className="mt-3 p-2 rounded-lg bg-rose-950/50 border border-rose-900 text-rose-300 text-xs">{error}</p>}
      <div className="flex justify-end gap-2 mt-5"><button type="button" onClick={onClose} className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg">Cancel</button><button disabled={saving} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg">{saving ? 'Saving…' : `Create ${label}`}</button></div>
    </form>
  </div>;
};

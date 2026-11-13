import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Plus,
  Save,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RotateCcw,
  Layers,
  Cpu,
  Server,
  Database,
  HardDrive,
  KeyRound,
  Network,
  Radio,
  Archive,
} from 'lucide-react';
import {
  VirtualArchitecture,
  VirtualResource,
  VirtualEdge,
  ResourceType,
  RelationshipType,
  CriticalityLevel,
  SecurityExposure,
  ResourceState,
} from '../types/cloud';
import { CloudResourceNode } from '../components/nodes/CloudResourceNode';
import { CloudRelationshipEdge } from '../components/edges/CloudRelationshipEdge';
import { saveArchitecture, validateArchitecture } from '../services/api';
import { ResourceForm } from '../components/simulator/ResourceForm';

interface ArchitectureBuilderProps {
  architecture: VirtualArchitecture;
  onUpdateArchitecture: (arch: VirtualArchitecture) => void;
  onResetToSample: (type: 'unmitigated' | 'mitigated') => void;
}

export const ArchitectureBuilder: React.FC<ArchitectureBuilderProps> = ({
  architecture,
  onUpdateArchitecture,
  onResetToSample,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeDescription, setEdgeDescription] = useState('');
  const [edgeStrength, setEdgeStrength] = useState('');
  const [edgeValidationError, setEdgeValidationError] = useState('');
  const savedSnapshot = useRef(JSON.stringify(architecture));
  const savedRevision = useRef(`${architecture.id}:${architecture.version}`);

  useEffect(() => {
    const revision = `${architecture.id}:${architecture.version}`;
    if (revision !== savedRevision.current) {
      savedRevision.current = revision;
      savedSnapshot.current = JSON.stringify(architecture);
    }
  }, [architecture]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (JSON.stringify(architecture) !== savedSnapshot.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [architecture]);

  // New edge connection modal state
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<RelationshipType>('DEPENDS_ON');

  const nodeTypes = useMemo(() => ({ cloudResource: CloudResourceNode }), []);
  const edgeTypes = useMemo(() => ({ cloudRelationship: CloudRelationshipEdge }), []);

  // Map resources to nodes
  const nodes: Node[] = useMemo(
    () =>
      architecture.resources.map((res) => ({
        id: res.id,
        type: 'cloudResource',
        position: { x: res.position_x, y: res.position_y },
        data: {
          resource: res,
          isSelected: res.id === selectedNodeId,
        },
      })),
    [architecture.resources, selectedNodeId]
  );

  const edges: Edge[] = useMemo(
    () =>
      architecture.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'cloudRelationship',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
        animated: edge.relationship === 'FAILOVER_TO',
        data: {
          relationship: edge.relationship,
          permission_level: edge.permission_level,
          latency_ms: edge.latency_ms,
          description: edge.description,
          dependency_strength: edge.dependency_strength,
          propagation_rules: edge.propagation_rules,
        },
      })),
    [architecture.edges]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Apply position updates to architecture resources
      let updatedResources = architecture.resources;
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updatedResources = updatedResources.map((resource) => resource.id === change.id
            ? { ...resource, position_x: change.position!.x, position_y: change.position!.y }
            : resource);
        }
      });
      onUpdateArchitecture({ ...architecture, resources: updatedResources });
    },
    [architecture, onUpdateArchitecture]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      let updatedEdges = [...architecture.edges];
      changes.forEach((change) => {
        if (change.type === 'remove') {
          updatedEdges = updatedEdges.filter((e) => e.id !== change.id);
        }
      });
      onUpdateArchitecture({ ...architecture, edges: updatedEdges });
    },
    [architecture, onUpdateArchitecture]
  );

  const onConnect = useCallback((connection: Connection) => {
    setEdgeDescription('');
    setEdgeStrength('');
    setEdgeValidationError('');
    setSelectedRelationshipType('DEPENDS_ON');
    setPendingConnection(connection);
  }, []);

  const handleConfirmAddEdge = () => {
    if (!pendingConnection || !pendingConnection.source || !pendingConnection.target) return;
    if (pendingConnection.source === pendingConnection.target) { setEdgeValidationError('A resource cannot connect to itself.'); return; }
    if (architecture.edges.some((edge) => edge.source === pendingConnection.source && edge.target === pendingConnection.target && edge.relationship === selectedRelationshipType)) { setEdgeValidationError('This relationship already exists.'); return; }

    const newEdge: VirtualEdge = {
      id: `edge-${Date.now()}`,
      source: pendingConnection.source,
      target: pendingConnection.target,
      relationship: selectedRelationshipType,
      is_active: true,
      latency_ms: 5,
      description: edgeDescription.trim() || undefined,
      dependency_strength: edgeStrength ? Number(edgeStrength) : undefined,
      propagation_rules: {},
    };

    onUpdateArchitecture({
      ...architecture,
      edges: [...architecture.edges, newEdge],
    });
    setPendingConnection(null);
    setEdgeDescription('');
    setEdgeStrength('');
    setEdgeValidationError('');
  };

  // Add new resource from palette
  const handleCreateResource = async (newRes: VirtualResource) => {
    const next = { ...architecture, resources: [...architecture.resources, newRes] };
    const saved = await saveArchitecture(next);
    onUpdateArchitecture(saved);
    setSelectedNodeId(newRes.id);
    setShowResourceForm(false);
    setSaveStatus('Resource created and architecture saved.');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const handleDeleteSelected = async () => {
    if (!selectedNodeId) return;
    const resource = architecture.resources.find((r) => r.id === selectedNodeId);
    if (!window.confirm(`Delete ${resource?.name ?? 'this resource'} and its connected relationships?`)) return;
    const updatedResources = architecture.resources.filter((r) => r.id !== selectedNodeId);
    const updatedEdges = architecture.edges.filter(
      (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
    );
    const next = {
      ...architecture,
      resources: updatedResources,
      edges: updatedEdges,
    };
    try {
      const saved = await saveArchitecture(next);
      onUpdateArchitecture(saved);
      setSaveStatus('Resource and relationships deleted.');
    } catch (err: any) { setSaveStatus(`Delete failed: ${err.message}`); return; }
    setSelectedNodeId(null);
  };

  const handleSave = async () => {
    setSaveStatus('Saving...');
    try {
      const saved = await saveArchitecture(architecture);
      onUpdateArchitecture(saved);
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err: any) {
      setSaveStatus(`Save failed: ${err.message}`);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const res = await validateArchitecture(architecture);
      setValidationResult(res);
    } catch (err: any) {
      alert(`Validation error: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(architecture, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `${architecture.id || 'architecture'}.json`);
    dlAnchorElem.click();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 5 * 1024 * 1024) {
      setSaveStatus('Import failed: JSON file must be 5 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as VirtualArchitecture;
        if (!parsed || !Array.isArray(parsed.resources) || !Array.isArray(parsed.edges)) {
          throw new Error('Expected an architecture with resources and edges arrays.');
        }
        const imported: VirtualArchitecture = {
          ...parsed,
          id: `arch-${crypto.randomUUID()}`,
          name: parsed.name?.trim() || file.name.replace(/\.json$/i, ''),
          version: 1,
        };
        const validation = await validateArchitecture(imported);
        if (validation.errors?.length) {
          throw new Error(validation.errors.join(' '));
        }
        const saved = await saveArchitecture(imported);
        onUpdateArchitecture(saved);
        setSelectedNodeId(null);
        setValidationResult(validation);
        setSaveStatus('Imported architecture validated and saved.');
        window.setTimeout(() => setSaveStatus(null), 3500);
      } catch (err) {
        setSaveStatus(`Import failed: ${err instanceof Error ? err.message : 'Invalid architecture JSON.'}`);
      }
    };
    reader.readAsText(file);
  };

  const selectedResource = architecture.resources.find((r) => r.id === selectedNodeId);
  const selectedEdge = architecture.edges.find((edge) => edge.id === selectedEdgeId);
  const updateResource = (patch: Partial<VirtualResource>) => {
    if (!selectedResource) return;
    onUpdateArchitecture({
      ...architecture,
      resources: architecture.resources.map((resource) => resource.id === selectedResource.id ? { ...resource, ...patch } : resource),
    });
  };
  const saveEdgeEdits = () => {
    if (!selectedEdge) return;
    onUpdateArchitecture({ ...architecture, edges: architecture.edges.map((edge) => edge.id === selectedEdge.id
      ? { ...edge, relationship: selectedRelationshipType, description: edgeDescription.trim() || undefined,
        dependency_strength: edgeStrength ? Number(edgeStrength) : undefined }
      : edge) });
    setSelectedEdgeId(null);
  };
  const deleteSelectedEdge = () => {
    if (!selectedEdge) return;
    onUpdateArchitecture({ ...architecture, edges: architecture.edges.filter((edge) => edge.id !== selectedEdge.id) });
    setSelectedEdgeId(null);
  };

  return (
    <div className="relative w-full h-[calc(100vh-65px)] flex flex-col bg-slate-950 overflow-hidden text-slate-100">
      {/* Top Builder Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={architecture.name}
            onChange={(e) => onUpdateArchitecture({ ...architecture, name: e.target.value })}
            className="bg-slate-950 border border-slate-700 text-slate-100 text-sm font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 w-80 truncate"
          />
          <span className="text-xs text-slate-400 font-mono">v{architecture.version}</span>
          <span className="text-[10px] text-slate-500 font-mono">{architecture.resources.length} resources · {architecture.edges.length} relationships</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResourceForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md"
          >
            <Plus className="w-3.5 h-3.5" /> Add Resource
          </button>
          <button
            onClick={handleValidate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-lg border border-slate-700"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Validate Topology
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-md"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Import
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
          <button
            onClick={() => onResetToSample('unmitigated')}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Default
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="absolute top-16 right-4 z-50 bg-cyan-950 text-cyan-300 border border-cyan-800 px-3 py-1.5 rounded-lg text-xs font-mono shadow-xl animate-bounce">
          {saveStatus}
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="relative flex-1 w-full h-full flex">
        {/* Left Palette: Cloud Resource Library */}
        <div className="w-64 bg-slate-900/95 border-r border-slate-800 p-3 overflow-y-auto z-10 shrink-0 text-xs custom-scrollbar">
          <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block mb-2">
            Resource Types
          </span>

          <div className="space-y-1.5">
            {[
              { type: 'compute_ec2', label: 'EC2 Virtual Compute', icon: Cpu, color: 'text-sky-400' },
                { type: 'app_service', label: 'Application Server', icon: Server, color: 'text-blue-400' },
                { type: 'microservice', label: 'Microservice', icon: Server, color: 'text-blue-300' },
              { type: 'database', label: 'Relational Database', icon: Database, color: 'text-amber-400' },
              { type: 'backup_resource', label: 'Standby / Backup Replica', icon: Archive, color: 'text-teal-400' },
              { type: 'storage_s3', label: 'Object Storage (S3)', icon: HardDrive, color: 'text-emerald-400' },
              { type: 'iam_role', label: 'IAM Role / Identity', icon: KeyRound, color: 'text-purple-400' },
              { type: 'load_balancer', label: 'Application Load Balancer', icon: Network, color: 'text-indigo-400' },
              { type: 'api_gateway', label: 'API Gateway (Edge)', icon: Radio, color: 'text-cyan-400' },
              { type: 'message_queue', label: 'Message Queue (SQS)', icon: Layers, color: 'text-yellow-400' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  onClick={() => setShowResourceForm(true)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span className="font-semibold text-slate-200">{item.label}</span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                </button>
              );
            })}
          </div>

          {/* Validation Feedback Box */}
          {validationResult && (
            <div className="mt-4 p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
              <div className="flex items-center justify-between font-bold">
                <span className={validationResult.is_valid ? 'text-emerald-400' : 'text-rose-400'}>
                  {validationResult.is_valid ? '✓ Topology Valid' : '❌ Validation Issues'}
                </span>
              </div>
              {validationResult.warnings.map((w: string, i: number) => (
                <p key={i} className="text-amber-400 text-[10px] leading-tight">
                  ⚠️ {w}
                </p>
              ))}
              {validationResult.errors.map((e: string, i: number) => (
                <p key={i} className="text-rose-400 text-[10px] leading-tight">
                  ❌ {e}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Central React Flow Canvas */}
        <div className="flex-1 relative h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={(_, edge) => {
              setSelectedEdgeId(edge.id);
              const resourceEdge = architecture.edges.find((item) => item.id === edge.id);
              if (resourceEdge) {
                setSelectedRelationshipType(resourceEdge.relationship);
                setEdgeDescription(resourceEdge.description || '');
                setEdgeStrength(resourceEdge.dependency_strength == null ? '' : String(resourceEdge.dependency_strength));
              }
            }}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            colorMode="dark"
            className="bg-[#080c14]"
          >
            <Background color="#1e293b" gap={24} size={1} />
            <Controls className="!bg-slate-900 !border-slate-800 !text-slate-200" />
            <MiniMap nodeColor="#334155" maskColor="rgba(8, 12, 20, 0.7)" />
          </ReactFlow>
        </div>

        {/* Right Properties Panel for Selected Resource */}
        {selectedResource && (
          <div className="w-80 bg-slate-900/95 border-l border-slate-800 p-4 overflow-y-auto z-10 shrink-0 text-xs custom-scrollbar">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 truncate">Configure Resource</h3>
              <button
                onClick={handleDeleteSelected}
                className="p-1 text-rose-400 hover:bg-rose-950/50 rounded flex items-center gap-1 text-[10px] font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Name</label>
                <input
                  type="text"
                  value={selectedResource.name}
                  onChange={(e) => {
                    const updated = architecture.resources.map((r) =>
                      r.id === selectedResource.id ? { ...r, name: e.target.value } : r
                    );
                    onUpdateArchitecture({ ...architecture, resources: updated });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">ID</label>
                <input
                  type="text"
                  value={selectedResource.id}
                  disabled
                  className="w-full bg-slate-950/60 border border-slate-800 text-slate-400 rounded p-1.5 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Provider</label>
                  <select value={selectedResource.provider || 'aws'} onChange={(e) => updateResource({ provider: e.target.value })} className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1.5">
                    <option value="aws">AWS</option><option value="azure">Azure</option><option value="gcp">GCP</option><option value="generic">Generic</option>
                  </select>
                </div>
                <div><label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Operating state</label>
                  <select value={selectedResource.state} onChange={(e) => updateResource({ state: e.target.value as ResourceState })} className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1.5">
                    <option value="healthy">Healthy</option><option value="degraded">Degraded</option><option value="failed">Failed</option><option value="compromised">Compromised</option><option value="isolated">Isolated</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Region</label><input value={selectedResource.region} onChange={(e) => updateResource({ region: e.target.value })} className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1.5" /></div>
                <div><label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Availability zone</label><input value={selectedResource.az || ''} onChange={(e) => updateResource({ az: e.target.value || undefined })} className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1.5" /></div>
              </div>
              <div><label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Network / VPC</label><input value={selectedResource.vpc_id || ''} onChange={(e) => updateResource({ vpc_id: e.target.value || undefined })} className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1.5" /></div>
              {(selectedResource.type === 'compute_ec2' || selectedResource.type === 'app_service' || selectedResource.type === 'microservice' || selectedResource.type === 'backup_resource') && <>
                <div><label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Instance size</label><input value={selectedResource.config.instance_type || ''} onChange={(e) => updateResource({ config: { ...selectedResource.config, instance_type: e.target.value } })} className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1.5" /></div>
                <div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">CPU cores</label><input type="number" min="0" value={selectedResource.config.cpu ?? ''} onChange={(e) => updateResource({ config: { ...selectedResource.config, cpu: Number(e.target.value) } })} className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1.5" /></div><div><label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Memory GB</label><input type="number" min="0" step="0.5" value={selectedResource.config.memory_gb ?? ''} onChange={(e) => updateResource({ config: { ...selectedResource.config, memory_gb: Number(e.target.value) } })} className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1.5" /></div></div>
              </>}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Criticality</label>
                  <select
                    value={selectedResource.criticality}
                    onChange={(e) => {
                      const updated = architecture.resources.map((r) =>
                        r.id === selectedResource.id ? { ...r, criticality: e.target.value as CriticalityLevel } : r
                      );
                      onUpdateArchitecture({ ...architecture, resources: updated });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1.5"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Exposure</label>
                  <select
                    value={selectedResource.security_exposure}
                    onChange={(e) => {
                      const updated = architecture.resources.map((r) =>
                        r.id === selectedResource.id ? { ...r, security_exposure: e.target.value as SecurityExposure } : r
                      );
                      onUpdateArchitecture({ ...architecture, resources: updated });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1.5"
                  >
                    <option value="public">Public</option>
                    <option value="internal">Internal</option>
                    <option value="restricted">Restricted</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">RTO (min)</label>
                  <input
                    type="number"
                    value={selectedResource.rto_minutes}
                    onChange={(e) => {
                      const updated = architecture.resources.map((r) =>
                        r.id === selectedResource.id ? { ...r, rto_minutes: Number(e.target.value) } : r
                      );
                      onUpdateArchitecture({ ...architecture, resources: updated });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">RPO (min)</label>
                  <input
                    type="number"
                    value={selectedResource.rpo_minutes}
                    onChange={(e) => {
                      const updated = architecture.resources.map((r) =>
                        r.id === selectedResource.id ? { ...r, rpo_minutes: Number(e.target.value) } : r
                      );
                      onUpdateArchitecture({ ...architecture, resources: updated });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1.5"
                  />
                </div>
              </div>

              {/* Redundancy Toggle */}
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedResource.has_redundancy}
                    onChange={(e) => {
                      const updated = architecture.resources.map((r) =>
                        r.id === selectedResource.id ? { ...r, has_redundancy: e.target.checked, is_spof: !e.target.checked } : r
                      );
                      onUpdateArchitecture({ ...architecture, resources: updated });
                    }}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="font-semibold text-slate-200">Has Active Standby Failover</span>
                </label>

                {selectedResource.has_redundancy && (
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Standby Target</label>
                    <select
                      value={selectedResource.redundant_target_id || ''}
                      onChange={(e) => {
                        const updated = architecture.resources.map((r) =>
                          r.id === selectedResource.id ? { ...r, redundant_target_id: e.target.value } : r
                        );
                        onUpdateArchitecture({ ...architecture, resources: updated });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded p-1.5"
                    >
                      <option value="">Select Target...</option>
                      {architecture.resources
                        .filter((r) => r.id !== selectedResource.id)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.id})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Connection Relationship Modal */}
      {pendingConnection && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-sm text-slate-100 mb-2">Connect Virtual Resources</h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              From: <strong className="text-cyan-300">{pendingConnection.source}</strong> → To:{' '}
              <strong className="text-cyan-300">{pendingConnection.target}</strong>
            </p>

            <div className="space-y-2 mb-4">
              <label className="text-xs text-slate-300 block font-semibold">Select Relationship Semantics:</label>
              {[
                { type: 'DEPENDS_ON', desc: 'Operational dependency (target failure impacts source)' },
                { type: 'FAILOVER_TO', desc: 'Redundancy / Standby failover route' },
                { type: 'BACKUP_TO', desc: 'Backup copy association; does not trigger live failover' },
                { type: 'HAS_PERMISSION', desc: 'IAM Permission Grant (Enables access/reachability)' },
                { type: 'ASSUMES_ROLE', desc: 'Identity role assumption' },
                { type: 'NETWORK_REACHABLE', desc: 'Network routing / security group link' },
              { type: 'CONNECTS_TO', desc: 'General resource connection' },
              { type: 'DATA_FLOW', desc: 'Directional data producer to consumer flow' },
              ].map((item) => (
                <label
                  key={item.type}
                  onClick={() => setSelectedRelationshipType(item.type as RelationshipType)}
                  className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                    selectedRelationshipType === item.type
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="rel_type"
                    checked={selectedRelationshipType === item.type}
                    onChange={() => setSelectedRelationshipType(item.type as RelationshipType)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs block font-mono">{item.type}</span>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div><label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Description</label><input value={edgeDescription} onChange={(e) => setEdgeDescription(e.target.value)} placeholder="Optional relationship details" className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-2 text-xs" /></div>
              <div><label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Dependency strength (0–1)</label><input type="number" min="0" max="1" step="0.1" value={edgeStrength} onChange={(e) => setEdgeStrength(e.target.value)} placeholder="Optional" className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-2 text-xs" /></div>
            </div>
            {edgeValidationError && <p role="alert" className="text-rose-300 text-xs mb-3">{edgeValidationError}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingConnection(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddEdge}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-md"
              >
                Create Edge
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedEdge && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-sm text-slate-100 mb-1">Edit Relationship</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedEdge.source} → {selectedEdge.target}</p>
            <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Relationship type</label>
            <select value={selectedRelationshipType} onChange={(e) => setSelectedRelationshipType(e.target.value as RelationshipType)} className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-2 mb-3 text-xs">
              {['DEPENDS_ON','NETWORK_REACHABLE','HAS_PERMISSION','ASSUMES_ROLE','FAILOVER_TO','BACKUP_TO','CONNECTS_TO','DATA_FLOW'].map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
            </select>
            <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Description</label>
            <input value={edgeDescription} onChange={(e) => setEdgeDescription(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-2 mb-3 text-xs" />
            <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Dependency strength (0–1)</label>
            <input type="number" min="0" max="1" step="0.1" value={edgeStrength} onChange={(e) => setEdgeStrength(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-2 mb-4 text-xs" />
            <div className="flex justify-between"><button onClick={deleteSelectedEdge} className="px-3 py-2 bg-rose-950 text-rose-300 text-xs rounded-lg">Delete relationship</button><div className="flex gap-2"><button onClick={() => setSelectedEdgeId(null)} className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg">Cancel</button><button onClick={saveEdgeEdits} className="px-3 py-2 bg-cyan-600 text-white text-xs font-bold rounded-lg">Apply</button></div></div>
          </div>
        </div>
      )}
      {showResourceForm && <ResourceForm existingIds={architecture.resources.map((resource) => resource.id)} existingPositions={architecture.resources.map((resource) => ({ x: resource.position_x, y: resource.position_y }))} onClose={() => setShowResourceForm(false)} onCreate={handleCreateResource} />}
    </div>
  );
};

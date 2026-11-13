import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ShieldAlert,
  Flame,
  Zap,
  Info,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRightLeft,
  Plus,
} from 'lucide-react';
import {
  VirtualArchitecture,
  VirtualResource,
  ScenarioDefinition,
  SimulationResult,
  SimulationStepEvent,
} from '../types/cloud';
import { CloudResourceNode } from '../components/nodes/CloudResourceNode';
import { CloudRelationshipEdge } from '../components/edges/CloudRelationshipEdge';
import { SimulationControls } from '../components/simulator/SimulationControls';
import { EventTimeline } from '../components/simulator/EventTimeline';
import { ResourceInspector } from '../components/simulator/ResourceInspector';
import { executeSimulation, resetArchitecture, saveArchitecture } from '../services/api';
import { ResourceForm } from '../components/simulator/ResourceForm';

interface SimulatorWorkspaceProps {
  architecture: VirtualArchitecture;
  onUpdateArchitecture: (arch: VirtualArchitecture) => void;
  scenarios: ScenarioDefinition[];
  onSwitchArchitecture: (type: 'unmitigated' | 'mitigated') => void;
  onNavigateToWhatIf: () => void;
}

export const SimulatorWorkspace: React.FC<SimulatorWorkspaceProps> = ({
  architecture,
  onUpdateArchitecture,
  scenarios,
  onSwitchArchitecture,
  onNavigateToWhatIf,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('db_outage');
  const [selectedInitiatorId, setSelectedInitiatorId] = useState<string>('db-aurora-primary');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Simulation execution state
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [showAddResource, setShowAddResource] = useState<boolean>(false);
  const [resourceMessage, setResourceMessage] = useState<string | null>(null);

  const currentScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId);
  const scenarioTargetTypes: Record<string, string[]> = {
    db_outage: ['database'], ec2_failure: ['compute_ec2'], app_service_failure: ['app_service', 'microservice'],
    lb_failure: ['load_balancer'], network_partition: ['vpc'], queue_failure: ['message_queue'],
    storage_unavailability: ['storage_s3'], iam_role_compromise: ['iam_role'],
    excessive_permissions: ['app_service', 'microservice'], public_storage_exposure: ['storage_s3'],
    unintended_network_reachability: ['database', 'compute_ec2', 'app_service'],
  };
  const compatibleResources = useMemo(() => {
    const types = scenarioTargetTypes[selectedScenarioId] ?? (currentScenario?.default_target_type ? [currentScenario.default_target_type] : null);
    if (selectedScenarioId === 'az_outage') return architecture.resources.filter((resource) => !!resource.az);
    if (selectedScenarioId === 'region_outage') return architecture.resources.filter((resource) => !!resource.region);
    return types ? architecture.resources.filter((resource) => types.includes(resource.type)) : architecture.resources;
  }, [architecture.resources, currentScenario, selectedScenarioId]);

  // Playback timer ref
  const playbackTimerRef = useRef<any>(null);

  // Default initiator sync if not in current architecture
  useEffect(() => {
    if (architecture.resources.length > 0) {
      const exists = compatibleResources.some((r) => r.id === selectedInitiatorId);
      if (!exists && compatibleResources.length) {
        setSelectedInitiatorId(compatibleResources[0].id);
      }
    }
  }, [architecture.resources.length, compatibleResources, selectedInitiatorId]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, []);

  // Compute active resource states at currentStepIndex
  const activeResourceStates = useMemo(() => {
    const states: Record<string, any> = {};
    architecture.resources.forEach((r) => {
      states[r.id] = r.state;
    });

    if (simulationResult && simulationResult.events) {
      // Replay events up to currentStepIndex
      for (let i = 0; i < currentStepIndex && i < simulationResult.events.length; i++) {
        const evt = simulationResult.events[i];
        states[evt.target_resource_id] = evt.new_state;
      }
    }
    return states;
  }, [architecture, simulationResult, currentStepIndex]);

  // Highlighted edges corresponding to current active step
  const highlightedEdgeIds = useMemo(() => {
    if (!simulationResult || currentStepIndex === 0) return new Set<string>();
    const activeEvt = simulationResult.events[currentStepIndex - 1];
    if (!activeEvt) return new Set<string>();

    const matchingEdges = architecture.edges.filter(
      (e) =>
        (e.source === activeEvt.source_resource_id && e.target === activeEvt.target_resource_id) ||
        (e.source === activeEvt.target_resource_id && e.target === activeEvt.source_resource_id)
    );
    return new Set(matchingEdges.map((e) => e.id));
  }, [simulationResult, currentStepIndex, architecture.edges]);

  // React Flow custom node types
  const nodeTypes = useMemo(() => ({ cloudResource: CloudResourceNode }), []);
  const edgeTypes = useMemo(() => ({ cloudRelationship: CloudRelationshipEdge }), []);

  // Convert architecture resources to React Flow nodes
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    const rfNodes: Node[] = architecture.resources.map((res) => {
      const currentState = activeResourceStates[res.id] || res.state;
      const isInitiator = res.id === selectedInitiatorId;
      const isDirect = simulationResult?.blast_radius.directly_affected_ids.includes(res.id);
      const isIndirect = simulationResult?.blast_radius.indirectly_affected_ids.includes(res.id);

      return {
        id: res.id,
        type: 'cloudResource',
        position: { x: res.position_x, y: res.position_y },
        data: {
          resource: { ...res, state: currentState },
          isSelected: res.id === selectedNodeId,
          isInitiator: isInitiator && currentStepIndex > 0,
          isDirectlyAffected: isDirect && currentStepIndex > 0,
          isIndirectlyAffected: isIndirect && currentStepIndex > 0,
        },
      };
    });

    const rfEdges: Edge[] = architecture.edges.map((edge) => {
      const isHighlighted = highlightedEdgeIds.has(edge.id);
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'cloudRelationship',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
        animated: isHighlighted || edge.relationship === 'FAILOVER_TO',
        data: {
          relationship: edge.relationship,
          permission_level: edge.permission_level,
          latency_ms: edge.latency_ms,
          isHighlighted,
        },
      };
    });

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [
    architecture,
    activeResourceStates,
    selectedNodeId,
    selectedInitiatorId,
    currentStepIndex,
    highlightedEdgeIds,
    simulationResult,
  ]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleCreateResource = async (resource: VirtualResource) => {
    const saved = await saveArchitecture({ ...architecture, resources: [...architecture.resources, resource] });
    onUpdateArchitecture(saved);
    setSelectedInitiatorId(resource.id);
    setSelectedNodeId(resource.id);
    setShowAddResource(false);
    setResourceMessage(`${resource.name} created and saved.`);
    window.setTimeout(() => setResourceMessage(null), 3000);
  };

  const handleSaveResource = async (resource: VirtualResource) => {
    const next = { ...architecture, resources: architecture.resources.map((item) => item.id === resource.id ? resource : item) };
    const saved = await saveArchitecture(next);
    onUpdateArchitecture(saved);
    setResourceMessage(`${resource.name} updated and saved.`);
    window.setTimeout(() => setResourceMessage(null), 3000);
  };

  const handleDeleteResource = async (resourceId: string) => {
    const resource = architecture.resources.find((item) => item.id === resourceId);
    if (!window.confirm(`Delete ${resource?.name ?? 'this resource'} and its connected relationships?`)) return;
    const next = {
      ...architecture,
      resources: architecture.resources.filter((item) => item.id !== resourceId),
      edges: architecture.edges.filter((edge) => edge.source !== resourceId && edge.target !== resourceId),
    };
    const saved = await saveArchitecture(next);
    onUpdateArchitecture(saved);
    setSelectedNodeId(null);
    setResourceMessage(`${resource?.name ?? 'Resource'} and its relationships deleted.`);
    window.setTimeout(() => setResourceMessage(null), 3000);
  };

  // ---------------- Simulation Handlers ----------------

  const handleRunSimulation = async () => {
    try {
      if (!compatibleResources.some((resource) => resource.id === selectedInitiatorId)) {
        throw new Error(`Select a target compatible with ${currentScenario?.title ?? 'this scenario'}. ${compatibleResources.length ? `Valid targets: ${compatibleResources.map((resource) => resource.name).join(', ')}.` : 'Add a compatible resource first.'}`);
      }
      const savedArchitecture = await saveArchitecture(architecture);
      onUpdateArchitecture(savedArchitecture);
      // Resolve by architecture ID so the backend uses the persisted graph.
      const result = await executeSimulation({
        architecture_id: savedArchitecture.id,
        scenario_id: selectedScenarioId,
        initiating_resource_id: selectedInitiatorId,
      });

      setSimulationResult(result);
      setCurrentStepIndex(1); // Advance to step 1 (epicenter impact)
      setIsPlaying(true);
      setIsPaused(false);
    } catch (err: any) {
      alert(`Simulation Error: ${err.message}`);
    }
  };

  // Continuous playback loop
  useEffect(() => {
    if (isPlaying && !isPaused && simulationResult) {
      const delay = Math.max(400, Math.round(1800 / speedMultiplier));
      playbackTimerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= simulationResult.events.length) {
            setIsPlaying(false);
            if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, isPaused, simulationResult, speedMultiplier]);

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStepForward = async () => {
    if (!simulationResult) {
      // Calculate first
      try {
        const savedArchitecture = await saveArchitecture(architecture);
        onUpdateArchitecture(savedArchitecture);
        const result = await executeSimulation({
          architecture_id: savedArchitecture.id,
          scenario_id: selectedScenarioId,
          initiating_resource_id: selectedInitiatorId,
        });
        setSimulationResult(result);
        setCurrentStepIndex(1);
        setIsPlaying(false);
        setIsPaused(true);
      } catch (err: any) {
        alert(err.message);
      }
    } else {
      setIsPlaying(false);
      setIsPaused(true);
      setCurrentStepIndex((prev) => Math.min(prev + 1, simulationResult.events.length));
    }
  };

  const handleReset = async () => {
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentStepIndex(0);
    setSimulationResult(null);

    // Call reset endpoint
    try {
      const resetArch = await resetArchitecture(architecture);
      onUpdateArchitecture(resetArch);
    } catch {
      // fallback
    }
  };

  const handleStop = () => {
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    setIsPlaying(false);
    setIsPaused(true);
  };

  const selectedResource = useMemo(
    () => architecture.resources.find((r) => r.id === selectedNodeId) || null,
    [architecture.resources, selectedNodeId]
  );

  return (
    <div className="relative w-full h-[calc(100vh-65px)] flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="p-3 z-10 shrink-0">
        <SimulationControls
          scenarios={scenarios}
          resources={compatibleResources}
          scenario={currentScenario}
          selectedScenarioId={selectedScenarioId}
          onSelectScenarioId={(id) => {
            setSelectedScenarioId(id);
            const nextScenario = scenarios.find((scenario) => scenario.id === id);
            const types = scenarioTargetTypes[id] ?? (nextScenario?.default_target_type ? [nextScenario.default_target_type] : null);
            const candidates = id === 'az_outage' ? architecture.resources.filter((resource) => !!resource.az)
              : id === 'region_outage' ? architecture.resources.filter((resource) => !!resource.region)
              : types ? architecture.resources.filter((resource) => types.includes(resource.type)) : architecture.resources;
            if (candidates.length) setSelectedInitiatorId(candidates[0].id);
          }}
          selectedInitiatorId={selectedInitiatorId}
          onSelectInitiatorId={setSelectedInitiatorId}
          isRunning={isPlaying}
          isPaused={isPaused}
          isCompleted={simulationResult ? currentStepIndex >= simulationResult.events.length : false}
          currentStep={currentStepIndex}
          totalSteps={simulationResult ? simulationResult.events.length : 0}
          speedMultiplier={speedMultiplier}
          onSetSpeedMultiplier={setSpeedMultiplier}
          onRun={handleRunSimulation}
          onPause={handlePause}
          onResume={handleResume}
          onStepForward={handleStepForward}
          onReset={handleReset}
          onStop={handleStop}
        />
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full h-full">
        <button onClick={() => setShowAddResource(true)} className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg border border-emerald-400/30">
          <Plus className="w-3.5 h-3.5" /> Add Resource
        </button>
          <div className="absolute top-5 right-4 z-20 px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-[10px] text-slate-400 font-mono">
            {architecture.resources.length} resources · {architecture.edges.length} relationships
          </div>
        {/* Sample Architecture Switcher & Mitigation Shortcuts */}
        <div className="absolute top-4 left-36 z-20 flex flex-wrap items-center gap-2">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 flex items-center gap-1 shadow-lg backdrop-blur-md">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold px-1.5">
              Quick Env:
            </span>
            <button
              onClick={() => onSwitchArchitecture('unmitigated')}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                architecture.id.includes('unmitigated')
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Baseline (Unmitigated SPOF)
            </button>
            <button
              onClick={() => onSwitchArchitecture('mitigated')}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                architecture.id.includes('mitigated')
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Hardened (Multi-AZ Failover)
            </button>
          </div>

          <button
            onClick={onNavigateToWhatIf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg border border-purple-400/30"
          >
            <Sparkles className="w-3.5 h-3.5" /> What-If Experiment Studio
          </button>
        </div>

        {/* Live Blast Radius HUD Overlay */}
        {simulationResult && currentStepIndex > 0 && (
          <div className="absolute top-4 right-4 z-20 bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-2xl backdrop-blur-md flex items-center gap-4 text-xs">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Blast Radius:</span>
              <span
                className={`text-lg font-black font-mono ${
                  simulationResult.blast_radius.percentage_affected > 50
                    ? 'text-rose-400'
                    : simulationResult.blast_radius.percentage_affected > 20
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {simulationResult.blast_radius.percentage_affected}%
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">CRRS Risk:</span>
              <span className="text-lg font-black font-mono text-cyan-400">
                {simulationResult.crrs.overall_score}/100
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <button
              onClick={() => setShowAiModal(true)}
              className="px-2.5 py-1.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Analysis
            </button>
          </div>
        )}

        {/* React Flow Viewport */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={(_, node) => {
            const next = { ...architecture, resources: architecture.resources.map((resource) => resource.id === node.id
              ? { ...resource, position_x: node.position.x, position_y: node.position.y } : resource) };
            void saveArchitecture(next).then(onUpdateArchitecture).catch((error) => setResourceMessage(`Position save failed: ${error.message}`));
          }}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          colorMode="dark"
          className="bg-[#080c14]"
        >
          <Background color="#1e293b" gap={24} size={1} />
          <Controls className="!bg-slate-900 !border-slate-800 !text-slate-200" />
          <MiniMap
            nodeColor="#334155"
            maskColor="rgba(8, 12, 20, 0.7)"
            className="!bg-slate-900/80 !border-slate-800 rounded-lg overflow-hidden"
          />
        </ReactFlow>

        {/* Floating Side Panels (Bottom & Right) */}
        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap md:flex-nowrap items-end gap-3 pointer-events-none">
          {/* Event Timeline Scrubber */}
          <div className="w-full md:w-[460px] pointer-events-auto">
            <EventTimeline
              events={simulationResult ? simulationResult.events : []}
              activeStep={currentStepIndex}
              onSelectStep={(step) => {
                setIsPlaying(false);
                setIsPaused(true);
                setCurrentStepIndex(step);
              }}
            />
          </div>

          <div className="flex-1" />

          {/* Resource Inspector Drawer */}
          {selectedResource && (
            <div className="w-full md:w-[380px] pointer-events-auto">
              <ResourceInspector
                resource={selectedResource}
                edges={architecture.edges}
                allResources={architecture.resources}
                events={simulationResult ? simulationResult.events : []}
                onClose={() => setSelectedNodeId(null)}
                onSave={handleSaveResource}
                onDelete={handleDeleteResource}
              />
            </div>
          )}
        </div>
      </div>

      {/* AI Explanation Modal */}
      {showAiModal && simulationResult && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-slate-100">
                  AI Resilience Post-Mortem & Remediation
                </h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white text-sm font-mono px-2 py-1 rounded bg-slate-800"
              >
                ESC
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-2 text-sm text-slate-300 leading-relaxed font-sans custom-scrollbar">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 whitespace-pre-line font-sans">
                {simulationResult.ai_explanation || 'No explanation available.'}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowAiModal(false);
                  onNavigateToWhatIf();
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-lg shadow-md"
              >
                Run What-If Comparison
              </button>
            </div>
          </div>
        </div>
      )}
      {resourceMessage && <div className="fixed top-20 right-5 z-40 px-3 py-2 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs">{resourceMessage}</div>}
      {showAddResource && <ResourceForm existingIds={architecture.resources.map((resource) => resource.id)} existingPositions={architecture.resources.map((resource) => ({ x: resource.position_x, y: resource.position_y }))} onClose={() => setShowAddResource(false)} onCreate={handleCreateResource} />}
    </div>
  );
};

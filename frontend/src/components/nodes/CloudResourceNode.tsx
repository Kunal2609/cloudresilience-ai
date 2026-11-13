import React from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Server,
  Database,
  HardDrive,
  KeyRound,
  Network,
  Cloud,
  Layers,
  Cpu,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Radio,
  Archive,
  ArrowRightLeft,
} from 'lucide-react';
import { VirtualResource, ResourceState } from '../../types/cloud';

interface NodeProps {
  data: {
    resource: VirtualResource;
    isSelected?: boolean;
    isInitiator?: boolean;
    isDirectlyAffected?: boolean;
    isIndirectlyAffected?: boolean;
  };
}

export const CloudResourceNode: React.FC<NodeProps> = ({ data }) => {
  const { resource, isSelected, isInitiator, isDirectlyAffected, isIndirectlyAffected } = data;

  const getResourceIcon = () => {
    switch (resource.type) {
      case 'compute_ec2':
        return <Cpu className="w-5 h-5 text-sky-400" />;
      case 'app_service':
      case 'microservice':
        return <Server className="w-5 h-5 text-blue-400" />;
      case 'database':
        return <Database className="w-5 h-5 text-amber-400" />;
      case 'storage_s3':
        return <HardDrive className="w-5 h-5 text-emerald-400" />;
      case 'iam_role':
        return <KeyRound className="w-5 h-5 text-purple-400" />;
      case 'load_balancer':
        return <Network className="w-5 h-5 text-indigo-400" />;
      case 'api_gateway':
        return <Radio className="w-5 h-5 text-cyan-400" />;
      case 'message_queue':
        return <Layers className="w-5 h-5 text-yellow-400" />;
      case 'backup_resource':
        return <Archive className="w-5 h-5 text-teal-400" />;
      default:
        return <Cloud className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStateClasses = (state: ResourceState) => {
    switch (state) {
      case 'healthy':
        return 'border-emerald-500/40 bg-slate-900/90 text-slate-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]';
      case 'degraded':
        return 'border-amber-500 bg-amber-950/40 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.3)] animate-pulse';
      case 'failed':
        return 'border-rose-500 bg-rose-950/60 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse';
      case 'compromised':
        return 'border-purple-500 bg-purple-950/60 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse';
      case 'isolated':
        return 'border-slate-600 bg-slate-900/90 text-slate-400';
      case 'recovering':
        return 'border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]';
      case 'recovered':
        return 'border-teal-400 bg-teal-950/40 text-teal-200 shadow-[0_0_15px_rgba(20,184,166,0.3)]';
      default:
        return 'border-slate-700 bg-slate-900 text-slate-200';
    }
  };

  const getCriticalityBadge = () => {
    switch (resource.criticality) {
      case 'critical':
        return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded">CRIT</span>;
      case 'high':
        return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">HIGH</span>;
      case 'medium':
        return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded">MED</span>;
      case 'low':
        return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded">LOW</span>;
    }
  };

  return (
    <div
      className={`relative min-w-[210px] max-w-[260px] rounded-xl border-2 transition-all duration-300 p-3.5 backdrop-blur-md ${getStateClasses(
        resource.state
      )} ${isSelected ? 'ring-2 ring-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.4)]' : ''} ${
        isInitiator ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-950' : ''
      }`}
    >
      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-cyan-400 !border-slate-900" />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-cyan-400 !border-slate-900" />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-cyan-400 !border-slate-900" />
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-cyan-400 !border-slate-900" />

      {/* Top badges */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5">
          {getResourceIcon()}
          <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
            {resource.type.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {getCriticalityBadge()}
          {resource.is_spof && (
            <span
              title="Single Point of Failure"
              className="p-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded flex items-center"
            >
              <AlertTriangle className="w-3 h-3" />
            </span>
          )}
          {resource.has_redundancy && (
            <span
              title="Has Standby Redundancy"
              className="p-0.5 bg-teal-500/20 text-teal-400 border border-teal-500/40 rounded flex items-center"
            >
              <ArrowRightLeft className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

      {/* Resource Name */}
      <div className="mb-2">
        <h4 className="font-bold text-sm text-slate-100 truncate" title={resource.name}>
          {resource.name}
        </h4>
        <p className="text-[10px] text-slate-400 font-mono truncate">{resource.id}</p>
      </div>

      {/* State & Metadata Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${
              resource.state === 'healthy'
                ? 'bg-emerald-400'
                : resource.state === 'degraded'
                ? 'bg-amber-400 animate-ping'
                : resource.state === 'failed'
                ? 'bg-rose-500 animate-ping'
                : resource.state === 'compromised'
                ? 'bg-purple-500 animate-ping'
                : resource.state === 'recovering'
                ? 'bg-cyan-400'
                : 'bg-slate-400'
            }`}
          />
          <span className="capitalize font-semibold text-xs tracking-wide">
            {resource.state}
          </span>
        </div>
        <div className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
          {resource.az || resource.region || 'global'}
        </div>
      </div>

      {/* Initiator / Blast Radius Tag */}
      {isInitiator && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg border border-rose-400">
          Epicenter
        </div>
      )}
      {isDirectlyAffected && !isInitiator && (
        <div className="absolute -top-2.5 right-2 px-1.5 py-0.2 bg-amber-600/90 text-white text-[9px] font-bold uppercase rounded border border-amber-400">
          Direct Impact
        </div>
      )}
      {isIndirectlyAffected && !isInitiator && (
        <div className="absolute -top-2.5 right-2 px-1.5 py-0.2 bg-purple-600/90 text-white text-[9px] font-bold uppercase rounded border border-purple-400">
          Cascaded
        </div>
      )}
    </div>
  );
};

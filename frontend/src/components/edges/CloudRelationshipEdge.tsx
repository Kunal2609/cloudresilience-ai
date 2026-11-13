import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import { RelationshipType } from '../../types/cloud';

interface EdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  data?: {
    relationship?: RelationshipType;
    permission_level?: string;
    isHighlighted?: boolean;
    latency_ms?: number;
    description?: string;
    dependency_strength?: number;
  };
  style?: React.CSSProperties;
  markerEnd?: string;
}

export const CloudRelationshipEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const relationship = data?.relationship || 'DEPENDS_ON';
  const isHighlighted = data?.isHighlighted || false;

  const getEdgeStyling = () => {
    switch (relationship) {
      case 'FAILOVER_TO':
        return {
          stroke: '#10b981', // emerald
          strokeWidth: isHighlighted ? 3.5 : 2,
          strokeDasharray: '6 4',
          filter: isHighlighted ? 'drop-shadow(0 0 8px #10b981)' : 'none',
        };
      case 'BACKUP_TO':
        return { stroke: '#14b8a6', strokeWidth: isHighlighted ? 3.5 : 2, strokeDasharray: '2 4', filter: isHighlighted ? 'drop-shadow(0 0 8px #14b8a6)' : 'none' };
      case 'HAS_PERMISSION':
      case 'ASSUMES_ROLE':
        return {
          stroke: '#a855f7', // purple
          strokeWidth: isHighlighted ? 3.5 : 2,
          strokeDasharray: '4 3',
          filter: isHighlighted ? 'drop-shadow(0 0 8px #a855f7)' : 'none',
        };
      case 'NETWORK_REACHABLE':
      case 'CONNECTS_TO':
        return {
          stroke: '#06b6d4', // cyan
          strokeWidth: isHighlighted ? 3.5 : 2,
          filter: isHighlighted ? 'drop-shadow(0 0 8px #06b6d4)' : 'none',
        };
      case 'DATA_FLOW':
        return { stroke: '#f59e0b', strokeWidth: isHighlighted ? 3.5 : 2, filter: isHighlighted ? 'drop-shadow(0 0 8px #f59e0b)' : 'none' };
      case 'DEPENDS_ON':
      default:
        return {
          stroke: isHighlighted ? '#f43f5e' : '#3b82f6', // rose when propagating else blue
          strokeWidth: isHighlighted ? 3.5 : 2,
          filter: isHighlighted ? 'drop-shadow(0 0 10px #f43f5e)' : 'none',
        };
    }
  };

  const getLabelColor = () => {
    switch (relationship) {
      case 'FAILOVER_TO':
        return 'text-emerald-300 border-emerald-500/40 bg-emerald-950/80';
      case 'BACKUP_TO':
        return 'text-teal-300 border-teal-500/40 bg-teal-950/80';
      case 'HAS_PERMISSION':
      case 'ASSUMES_ROLE':
        return 'text-purple-300 border-purple-500/40 bg-purple-950/80';
      case 'NETWORK_REACHABLE':
      case 'CONNECTS_TO':
        return 'text-cyan-300 border-cyan-500/40 bg-cyan-950/80';
      case 'DATA_FLOW':
        return 'text-amber-300 border-amber-500/40 bg-amber-950/80';
      default:
        return 'text-blue-300 border-blue-500/40 bg-blue-950/80';
    }
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          ...getEdgeStyling(),
          transition: 'all 0.3s ease',
        }}
      />
      <EdgeLabelRenderer>
        <div
          title={data?.description || `${relationship.replaceAll('_', ' ')}${data?.dependency_strength == null ? '' : ` · strength ${data.dependency_strength}`}`}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border shadow-md ${getLabelColor()} ${
            isHighlighted ? 'scale-110 shadow-[0_0_12px_rgba(244,63,94,0.6)]' : ''
          }`}
        >
          {relationship.replace('_', ' ')}
          {data?.permission_level ? ` (${data.permission_level})` : ''}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

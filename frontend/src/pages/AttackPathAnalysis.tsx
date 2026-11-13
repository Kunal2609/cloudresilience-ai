import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  KeyRound,
  ArrowRight,
  Lock,
  Unlock,
  AlertTriangle,
  Play,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { VirtualArchitecture } from '../types/cloud';
import { fetchAttackPaths } from '../services/api';

interface AttackPathAnalysisProps {
  architecture: VirtualArchitecture;
  onLaunchSecuritySimulation: (scenarioId: string, resourceId: string) => void;
}

export const AttackPathAnalysis: React.FC<AttackPathAnalysisProps> = ({
  architecture,
  onLaunchSecuritySimulation,
}) => {
  const [selectedIdentityId, setSelectedIdentityId] = useState<string>('iam-app-exec-role');
  const [paths, setPaths] = useState<string[][]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Available identities and compute instances
  const attackOrigins = architecture.resources.filter(
    (r) => r.type === 'iam_role' || r.type === 'app_service' || r.security_exposure === 'public'
  );

  useEffect(() => {
    if (selectedIdentityId) {
      loadPaths(selectedIdentityId);
    }
  }, [selectedIdentityId, architecture]);

  const loadPaths = async (id: string) => {
    setLoading(true);
    try {
      const result = await fetchAttackPaths(id, architecture);
      setPaths(result);
    } catch {
      setPaths([]);
    } finally {
      setLoading(false);
    }
  };

  const getResourceName = (id: string) => {
    const res = architecture.resources.find((r) => r.id === id);
    return res ? res.name : id;
  };

  const getResourceType = (id: string) => {
    const res = architecture.resources.find((r) => r.id === id);
    return res ? res.type : 'resource';
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-purple-400" /> Identity Attack-Path & Lateral Movement Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Evaluate how an adversary can pivot laterally through IAM permission policies and networked subnets to compromise restricted datastores.
          </p>
        </div>

        {/* Identity Selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl">
          <KeyRound className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-slate-400 font-mono">Compromised Foothold:</span>
          <select
            value={selectedIdentityId}
            onChange={(e) => setSelectedIdentityId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400"
          >
            {attackOrigins.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
            Lateral Reachable Targets
          </span>
          <div className="text-3xl font-black font-mono text-purple-400">
            {paths.length}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Distinct multi-hop traversal paths uncovered via explicit permissions and subnet routes.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
            Sensitive Resources at Risk
          </span>
          <div className="text-3xl font-black font-mono text-rose-400">
            {
              paths.filter((p) => {
                const target = p[p.length - 1];
                const res = architecture.resources.find((r) => r.id === target);
                return res?.config.sensitive || res?.type === 'database' || res?.type === 'storage_s3';
              }).length
            }
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Transactional databases & confidential storage buckets accessible without MFA.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
              Active Simulation
            </span>
            <div className="text-sm font-bold text-slate-200">
              Test Attack Scenario Live
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Inject credentials breach into simulator and watch exploit propagate tick-by-tick.
            </p>
          </div>
          <button
            onClick={() => onLaunchSecuritySimulation('iam_role_compromise', selectedIdentityId)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-md mt-3"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> Simulate Lateral Exploit
          </button>
        </div>
      </div>

      {/* Traversal Paths Scrubber */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-base text-slate-100 mb-4 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-purple-400" /> Discovered Exploit & Lateral Paths (Depth-First Search)
        </h3>

        {loading ? (
          <div className="text-center py-10 text-slate-400 text-xs">Traversing security graph...</div>
        ) : paths.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs italic">
            No lateral paths discovered from this entity. Privileges are properly isolated.
          </div>
        ) : (
          <div className="space-y-3">
            {paths.map((path, idx) => (
              <div
                key={idx}
                className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-purple-500/50 transition-all flex flex-wrap items-center gap-2 text-xs"
              >
                <span className="text-[10px] font-mono font-bold text-purple-400 px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/60">
                  Path #{idx + 1}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {path.map((nodeId, nIdx) => (
                    <React.Fragment key={nodeId}>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-mono">
                        <span className="font-semibold text-slate-200">{getResourceName(nodeId)}</span>
                        <span className="text-[9px] text-slate-400">({getResourceType(nodeId)})</span>
                      </div>
                      {nIdx < path.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
                    Exposed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

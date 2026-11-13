import React, { useState, useEffect } from 'react';
import {
  History,
  FileText,
  ArrowRight,
  Download,
  RotateCcw,
  CheckCircle2,
  GitCompare,
  Eye,
} from 'lucide-react';
import {
  fetchSimulationHistory,
  fetchRunDetails,
  compareSimulationRuns,
  generateReportMarkdown,
} from '../services/api';
import { SimulationResult } from '../types/cloud';

interface SimulationHistoryProps {
  onReopenRun: (result: SimulationResult) => void;
}

export const SimulationHistory: React.FC<SimulationHistoryProps> = ({ onReopenRun }) => {
  const [historyRuns, setHistoryRuns] = useState<any[]>([]);
  const [selectedRunId1, setSelectedRunId1] = useState<string>('');
  const [selectedRunId2, setSelectedRunId2] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchSimulationHistory();
      setHistoryRuns(data);
      if (data.length >= 2) {
        setSelectedRunId1(data[0].id);
        setSelectedRunId2(data[1].id);
      } else if (data.length === 1) {
        setSelectedRunId1(data[0].id);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!selectedRunId1 || !selectedRunId2) {
      alert('Select two simulation runs to compare.');
      return;
    }
    try {
      const res = await compareSimulationRuns(selectedRunId1, selectedRunId2);
      setComparisonResult(res);
    } catch (err: any) {
      alert(`Comparison failed: ${err.message}`);
    }
  };

  const handleGenerateReport = async (runId: string) => {
    try {
      const res = await generateReportMarkdown(runId);
      setReportMarkdown(res.report_markdown);
    } catch (err: any) {
      alert(`Failed to generate report: ${err.message}`);
    }
  };

  const handleReopen = async (runId: string) => {
    try {
      const res = await fetchRunDetails(runId);
      onReopenRun(res);
    } catch (err: any) {
      alert(`Failed to load run: ${err.message}`);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <History className="w-6 h-6 text-cyan-400" /> Simulation Run History & Audit Reports
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Historical record of executed simulation scenarios stored in PostgreSQL / relational store. Reopen past runs,
          compare before/after execution deltas, and export formal engineering reports.
        </p>
      </div>

      {/* Compare Runs Tool */}
      {historyRuns.length >= 2 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-cyan-400" /> Side-by-Side Run Comparison
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedRunId1}
                onChange={(e) => setSelectedRunId1(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-mono"
              >
                {historyRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    Run {r.id} ({r.scenario_id})
                  </option>
                ))}
              </select>

              <span className="text-slate-500 font-bold text-xs">vs</span>

              <select
                value={selectedRunId2}
                onChange={(e) => setSelectedRunId2(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-mono"
              >
                {historyRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    Run {r.id} ({r.scenario_id})
                  </option>
                ))}
              </select>

              <button
                onClick={handleCompare}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-md"
              >
                Compare Runs
              </button>
            </div>
          </div>

          {comparisonResult && (
            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Run 1: {comparisonResult.run1.id}</span>
                <div className="text-slate-200 font-bold">
                  CRRS: {comparisonResult.run1.crrs} | Blast: {comparisonResult.run1.blast_radius_pct}%
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Run 2: {comparisonResult.run2.id}</span>
                <div className="text-slate-200 font-bold">
                  CRRS: {comparisonResult.run2.crrs} | Blast: {comparisonResult.run2.blast_radius_pct}%
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Variance / Improvement</span>
                <div className={`font-bold ${comparisonResult.delta.improved ? 'text-emerald-400' : 'text-amber-400'}`}>
                  Δ CRRS: {comparisonResult.delta.crrs_diff} pts | Δ Blast: {comparisonResult.delta.blast_radius_diff}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="font-bold text-sm text-slate-100 mb-3">Historical Executions</h3>

        {loading ? (
          <div className="text-center py-10 text-slate-400 text-xs">Loading simulation records...</div>
        ) : historyRuns.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs italic">
            No historical runs recorded yet. Execute simulations in the Simulator Workspace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2 px-3">Run ID</th>
                  <th className="py-2 px-3">Scenario</th>
                  <th className="py-2 px-3">Epicenter Resource</th>
                  <th className="py-2 px-3">CRRS Score</th>
                  <th className="py-2 px-3">Blast Radius</th>
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {historyRuns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-cyan-400">{r.id}</td>
                    <td className="py-2.5 px-3 text-slate-200">{r.scenario_id}</td>
                    <td className="py-2.5 px-3 text-slate-300">{r.initiating_resource_id}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-100">{r.crrs_score}</td>
                    <td className="py-2.5 px-3 font-bold text-rose-400">{r.blast_radius_pct}%</td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] font-sans">{r.created_at}</td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleReopen(r.id)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded font-bold"
                        title="Reopen in Simulator"
                      >
                        Reopen
                      </button>
                      <button
                        onClick={() => handleGenerateReport(r.id)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                        title="View Report"
                      >
                        Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {reportMarkdown && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" /> Executive Resilience Incident Report
              </h3>
              <button
                onClick={() => setReportMarkdown(null)}
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 bg-slate-800 rounded"
              >
                CLOSE
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-2 font-mono text-xs text-slate-200 whitespace-pre-wrap bg-slate-950 p-4 rounded-xl border border-slate-800 custom-scrollbar">
              {reportMarkdown}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
              <button
                onClick={() => {
                  const element = document.createElement('a');
                  const file = new Blob([reportMarkdown], { type: 'text/markdown' });
                  element.href = URL.createObjectURL(file);
                  element.download = 'Resilience_Report.md';
                  element.click();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-md"
              >
                <Download className="w-3.5 h-3.5" /> Download Markdown Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

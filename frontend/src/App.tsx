import React, { useState, useEffect } from 'react';
import { Navbar, PageId } from './components/layout/Navbar';
import { Overview } from './pages/Overview';
import { SimulatorWorkspace } from './pages/SimulatorWorkspace';
import { ArchitectureBuilder } from './pages/ArchitectureBuilder';
import { ScenarioLibrary } from './pages/ScenarioLibrary';
import { AttackPathAnalysis } from './pages/AttackPathAnalysis';
import { RiskAssessment } from './pages/RiskAssessment';
import { RecoveryPlanner } from './pages/RecoveryPlanner';
import { Recommendations } from './pages/Recommendations';
import { SimulationHistory } from './pages/SimulationHistory';
import { Settings } from './pages/Settings';
import {
  fetchSampleArchitecture,
  fetchArchitecture,
  fetchArchitectures,
  fetchScenarios,
  fetchCRRS,
} from './services/api';
import {
  VirtualArchitecture,
  ScenarioDefinition,
  CRRSScore,
  RecommendationItem,
  RecoveryPlan,
  SimulationResult,
} from './types/cloud';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageId>('simulator');
  const [architecture, setArchitecture] = useState<VirtualArchitecture | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);
  const [crrs, setCrrs] = useState<CRRSScore | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recoveryPlan, setRecoveryPlan] = useState<RecoveryPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initial data loading
  useEffect(() => {
    async function init() {
      try {
        const [sampleArch, scenarioList, savedArchitectures] = await Promise.all([
          fetchSampleArchitecture('unmitigated'),
          fetchScenarios(),
          fetchArchitectures().catch(() => []),
        ]);
        const saved = savedArchitectures[0] ? await fetchArchitecture(savedArchitectures[0].id) : null;
        setArchitecture(saved ?? sampleArch);
        setScenarios(scenarioList);

        // Fetch initial CRRS
        const crrsData = await fetchCRRS(saved ?? sampleArch);
        setCrrs(crrsData);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Update CRRS whenever architecture changes
  const handleUpdateArchitecture = async (updated: VirtualArchitecture) => {
    setArchitecture(updated);
    try {
      const crrsData = await fetchCRRS(updated);
      setCrrs(crrsData);
    } catch {
      // ignore
    }
  };

  const handleSwitchArchitecture = async (type: 'unmitigated' | 'mitigated') => {
    try {
      const newArch = await fetchSampleArchitecture(type);
      setArchitecture(newArch);
      const crrsData = await fetchCRRS(newArch);
      setCrrs(crrsData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLaunchScenario = (scenarioId: string, resourceId: string) => {
    setActivePage('simulator');
  };

  const handleReopenRun = (result: SimulationResult) => {
    setActivePage('simulator');
  };

  if (loading || !architecture) {
    return (
      <div className="w-screen h-screen bg-[#080c14] flex flex-col items-center justify-center text-slate-300 font-mono">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-sm font-bold tracking-wider">BOOTING CLOUDRESILIENCE AI VIRTUAL LAB...</h2>
        <p className="text-xs text-slate-500 mt-1">Connecting to local simulation engine & database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
        activeArchName={architecture.name}
      />

      <main className="flex-1 w-full">
        {activePage === 'overview' && (
          <Overview
            architecture={architecture}
            crrs={crrs}
            scenarios={scenarios}
            onLaunchSimulation={handleLaunchScenario}
            onNavigate={setActivePage}
            onSwitchArchitecture={handleSwitchArchitecture}
          />
        )}

        {activePage === 'simulator' && (
          <SimulatorWorkspace
            architecture={architecture}
            onUpdateArchitecture={handleUpdateArchitecture}
            scenarios={scenarios}
            onSwitchArchitecture={handleSwitchArchitecture}
            onNavigateToWhatIf={() => setActivePage('recommendations')}
          />
        )}

        {activePage === 'builder' && (
          <ArchitectureBuilder
            architecture={architecture}
            onUpdateArchitecture={handleUpdateArchitecture}
            onResetToSample={handleSwitchArchitecture}
          />
        )}

        {activePage === 'scenarios' && (
          <ScenarioLibrary
            scenarios={scenarios}
            architecture={architecture}
            onLaunchScenario={handleLaunchScenario}
          />
        )}

        {activePage === 'attack_paths' && (
          <AttackPathAnalysis
            architecture={architecture}
            onLaunchSecuritySimulation={handleLaunchScenario}
          />
        )}

        {activePage === 'risk' && (
          <RiskAssessment
            architecture={architecture}
            crrs={crrs}
          />
        )}

        {activePage === 'recovery' && (
          <RecoveryPlanner
            architecture={architecture}
            recoveryPlan={recoveryPlan}
          />
        )}

        {activePage === 'recommendations' && (
          <Recommendations
            architecture={architecture}
            recommendations={recommendations}
            onApplyMitigationInSimulator={() => {
              handleSwitchArchitecture('mitigated');
              setActivePage('simulator');
            }}
          />
        )}

        {activePage === 'history' && (
          <SimulationHistory onReopenRun={handleReopenRun} />
        )}

        {activePage === 'settings' && <Settings />}
      </main>
    </div>
  );
};

export default App;

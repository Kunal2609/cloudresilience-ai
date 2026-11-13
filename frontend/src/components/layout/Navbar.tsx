import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Layers,
  BookOpen,
  ShieldAlert,
  BarChart3,
  RefreshCw,
  Sparkles,
  History,
  Settings as SettingsIcon,
  CloudLightning,
  ShieldCheck,
} from 'lucide-react';

export type PageId =
  | 'overview'
  | 'simulator'
  | 'builder'
  | 'scenarios'
  | 'attack_paths'
  | 'risk'
  | 'recovery'
  | 'recommendations'
  | 'history'
  | 'settings';

interface NavbarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  activeArchName: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activePage, onNavigate, activeArchName }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'simulator', label: 'Simulator Workspace', icon: Cpu, isPrimary: true },
    { id: 'builder', label: 'Architecture Builder', icon: Layers },
    { id: 'scenarios', label: 'Scenario Library', icon: BookOpen },
    { id: 'attack_paths', label: 'Attack Paths', icon: ShieldAlert },
    { id: 'risk', label: 'Risk (CRRS)', icon: BarChart3 },
    { id: 'recovery', label: 'Recovery Planner', icon: RefreshCw },
    { id: 'recommendations', label: 'Recommendations & What-If', icon: Sparkles },
    { id: 'history', label: 'History & Reports', icon: History },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="bg-slate-950/90 border-b border-slate-800/80 sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-[1720px] mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('simulator')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/30">
            <CloudLightning className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-slate-100 tracking-tight">
                CloudResilience <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AI</span>
              </span>
              <span className="text-[10px] uppercase font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/50 px-1.5 py-0.2 rounded">
                Virtual Lab
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
              Active: <strong className="text-slate-200">{activeArchName}</strong>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as PageId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? item.isPrimary
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                      : 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive && item.isPrimary ? 'text-slate-950' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

import React from 'react';
import { HardDrive, FolderOpen, Sparkles, Terminal, Layers, ShieldCheck } from 'lucide-react';

interface TopBarProps {
  activeTab: 'treemap' | 'tree' | 'cleanup' | 'doctor';
  setActiveTab: (tab: 'treemap' | 'tree' | 'cleanup' | 'doctor') => void;
  onScanLocalClick: () => void;
  isScanning: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onScanLocalClick,
  isScanning,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <HardDrive className="w-4 h-4" />
        </div>
        <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
          DiskSize AI
        </span>
      </div>

      {/* Zone 2: Navigation links with single-line whitespace-nowrap */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800/80">
        <button
          onClick={() => setActiveTab('tree')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'tree'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Directory Tree</span>
        </button>

        <button
          onClick={() => setActiveTab('treemap')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'treemap'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Treemap Chart</span>
        </button>

        <button
          onClick={() => setActiveTab('cleanup')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'cleanup'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Cleanup Scripts</span>
        </button>

        <button
          onClick={() => setActiveTab('doctor')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'doctor'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Storage Doctor</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action button */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onScanLocalClick}
          disabled={isScanning}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-200 rounded-lg transition-colors whitespace-nowrap shrink-0 font-semibold shadow-sm disabled:opacity-50"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>{isScanning ? 'Scanning...' : 'Scan Local Folder'}</span>
        </button>
      </div>
    </header>
  );
};

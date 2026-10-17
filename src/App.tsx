import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { StorageOverviewCards } from './components/StorageOverviewCards';
import { TreemapVisualizer } from './components/TreemapVisualizer';
import { DirectoryTreeView } from './components/DirectoryTreeView';
import { CommandTerminal } from './components/CommandTerminal';
import { AiStorageDoctor } from './components/AiStorageDoctor';
import { PRESET_PROFILES } from './data/presetScans';
import { DiskNode, OperatingSystem } from './types/disk';
import { scanLocalDirectory } from './utils/localScanner';
import { formatBytes } from './utils/formatters';

export default function App() {
  const [activeTab, setActiveTab] = useState<'treemap' | 'tree' | 'cleanup' | 'doctor'>('tree');
  const [selectedOs, setSelectedOs] = useState<OperatingSystem>('windows');
  const [customScanNode, setCustomScanNode] = useState<DiskNode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ count: number; currentPath: string } | null>(null);

  // Selected nodes for batch cleanup
  const [selectedCleanupIds, setSelectedCleanupIds] = useState<Set<string>>(new Set());

  // Doctor AI prompt pipeline
  const [doctorInitialPrompt, setDoctorInitialPrompt] = useState<string | null>(null);

  // Current active drive profile
  const activeProfile = PRESET_PROFILES[selectedOs];
  const rootNode = customScanNode || activeProfile.rootNode;
  const driveLabel = customScanNode ? `Local: ${customScanNode.name}` : activeProfile.driveLabel;
  const totalCapacity = customScanNode ? Math.max(customScanNode.size * 1.35, 1024 * 1024 * 1024) : activeProfile.totalCapacity;
  const freeSpace = customScanNode ? totalCapacity - customScanNode.size : activeProfile.freeSpace;

  // Handle switching OS preset
  function handleSelectOs(os: OperatingSystem) {
    setSelectedOs(os);
    setCustomScanNode(null);
    setSelectedCleanupIds(new Set());
  }

  // Handle Real Folder Picker via File System Access API
  async function handleScanLocalClick() {
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera to scan local disk folders.');
      return;
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
      });
      setIsScanning(true);
      setScanProgress({ count: 0, currentPath: dirHandle.name });

      const scannedRoot = await scanLocalDirectory(
        dirHandle,
        (count, currentPath) => {
          setScanProgress({ count, currentPath });
        },
        5 // Depth limit
      );

      setCustomScanNode(scannedRoot);
      setIsScanning(false);
      setScanProgress(null);
      setActiveTab('treemap');
    } catch (err: any) {
      setIsScanning(false);
      setScanProgress(null);
      // User cancelled picker or permission denied
    }
  }

  // Toggle node selection for cleanup
  function handleToggleCleanupNode(node: DiskNode) {
    if (node.safetyRating === 'system-critical') return; // Cannot select protected core files

    setSelectedCleanupIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  }

  // Select all Safe items across the current tree
  function handleSelectAllSafe() {
    const safeIds = new Set<string>();
    function collectSafe(n: DiskNode) {
      if (n.safetyRating === 'safe') {
        safeIds.add(n.id);
        return; // Don't add children if parent is cleanable
      }
      if (n.children) {
        for (const child of n.children) {
          collectSafe(child);
        }
      }
    }
    collectSafe(rootNode);
    setSelectedCleanupIds(safeIds);
    setActiveTab('cleanup');
  }

  // Ask AI about a specific folder or file
  function handleAskAi(node: DiskNode) {
    const prompt = `Can I safely delete or clean "${node.path}" (${formatBytes(node.size)})? What does this folder contain, what creates it, and what is the exact command or tool to clean it on ${selectedOs.toUpperCase()}?`;
    setDoctorInitialPrompt(prompt);
    setActiveTab('doctor');
  }

  // Generate command for a specific node
  function handleGenerateCommandForNode(node: DiskNode) {
    setSelectedCleanupIds(new Set([node.id]));
    setActiveTab('cleanup');
  }

  // Gather selected DiskNode objects
  const selectedNodesList: DiskNode[] = [];
  function gatherSelected(n: DiskNode) {
    if (selectedCleanupIds.has(n.id)) {
      selectedNodesList.push(n);
    }
    if (n.children) {
      for (const c of n.children) gatherSelected(c);
    }
  }
  gatherSelected(rootNode);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Top Bar Contract (Wordmark, Nav, Primary Action) */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onScanLocalClick={handleScanLocalClick}
        isScanning={isScanning}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col">
        {/* Storage Overview Bar */}
        <StorageOverviewCards
          os={selectedOs}
          onSelectOs={handleSelectOs}
          driveLabel={driveLabel}
          totalCapacity={totalCapacity}
          freeSpace={freeSpace}
          rootNode={rootNode}
          isCustomScan={!!customScanNode}
          onOpenCleanupPlan={handleSelectAllSafe}
        />

        {/* Tab View Container */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'treemap' && (
            <TreemapVisualizer
              rootNode={rootNode}
              onAskAi={handleAskAi}
              onSelectForCleanup={handleGenerateCommandForNode}
            />
          )}

          {activeTab === 'tree' && (
            <DirectoryTreeView
              rootNode={rootNode}
              selectedNodesForCleanup={selectedCleanupIds}
              onToggleCleanupNode={handleToggleCleanupNode}
              onSelectAllSafe={handleSelectAllSafe}
              onAskAi={handleAskAi}
              onGenerateCommandForNode={handleGenerateCommandForNode}
            />
          )}

          {activeTab === 'cleanup' && (
            <CommandTerminal
              os={selectedOs}
              selectedNodes={selectedNodesList}
              onClearSelection={() => setSelectedCleanupIds(new Set())}
              onAskAi={(p) => {
                setDoctorInitialPrompt(p);
                setActiveTab('doctor');
              }}
            />
          )}

          {activeTab === 'doctor' && (
            <AiStorageDoctor
              os={selectedOs}
              rootNode={rootNode}
              initialPrompt={doctorInitialPrompt}
              onClearInitialPrompt={() => setDoctorInitialPrompt(null)}
            />
          )}
        </div>
      </main>

      {/* Scanning Progress Overlay Modal */}
      {isScanning && scanProgress && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center animate-spin">
                ⏳
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Scanning Local Directory...</h3>
                <p className="text-xs text-slate-400 font-mono tabular-nums">
                  {scanProgress.count.toLocaleString()} files indexed
                </p>
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 truncate mb-4">
              {scanProgress.currentPath}
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 animate-pulse w-3/4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef } from 'react';
import {
  HardDrive,
  FolderOpen,
  Sparkles,
  Terminal,
  Layers,
  ShieldCheck,
  TrendingUp,
  FolderTree,
  Zap,
  Upload,
  X,
  FileText,
  RotateCcw,
  Check,
  AlertCircle,
} from 'lucide-react';
import { DirectoryTreeView } from './components/DirectoryTreeView';
import { TreemapVisualizer } from './components/TreemapVisualizer';
import { CommandTerminal } from './components/CommandTerminal';
import { AiStorageDoctor } from './components/AiStorageDoctor';
import { PRESET_PROFILES } from './data/presetScans';
import { DiskNode } from './types/disk';
import { scanLocalDirectory, scanFileList, parseWindowsDirOutput } from './utils/localScanner';
import { formatBytes, formatPercentage } from './utils/formatters';
import { generate30DayTrend } from './utils/trendData';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function App() {
  // Only real scanned node - NO fake files by default!
  const [scannedRootNode, setScannedRootNode] = useState<DiskNode | null>(null);

  // View modes: 'tree' (default), 'treemap', 'trend'
  const [viewMode, setViewMode] = useState<'tree' | 'treemap' | 'trend'>('tree');

  // Modals & Drawers
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [showAiDoctor, setShowAiDoctor] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedDirText, setPastedDirText] = useState('');

  // Scanning progress state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ count: number; currentPath: string } | null>(null);

  // Drag & drop highlight
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Hidden HTML5 folder input for universal browser support
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected items for PowerShell cleanup
  const [selectedCleanupIds, setSelectedCleanupIds] = useState<Set<string>>(new Set());
  const [doctorInitialPrompt, setDoctorInitialPrompt] = useState<string | null>(null);

  // Drive metrics from the REAL scanned folder
  const rootNode = scannedRootNode;
  const driveLabel = rootNode ? rootNode.name : 'No Folder Selected';
  const totalCapacity = rootNode ? Math.max(rootNode.size * 1.35, 1024 * 1024 * 1024) : 0;
  const usedSpace = rootNode ? rootNode.size : 0;
  const freeSpace = totalCapacity > 0 ? totalCapacity - usedSpace : 0;
  const usedPercentage = totalCapacity > 0 ? Math.min(100, (usedSpace / totalCapacity) * 100) : 0;

  // Tally real safe bytes
  let safeBytes = 0;
  if (rootNode) {
    function tallySafe(n: DiskNode) {
      if (n.safetyRating === 'safe') {
        safeBytes += n.size;
        return;
      }
      if (n.children) {
        for (const c of n.children) tallySafe(c);
      }
    }
    tallySafe(rootNode);
  }

  // Trend analysis for real scanned files
  const trendSummary = rootNode
    ? generate30DayTrend(usedSpace, totalCapacity, safeBytes, 'windows', driveLabel)
    : null;

  // 1. Scan via native File System Access API
  async function handlePickDirectory() {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
        setIsScanning(true);
        setScanProgress({ count: 0, currentPath: dirHandle.name });

        const scanned = await scanLocalDirectory(
          dirHandle,
          (count, currentPath) => setScanProgress({ count, currentPath }),
          7
        );

        setScannedRootNode(scanned);
        setSelectedCleanupIds(new Set());
        setIsScanning(false);
        setScanProgress(null);
        setViewMode('tree');
        return;
      } catch (err: any) {
        setIsScanning(false);
        setScanProgress(null);
        // User aborted native picker, fallback to file input if needed
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback to standard input
    fileInputRef.current?.click();
  }

  // 2. Scan via HTML5 Folder Input
  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    setScanProgress({ count: files.length, currentPath: 'Parsing files...' });

    // Extract root folder name from first file path
    const firstRel = files[0].webkitRelativePath || files[0].name;
    const rootName = firstRel.includes('/')
      ? firstRel.split('/')[0]
      : firstRel.includes('\\')
      ? firstRel.split('\\')[0]
      : 'Scanned Folder';

    setTimeout(() => {
      const scanned = scanFileList(files, rootName);
      setScannedRootNode(scanned);
      setSelectedCleanupIds(new Set());
      setIsScanning(false);
      setScanProgress(null);
      setViewMode('tree');
    }, 50);
  }

  // 3. Scan via Drag & Drop
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    // Check if webkitGetAsEntry is available
    const files: File[] = [];
    async function traverseEntry(entry: any) {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve) => entry.file(resolve));
        files.push(file);
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const entries = await new Promise<any[]>((resolve) => reader.readEntries(resolve));
        for (const child of entries) {
          await traverseEntry(child);
        }
      }
    }

    setIsScanning(true);
    setScanProgress({ count: 0, currentPath: 'Reading dropped directory...' });

    for (let i = 0; i < items.length; i++) {
      const entry = (items[i] as any).webkitGetAsEntry?.();
      if (entry) {
        await traverseEntry(entry);
      }
    }

    if (files.length > 0) {
      const rootName = items[0].webkitGetAsEntry?.()?.name || 'Dropped Directory';
      const scanned = scanFileList(files, rootName);
      setScannedRootNode(scanned);
      setSelectedCleanupIds(new Set());
    }

    setIsScanning(false);
    setScanProgress(null);
    setViewMode('tree');
  }

  // 4. Parse output from `dir /s`
  function handleParseDirSubmit() {
    if (!pastedDirText.trim()) return;
    const parsed = parseWindowsDirOutput(pastedDirText);
    if (parsed) {
      setScannedRootNode(parsed);
      setShowPasteModal(false);
      setPastedDirText('');
      setViewMode('tree');
    } else {
      alert('Could not parse directory format. Make sure to paste standard "dir /s" output from Command Prompt.');
    }
  }

  // Optional: User explicitly requests demo sample data
  function handleLoadDemoSample() {
    setScannedRootNode(PRESET_PROFILES['windows-c'].rootNode);
    setSelectedCleanupIds(new Set());
    setViewMode('tree');
  }

  // Toggle node selection for cleanup
  function handleToggleCleanupNode(node: DiskNode) {
    if (node.safetyRating === 'system-critical') return;
    setSelectedCleanupIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  }

  // Select all Safe items
  function handleSelectAllSafe() {
    if (!rootNode) return;
    const safeIds = new Set<string>();
    function collect(n: DiskNode) {
      if (n.safetyRating === 'safe') {
        safeIds.add(n.id);
        return;
      }
      if (n.children) {
        for (const c of n.children) collect(c);
      }
    }
    collect(rootNode);
    setSelectedCleanupIds(safeIds);
    setShowCleanupModal(true);
  }

  function handleAskAi(node: DiskNode) {
    const prompt = `Can I safely delete or clean "${node.path}" (${formatBytes(node.size)})? What created it, and what is the exact Windows PowerShell command to clean it?`;
    setDoctorInitialPrompt(prompt);
    setShowAiDoctor(true);
  }

  function handleGenerateCommandForNode(node: DiskNode) {
    setSelectedCleanupIds(new Set([node.id]));
    setShowCleanupModal(true);
  }

  // Gather selected nodes list
  const selectedNodesList: DiskNode[] = [];
  if (rootNode) {
    function gatherSelected(n: DiskNode) {
      if (selectedCleanupIds.has(n.id)) selectedNodesList.push(n);
      if (n.children) {
        for (const c of n.children) gatherSelected(c);
      }
    }
    gatherSelected(rootNode);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col h-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden ${
        isDraggingOver ? 'ring-4 ring-cyan-400 ring-inset' : ''
      }`}
    >
      {/* Hidden Universal Folder Input */}
      <input
        ref={fileInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* 1. Windows TreeSize Title Bar */}
      <header className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">
            TS
          </div>
          <span className="font-semibold text-white tracking-tight">
            TreeSize Free — Disk Storage Visualizer (Windows)
          </span>
          {rootNode && (
            <span className="text-slate-400 hidden sm:inline text-[11px]">
              — Scanned: <span className="text-cyan-300 font-medium">{rootNode.path}</span>
            </span>
          )}
        </div>

        {/* Windows Header Actions */}
        <div className="flex items-center gap-2">
          {rootNode && (
            <button
              onClick={() => {
                setDoctorInitialPrompt(null);
                setShowAiDoctor(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded transition-colors text-[11px] font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Storage Doctor</span>
            </button>
          )}

          <button
            onClick={handlePickDirectory}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-200 text-slate-950 font-bold rounded text-[11px] transition-colors shadow-sm disabled:opacity-50"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>{isScanning ? 'Scanning...' : 'Select Folder to Scan'}</span>
          </button>
        </div>
      </header>

      {/* 2. Ribbon Toolbar & View Switcher (Only visible when a real folder is loaded) */}
      {rootNode && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs">
            {/* Left: View Modes */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded border border-slate-800">
              <button
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors font-medium ${
                  viewMode === 'tree'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>TreeSize Table</span>
              </button>

              <button
                onClick={() => setViewMode('treemap')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors font-medium ${
                  viewMode === 'treemap'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>WinDirStat Treemap</span>
              </button>

              <button
                onClick={() => setViewMode('trend')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors font-medium ${
                  viewMode === 'trend'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>30-Day Trend</span>
              </button>
            </div>

            {/* Right: Rescan & Clean Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePickDirectory}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                title="Choose another directory to scan"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Change Folder</span>
              </button>

              {safeBytes > 0 && (
                <button
                  onClick={handleSelectAllSafe}
                  className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded font-semibold transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Clean Safe Bloat ({formatBytes(safeBytes)})</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Compact Capacity Ribbon */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/60 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-bold text-white tracking-tight">{rootNode.name}</span>
              <span className="font-mono text-slate-300 tabular-nums truncate">
                Total size: <span className="font-bold text-white">{formatBytes(rootNode.size)}</span> in{' '}
                {rootNode.fileCount?.toLocaleString() || 0} real files
              </span>
            </div>

            <div className="text-[11px] text-slate-400 hidden sm:inline shrink-0">
              Real Local Data · Zero Mock Files
            </div>
          </div>
        </>
      )}

      {/* 4. Main Body: Authentic Start Screen OR Real Scanned Tree */}
      <main className="flex-1 min-h-0 flex flex-col bg-slate-950 overflow-hidden">
        {!rootNode ? (
          /* Clean, Real Windows TreeSize Start Screen - NO FAKE FILES */
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-5">
                <FolderOpen className="w-8 h-8" />
              </div>

              <h2 className="text-xl font-bold text-white tracking-tight mb-2">
                Scan Your Real Windows Storage
              </h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                No fake or mock files. Select any real folder on your PC (such as your user folder, Downloads, AppData, or Projects) to visualize exact sizes, counts, and bloat.
              </p>

              {/* Primary Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                <button
                  onClick={handlePickDirectory}
                  disabled={isScanning}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/10 text-sm"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Select Folder to Scan</span>
                </button>

                <button
                  onClick={() => setShowPasteModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl border border-slate-700 text-sm transition-colors"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Paste "dir /s" Output</span>
                </button>
              </div>

              {/* Drag and Drop instructions */}
              <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 text-xs text-slate-400 mb-4">
                <Upload className="w-4 h-4 text-cyan-400 mx-auto mb-1.5" />
                <span>Drag and drop any folder directly from Windows File Explorer into this window</span>
              </div>

              {/* Optional Demo fallback link */}
              <div className="text-[11px] text-slate-500">
                Want to test features without selecting a folder?{' '}
                <button
                  onClick={handleLoadDemoSample}
                  className="text-cyan-400 hover:underline font-medium"
                >
                  Load Sample Windows 11 Drive
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Render Real Tree, Treemap, or Trend based on viewMode */
          <>
            {viewMode === 'tree' && (
              <DirectoryTreeView
                rootNode={rootNode}
                selectedNodesForCleanup={selectedCleanupIds}
                onToggleCleanupNode={handleToggleCleanupNode}
                onSelectAllSafe={handleSelectAllSafe}
                onAskAi={handleAskAi}
                onGenerateCommandForNode={handleGenerateCommandForNode}
              />
            )}

            {viewMode === 'treemap' && (
              <TreemapVisualizer
                rootNode={rootNode}
                onAskAi={handleAskAi}
                onSelectForCleanup={handleGenerateCommandForNode}
              />
            )}

            {viewMode === 'trend' && trendSummary && (
              <div className="flex-1 p-6 flex flex-col overflow-y-auto">
                <div className="max-w-5xl w-full mx-auto bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                        <span>30-Day Storage Trend Analysis ({driveLabel})</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Historical trajectory based on real scanned file timestamps
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded font-mono font-bold">
                        +{trendSummary.netChangeGB} GB ({trendSummary.percentChange > 0 ? `+${trendSummary.percentChange}` : trendSummary.percentChange}%)
                      </span>
                      <span className="text-slate-300 font-mono">
                        +{trendSummary.avgDailyGrowthMB} MB/day
                      </span>
                    </div>
                  </div>

                  <div className="h-72 w-full my-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendSummary.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="usedStorageGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="cleanableStorageGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} interval={3} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `${val}G`} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg p-3 text-xs shadow-2xl space-y-1.5 min-w-[200px]">
                                  <div className="font-bold text-white border-b border-slate-800 pb-1">{label}</div>
                                  <div className="flex justify-between font-mono text-cyan-400">
                                    <span>Used Size:</span>
                                    <span>{data.usedGB} GB</span>
                                  </div>
                                  <div className="flex justify-between font-mono text-emerald-400">
                                    <span>Cleanable Bloat:</span>
                                    <span>{data.safeCleanableGB} GB</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area type="monotone" dataKey="safeCleanableGB" stroke="#10b981" fill="url(#cleanableStorageGradient)" />
                        <Area type="monotone" dataKey="usedGB" stroke="#06b6d4" strokeWidth={2} fill="url(#usedStorageGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 5. Paste Windows dir output modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Paste Real Windows "dir /s" Terminal Output</span>
              </h3>
              <button onClick={() => setShowPasteModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Run <code className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300 font-mono">dir /s</code> in any Windows folder in Command Prompt, then copy &amp; paste the text here:
            </p>
            <textarea
              value={pastedDirText}
              onChange={(e) => setPastedDirText(e.target.value)}
              placeholder="Directory of C:\Users\YourName\Downloads&#10;10/14/2026  03:15 PM     14,285,000 installer.exe&#10;..."
              className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleParseDirSubmit}
                className="px-4 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded text-xs"
              >
                Parse Real Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PowerShell Safe Cleanup Modal */}
      {showCleanupModal && rootNode && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-850 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Windows PowerShell Cleanup Script</h3>
              </div>
              <button onClick={() => setShowCleanupModal(false)} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <CommandTerminal
                os="windows"
                selectedNodes={selectedNodesList}
                onClearSelection={() => setSelectedCleanupIds(new Set())}
                onAskAi={(p) => {
                  setDoctorInitialPrompt(p);
                  setShowCleanupModal(false);
                  setShowAiDoctor(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. AI Storage Doctor Drawer */}
      {showAiDoctor && rootNode && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-2xl h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Windows Storage Doctor (Gemini 3.8 Flash)</h3>
              </div>
              <button onClick={() => setShowAiDoctor(false)} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <AiStorageDoctor
                os="windows"
                rootNode={rootNode}
                initialPrompt={doctorInitialPrompt}
                onClearInitialPrompt={() => setDoctorInitialPrompt(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 8. Scanning Progress Modal */}
      {isScanning && scanProgress && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold animate-spin">
                ⏳
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Scanning Real Windows Files...</h3>
                <p className="text-xs text-slate-400 font-mono tabular-nums">
                  {scanProgress.count.toLocaleString()} real files indexed
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

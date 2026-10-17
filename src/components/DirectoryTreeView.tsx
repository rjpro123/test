import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Search,
  Copy,
  Check,
  Terminal,
  ArrowUpDown,
  Layers,
  Minimize2,
  Maximize2,
  FolderTree,
} from 'lucide-react';
import { DiskNode, SafetyRating } from '../types/disk';
import { formatBytes, formatPercentage, CATEGORY_COLORS, SAFETY_CONFIG } from '../utils/formatters';

interface DirectoryTreeViewProps {
  rootNode: DiskNode;
  selectedNodesForCleanup: Set<string>;
  onToggleCleanupNode: (node: DiskNode) => void;
  onSelectAllSafe: () => void;
  onAskAi: (node: DiskNode) => void;
  onGenerateCommandForNode: (node: DiskNode) => void;
}

export const DirectoryTreeView: React.FC<DirectoryTreeViewProps> = ({
  rootNode,
  selectedNodesForCleanup,
  onToggleCleanupNode,
  onSelectAllSafe,
  onAskAi,
  onGenerateCommandForNode,
}) => {
  // Pre-expand root and level 1 by default
  const initialExpanded = useMemo(() => {
    const set = new Set<string>([rootNode.id]);
    if (rootNode.children) {
      for (const child of rootNode.children) {
        set.add(child.id);
      }
    }
    return set;
  }, [rootNode]);

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(initialExpanded);
  const [selectedRowNode, setSelectedRowNode] = useState<DiskNode | null>(rootNode);
  const [searchQuery, setSearchQuery] = useState('');
  const [minSizeFilter, setMinSizeFilter] = useState<number>(0);
  const [safetyFilter, setSafetyFilter] = useState<SafetyRating | 'all'>('all');
  const [unitMode, setUnitMode] = useState<'auto' | 'gb' | 'mb' | 'percent'>('auto');
  const [sortBy, setSortBy] = useState<'size' | 'name' | 'files'>('size');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Toggle node expand/collapse
  function toggleExpand(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // TreeSize Quick Expand to Level X
  function expandToLevel(targetLevel: number) {
    const newExpanded = new Set<string>();

    function traverse(node: DiskNode, currentLevel: number) {
      if (currentLevel <= targetLevel) {
        newExpanded.add(node.id);
        if (node.children) {
          for (const c of node.children) {
            traverse(c, currentLevel + 1);
          }
        }
      }
    }

    traverse(rootNode, 1);
    setExpandedNodes(newExpanded);
  }

  function collapseAll() {
    setExpandedNodes(new Set([rootNode.id]));
  }

  function expandAll() {
    const all = new Set<string>();
    function collect(n: DiskNode) {
      all.add(n.id);
      if (n.children) {
        for (const c of n.children) collect(c);
      }
    }
    collect(rootNode);
    setExpandedNodes(all);
  }

  function handleCopyPath(path: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  }

  // Format size according to TreeSize unit mode
  function formatSizeWithUnit(bytes: number, parentSize: number): string {
    if (unitMode === 'gb') {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (unitMode === 'mb') {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (unitMode === 'percent') {
      return formatPercentage(bytes, parentSize);
    }
    return formatBytes(bytes);
  }

  // Recursive tree row renderer
  function renderTreeRows(node: DiskNode, depth = 0, parentSize = rootNode.size): React.ReactNode {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.isDirectory && node.children && node.children.length > 0;
    const isCheckedForCleanup = selectedNodesForCleanup.has(node.id);
    const isRowSelected = selectedRowNode?.id === node.id;
    const isCritical = node.safetyRating === 'system-critical';

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSelf = node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q);
      const matchesChild = node.children?.some(
        (c) => c.name.toLowerCase().includes(q) || c.path.toLowerCase().includes(q)
      );
      if (!matchesSelf && !matchesChild) return null;
    }

    // Min size filter
    if (minSizeFilter > 0 && node.size < minSizeFilter) {
      return null;
    }

    // Safety filter
    if (safetyFilter !== 'all' && node.safetyRating !== safetyFilter) {
      return null;
    }

    // Proportional percentage of parent (Iconic TreeSize bar calculation)
    const pctOfParent = parentSize > 0 ? Math.min(100, (node.size / parentSize) * 100) : 0;
    const pctOfRoot = rootNode.size > 0 ? Math.min(100, (node.size / rootNode.size) * 100) : 0;
    const categoryHex = CATEGORY_COLORS[node.category]?.hex || '#06b6d4';

    // Sort children
    let sortedChildren = node.children ? [...node.children] : [];
    if (sortBy === 'size') {
      sortedChildren.sort((a, b) => b.size - a.size); // Key Guideline 1: sorted largest to smallest
    } else if (sortBy === 'name') {
      sortedChildren.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'files') {
      sortedChildren.sort((a, b) => (b.fileCount || 0) - (a.fileCount || 0));
    }

    return (
      <React.Fragment key={node.id}>
        <div
          onClick={() => setSelectedRowNode(node)}
          className={`group flex items-center justify-between px-3 py-1.5 text-xs border-b border-slate-900/80 cursor-pointer transition-colors ${
            isRowSelected
              ? 'bg-cyan-950/40 text-white border-cyan-500/30'
              : isCheckedForCleanup
              ? 'bg-emerald-950/20 text-slate-200'
              : 'hover:bg-slate-900/70 text-slate-300'
          }`}
        >
          {/* Column 1: Tree Folder Name with +/- and Indent */}
          <div
            className="flex items-center gap-1.5 min-w-0 flex-1"
            style={{ paddingLeft: `${depth * 18}px` }}
          >
            {/* Checkbox for batch cleanup */}
            {!isCritical ? (
              <input
                type="checkbox"
                checked={isCheckedForCleanup}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleCleanupNode(node);
                }}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer shrink-0 mr-1"
              />
            ) : (
              <div className="w-4 shrink-0" />
            )}

            {/* TreeSize Style Expand/Collapse Toggle */}
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(node.id, e)}
                className="w-4 h-4 flex items-center justify-center rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors shrink-0"
              >
                {isExpanded ? (
                  <span className="font-bold text-[10px] leading-none">−</span>
                ) : (
                  <span className="font-bold text-[10px] leading-none">+</span>
                )}
              </button>
            ) : (
              <div className="w-4 shrink-0" />
            )}

            {/* Folder / File Icon */}
            <div className="shrink-0 text-cyan-400">
              {node.isDirectory ? (
                isExpanded ? (
                  <FolderOpen className="w-3.5 h-3.5" />
                ) : (
                  <Folder className="w-3.5 h-3.5" />
                )
              ) : (
                <File className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>

            {/* Folder Name */}
            <span className="font-medium truncate select-text text-slate-200">
              {node.name}
            </span>
          </div>

          {/* Column 2: TreeSize Iconic Proportional Gradient Bar & Size */}
          <div className="w-56 shrink-0 flex items-center gap-2 justify-end px-2">
            {/* Proportional visual bar */}
            <div className="w-24 h-2 bg-slate-900 rounded-sm overflow-hidden border border-slate-800 hidden sm:block relative">
              <div
                style={{
                  width: `${pctOfParent}%`,
                  backgroundColor: categoryHex,
                }}
                className="h-full rounded-sm transition-all"
              />
            </div>

            {/* Size value with tabular nums */}
            <div className="text-right w-24">
              <span className="font-mono font-bold text-slate-100 tabular-nums">
                {formatSizeWithUnit(node.size, parentSize)}
              </span>
            </div>
          </div>

          {/* Column 3: % of Parent */}
          <div className="w-16 text-right font-mono text-slate-400 tabular-nums hidden sm:block shrink-0 px-2">
            {pctOfParent.toFixed(1)}%
          </div>

          {/* Column 4: Files Count */}
          <div className="w-20 text-right font-mono text-slate-400 tabular-nums hidden md:block shrink-0 px-2">
            {node.fileCount !== undefined ? node.fileCount.toLocaleString() : '-'}
          </div>

          {/* Column 5: Safety Status Badge */}
          <div className="w-32 text-center shrink-0 hidden lg:block px-1">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                SAFETY_CONFIG[node.safetyRating]?.border
              } ${SAFETY_CONFIG[node.safetyRating]?.text} ${SAFETY_CONFIG[node.safetyRating]?.bg}`}
            >
              {node.safetyRating === 'safe' && <ShieldCheck className="w-3 h-3" />}
              {node.safetyRating === 'caution' && <AlertTriangle className="w-3 h-3" />}
              {node.safetyRating === 'system-critical' && <ShieldAlert className="w-3 h-3" />}
              <span className="truncate">{SAFETY_CONFIG[node.safetyRating]?.label}</span>
            </span>
          </div>

          {/* Column 6: Quick Actions */}
          <div className="w-20 flex items-center justify-end gap-1 shrink-0">
            <button
              onClick={(e) => handleCopyPath(node.path, e)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
              title="Copy full path"
            >
              {copiedPath === node.path ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onAskAi(node);
              }}
              className="p-1 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 rounded"
              title="Ask AI about this folder"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
            </button>

            {!isCritical && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateCommandForNode(node);
                }}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                title="Generate cleanup command"
              >
                <Terminal className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Render child rows if expanded */}
        {isExpanded &&
          hasChildren &&
          sortedChildren.map((child) => renderTreeRows(child, depth + 1, node.size))}
      </React.Fragment>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-xs">
      {/* TreeSize Ribbon Toolbar (Level Expansion, Sorting, Units, Filter) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800 select-none">
        {/* Left: Expand Depth Buttons (TreeSize signature) */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1 font-medium">
            <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
            <span>Expand:</span>
          </span>
          <button
            onClick={() => expandToLevel(1)}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition-colors"
            title="Expand Level 1"
          >
            Level 1
          </button>
          <button
            onClick={() => expandToLevel(2)}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition-colors"
            title="Expand Level 2"
          >
            Level 2
          </button>
          <button
            onClick={() => expandToLevel(3)}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition-colors"
            title="Expand Level 3"
          >
            Level 3
          </button>
          <button
            onClick={expandAll}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition-colors"
            title="Expand Full Tree"
          >
            All
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded transition-colors"
            title="Collapse Tree"
          >
            Collapse
          </button>
        </div>

        {/* Center / Right: Units, Sort, Search Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Unit Switcher (TreeSize signature) */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400 hidden md:inline">Unit:</span>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded overflow-hidden">
              <button
                onClick={() => setUnitMode('auto')}
                className={`px-2 py-0.5 text-[11px] ${
                  unitMode === 'auto' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400'
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => setUnitMode('gb')}
                className={`px-2 py-0.5 text-[11px] ${
                  unitMode === 'gb' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400'
                }`}
              >
                GB
              </button>
              <button
                onClick={() => setUnitMode('mb')}
                className={`px-2 py-0.5 text-[11px] ${
                  unitMode === 'mb' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400'
                }`}
              >
                MB
              </button>
              <button
                onClick={() => setUnitMode('percent')}
                className={`px-2 py-0.5 text-[11px] ${
                  unitMode === 'percent' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400'
                }`}
              >
                %
              </button>
            </div>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-0.5 text-xs focus:outline-none"
            >
              <option value="size">Size (Largest first)</option>
              <option value="name">Name (A-Z)</option>
              <option value="files">File count</option>
            </select>
          </div>

          {/* Quick Filter Search Input */}
          <div className="relative min-w-[140px] max-w-[200px]">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter..."
              className="w-full bg-slate-950 border border-slate-800 rounded pl-7 pr-2 py-0.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Select all Safe button */}
          <button
            onClick={onSelectAllSafe}
            className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded transition-colors font-medium"
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Select Safe</span>
          </button>
        </div>
      </div>

      {/* TreeSize Column Headers */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 select-none text-[11px]">
        <div className="flex items-center gap-2 flex-1">
          <span className="ml-10">Name (Directory Structure)</span>
        </div>
        <div className="w-56 text-right pr-2">Size &amp; Visual Bar</div>
        <div className="w-16 text-right px-2 hidden sm:block">% Parent</div>
        <div className="w-20 text-right px-2 hidden md:block">Files</div>
        <div className="w-32 text-center px-1 hidden lg:block">Safety Assessment</div>
        <div className="w-20 text-right">Actions</div>
      </div>

      {/* Tree Rows List Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-900/40">
        {renderTreeRows(rootNode)}
      </div>

      {/* TreeSize Bottom Status Dock */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-900/95 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-slate-400 shrink-0 font-medium">Selected:</span>
          {selectedRowNode ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-cyan-300 font-semibold truncate">
                {selectedRowNode.path}
              </span>
              <span className="font-mono text-white font-bold tabular-nums shrink-0">
                ({formatBytes(selectedRowNode.size)})
              </span>
              {selectedRowNode.safetyReason && (
                <span className="text-[11px] text-slate-400 hidden xl:inline truncate">
                  — {selectedRowNode.safetyReason}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-500">None</span>
          )}
        </div>

        {selectedRowNode && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleCopyPath(selectedRowNode.path)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
            >
              {copiedPath === selectedRowNode.path ? 'Path Copied' : 'Copy Path'}
            </button>

            <button
              onClick={() => onAskAi(selectedRowNode)}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded text-[11px] transition-colors font-medium"
            >
              <Sparkles className="w-3 h-3" />
              <span>Ask AI</span>
            </button>

            {selectedRowNode.safetyRating !== 'system-critical' && (
              <button
                onClick={() => onGenerateCommandForNode(selectedRowNode)}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] transition-colors"
              >
                <Terminal className="w-3 h-3" />
                <span>Clean Command</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

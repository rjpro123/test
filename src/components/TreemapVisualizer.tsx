import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronRight, Folder, File, ShieldCheck, AlertTriangle, ShieldAlert, Sparkles, Terminal, CornerUpLeft } from 'lucide-react';
import { DiskNode, StorageCategory } from '../types/disk';
import { formatBytes, formatPercentage, CATEGORY_COLORS, SAFETY_CONFIG } from '../utils/formatters';
import { layoutSquarifiedTreemap, TreemapTile } from '../utils/treemapLayout';

interface TreemapVisualizerProps {
  rootNode: DiskNode;
  onAskAi: (node: DiskNode) => void;
  onSelectForCleanup: (node: DiskNode) => void;
}

export const TreemapVisualizer: React.FC<TreemapVisualizerProps> = ({
  rootNode,
  onAskAi,
  onSelectForCleanup,
}) => {
  // Navigation stack for drill-down
  const [navStack, setNavStack] = useState<DiskNode[]>([rootNode]);
  const [selectedNode, setSelectedNode] = useState<DiskNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<DiskNode | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<StorageCategory | 'all'>('all');

  // Container dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 460 });

  // Update container size on resize
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current;
        setDimensions({
          width: Math.max(300, clientWidth),
          height: 480,
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Current node in navigation
  const currentNode = navStack[navStack.length - 1] || rootNode;

  // Filter children based on category if needed
  const displayChildren = useMemo(() => {
    if (!currentNode.children || currentNode.children.length === 0) {
      return [currentNode];
    }
    if (activeCategoryFilter === 'all') {
      return currentNode.children;
    }
    const filtered = currentNode.children.filter((c) => c.category === activeCategoryFilter);
    return filtered.length > 0 ? filtered : currentNode.children;
  }, [currentNode, activeCategoryFilter]);

  // Compute treemap layout
  const tiles: TreemapTile[] = useMemo(() => {
    return layoutSquarifiedTreemap(displayChildren, dimensions.width, dimensions.height, 2);
  }, [displayChildren, dimensions]);

  // Handle drill down into a folder
  function handleTileClick(node: DiskNode) {
    setSelectedNode(node);
    if (node.isDirectory && node.children && node.children.length > 0) {
      setNavStack((prev) => [...prev, node]);
    }
  }

  // Handle navigating up
  function handleNavigateUp() {
    if (navStack.length > 1) {
      setNavStack((prev) => prev.slice(0, prev.length - 1));
    }
  }

  function handleBreadcrumbClick(index: number) {
    setNavStack((prev) => prev.slice(0, index + 1));
  }

  // Safety icon
  function renderSafetyIcon(rating: string) {
    if (rating === 'safe') return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
    if (rating === 'caution') return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Visualizer Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-900/60 border-b border-slate-800">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1 max-w-full">
          {navStack.length > 1 && (
            <button
              onClick={handleNavigateUp}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded transition-colors mr-1 shrink-0"
              title="Go to parent directory"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
              <span>Up</span>
            </button>
          )}

          {navStack.map((node, index) => {
            const isLast = index === navStack.length - 1;
            return (
              <React.Fragment key={node.id}>
                {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className={`px-2 py-1 rounded text-xs transition-colors shrink-0 whitespace-nowrap ${
                    isLast
                      ? 'bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {node.name}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Category Filter Controls */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="text-xs text-slate-500 mr-1 hidden sm:inline">Highlight:</span>
          {(['all', 'developer', 'caches', 'media', 'archives', 'system'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-2.5 py-1 text-xs rounded transition-colors capitalize whitespace-nowrap shrink-0 ${
                activeCategoryFilter === cat
                  ? 'bg-slate-800 text-white font-medium border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Treemap Canvas Container */}
      <div className="p-6 flex-1 flex flex-col min-h-0">
        <div
          ref={containerRef}
          className="relative w-full h-[480px] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden select-none"
        >
          {tiles.map((tile) => {
            const node = tile.node;
            const isHovered = hoveredNode?.id === node.id;
            const isSelected = selectedNode?.id === node.id;
            const categoryHex = CATEGORY_COLORS[node.category]?.hex || '#64748b';

            // Show text only if tile is big enough
            const showTitle = tile.width > 55 && tile.height > 28;
            const showSub = tile.width > 80 && tile.height > 44;

            return (
              <div
                key={node.id}
                onClick={() => handleTileClick(node)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{
                  left: `${tile.x}px`,
                  top: `${tile.y}px`,
                  width: `${tile.width}px`,
                  height: `${tile.height}px`,
                  backgroundColor: `${categoryHex}22`,
                  borderColor: isSelected
                    ? '#38bdf8'
                    : isHovered
                    ? '#ffffff'
                    : `${categoryHex}55`,
                }}
                className={`absolute rounded transition-all duration-100 cursor-pointer border flex flex-col justify-between p-2 overflow-hidden ${
                  isSelected ? 'ring-2 ring-cyan-400 z-10' : ''
                } ${isHovered ? 'z-10 shadow-lg' : ''}`}
              >
                {/* Top Label */}
                {showTitle && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    {node.isDirectory ? (
                      <Folder className="w-3 h-3 text-slate-300 shrink-0" />
                    ) : (
                      <File className="w-3 h-3 text-slate-300 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-slate-200 truncate">
                      {node.name}
                    </span>
                  </div>
                )}

                {/* Bottom Metric */}
                {showSub && (
                  <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-300 mt-auto pt-1">
                    <span className="font-semibold">{formatBytes(node.size)}</span>
                    <span className="text-slate-400">
                      {formatPercentage(node.size, currentNode.size)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Hover Tooltip Overlay */}
          {hoveredNode && (
            <div className="pointer-events-none absolute bottom-3 left-3 bg-slate-900/95 backdrop-blur border border-slate-700 text-slate-200 px-3 py-2 rounded-lg shadow-xl text-xs z-20 max-w-sm">
              <div className="flex items-center gap-2 mb-1">
                {renderSafetyIcon(hoveredNode.safetyRating)}
                <span className="font-semibold text-white truncate">{hoveredNode.name}</span>
                <span className="font-mono tabular-nums text-cyan-300 font-bold ml-auto">
                  {formatBytes(hoveredNode.size)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono break-all line-clamp-1">
                {hoveredNode.path}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                <span className="capitalize">{hoveredNode.category}</span>
                <span aria-hidden="true">·</span>
                <span>{hoveredNode.isDirectory ? 'Directory' : 'File'}</span>
                {hoveredNode.fileCount !== undefined && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{hoveredNode.fileCount.toLocaleString()} files</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="mt-4 p-4 bg-slate-900/90 rounded-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
                {selectedNode.isDirectory ? (
                  <Folder className="w-5 h-5 text-cyan-400" />
                ) : (
                  <File className="w-5 h-5 text-purple-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate">{selectedNode.name}</h3>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                      SAFETY_CONFIG[selectedNode.safetyRating]?.border
                    } ${SAFETY_CONFIG[selectedNode.safetyRating]?.text} ${
                      SAFETY_CONFIG[selectedNode.safetyRating]?.bg
                    }`}
                  >
                    {SAFETY_CONFIG[selectedNode.safetyRating]?.label}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400 truncate mt-0.5">
                  {selectedNode.path}
                </div>
                {selectedNode.safetyReason && (
                  <p className="text-xs text-slate-300 mt-1">{selectedNode.safetyReason}</p>
                )}
              </div>
            </div>

            {/* Actions for Selected Node */}
            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
              <div className="text-right mr-2">
                <div className="text-base font-bold font-mono text-white tabular-nums">
                  {formatBytes(selectedNode.size)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                  {formatPercentage(selectedNode.size, rootNode.size)} of drive
                </div>
              </div>

              <button
                onClick={() => onAskAi(selectedNode)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask AI</span>
              </button>

              {selectedNode.safetyRating !== 'system-critical' && (
                <button
                  onClick={() => onSelectForCleanup(selectedNode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Cleanup Script</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

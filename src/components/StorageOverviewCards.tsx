import React, { useState, useMemo } from 'react';
import {
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  Monitor,
  Apple,
  Terminal as TerminalIcon,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { OperatingSystem, DiskNode } from '../types/disk';
import { formatBytes, formatPercentage } from '../utils/formatters';
import { generate30DayTrend } from '../utils/trendData';

interface StorageOverviewCardsProps {
  os: OperatingSystem;
  onSelectOs: (os: OperatingSystem) => void;
  driveLabel: string;
  totalCapacity: number;
  freeSpace: number;
  rootNode: DiskNode;
  isCustomScan: boolean;
  onOpenCleanupPlan: () => void;
}

export const StorageOverviewCards: React.FC<StorageOverviewCardsProps> = ({
  os,
  onSelectOs,
  driveLabel,
  totalCapacity,
  freeSpace,
  rootNode,
  isCustomScan,
  onOpenCleanupPlan,
}) => {
  const [showTrendChart, setShowTrendChart] = useState<boolean>(false);
  const usedSpace = rootNode.size;
  const usedPercentage = Math.min(100, (usedSpace / totalCapacity) * 100);

  // Calculate safe reclaimable vs caution vs critical
  let safeBytes = 0;
  let cautionBytes = 0;
  let criticalBytes = 0;

  function tally(node: DiskNode) {
    if (node.safetyRating === 'safe') {
      safeBytes += node.size;
      return;
    }
    if (node.safetyRating === 'system-critical') {
      criticalBytes += node.size;
    } else {
      cautionBytes += node.size;
    }
    if (node.children) {
      for (const child of node.children) {
        tally(child);
      }
    }
  }
  tally(rootNode);

  // Generate 30-Day Trend Data via helper
  const trendSummary = useMemo(() => {
    return generate30DayTrend(usedSpace, totalCapacity, safeBytes, os, driveLabel);
  }, [usedSpace, totalCapacity, safeBytes, os, driveLabel]);

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-xs select-none">
      {/* TreeSize Compact Drive Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-900/90">
        {/* Drive Info & Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded border border-slate-800">
            <button
              onClick={() => onSelectOs('windows')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                os === 'windows' && !isCustomScan
                  ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Windows C: Drive Preset"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Drive C:</span>
            </button>
            <button
              onClick={() => onSelectOs('macos')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                os === 'macos' && !isCustomScan
                  ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="macOS Macintosh HD"
            >
              <Apple className="w-3.5 h-3.5" />
              <span>macOS</span>
            </button>
            <button
              onClick={() => onSelectOs('linux')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                os === 'linux' && !isCustomScan
                  ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Linux / rootfs"
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Linux</span>
            </button>
          </div>

          {/* Drive Label & Capacity text */}
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-bold text-white tracking-tight">{driveLabel}</span>
            <span className="text-slate-400 font-mono tabular-nums">
              {formatBytes(usedSpace)} / {formatBytes(totalCapacity)} ({usedPercentage.toFixed(1)}%)
            </span>
          </div>

          {/* Compact Drive Fill Bar */}
          <div className="w-28 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 hidden sm:block">
            <div
              style={{ width: `${usedPercentage}%` }}
              className={`h-full transition-all duration-300 ${
                usedPercentage > 85 ? 'bg-rose-500' : 'bg-cyan-400'
              }`}
            />
          </div>
        </div>

        {/* Right Stats & Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Free Space */}
          <div className="hidden md:flex items-center gap-1.5 text-slate-400">
            <span>Free:</span>
            <span className="font-mono text-slate-200 font-medium tabular-nums">
              {formatBytes(freeSpace)}
            </span>
          </div>

          {/* Safe Reclaimable Badge */}
          <button
            onClick={onOpenCleanupPlan}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-300 transition-colors font-medium"
            title="Generate cleanup script for safe bloat"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Safe to clean: {formatBytes(safeBytes)}</span>
            <Zap className="w-3 h-3 ml-0.5 text-emerald-400" />
          </button>

          {/* 30-Day Trend Chart Drawer Toggle */}
          <button
            onClick={() => setShowTrendChart(!showTrendChart)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
              showTrendChart
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>30-Day Trend</span>
            {showTrendChart ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expandable 30-Day Trend Chart Drawer (TreeSize style collapsible analysis) */}
      {showTrendChart && (
        <div className="p-4 bg-slate-950 border-t border-slate-800 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>30-Day Historical Storage Trend</span>
              </span>
              <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                +{trendSummary.netChangeGB} GB ({trendSummary.percentChange > 0 ? `+${trendSummary.percentChange}` : trendSummary.percentChange}%)
              </span>
              <span className="text-slate-400">
                Avg: <span className="font-mono text-slate-200">+{trendSummary.avgDailyGrowthMB} MB/day</span>
              </span>
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                <span>Used Disk</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                <span>Cleanable Bloat</span>
              </span>
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendSummary.data}
                margin={{ top: 8, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="usedStorageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="cleanableStorageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />

                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  interval={4}
                />

                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(val) => `${val}G`}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg p-2.5 text-xs shadow-xl space-y-1 min-w-[200px]">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                            <span className="font-semibold text-white">{label}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Day {data.day}/30</span>
                          </div>
                          <div className="flex items-center justify-between font-mono tabular-nums">
                            <span className="text-cyan-400">Used Storage:</span>
                            <span className="font-bold text-white">{data.usedGB} GB</span>
                          </div>
                          <div className="flex items-center justify-between font-mono tabular-nums">
                            <span className="text-emerald-400">Cleanable Bloat:</span>
                            <span className="text-emerald-300 font-medium">~{data.safeCleanableGB} GB</span>
                          </div>
                          {data.event && (
                            <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] text-amber-300 flex items-start gap-1">
                              <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                              <span>{data.event}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="safeCleanableGB"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#cleanableStorageGradient)"
                  name="Cleanable Bloat"
                />

                <Area
                  type="monotone"
                  dataKey="usedGB"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#usedStorageGradient)"
                  name="Used Space"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

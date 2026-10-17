/**
 * Formats byte values into standard human-readable units (GB, MB, KB, bytes)
 * strictly following Key Guideline 2: Always present sizes clearly.
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '-' + formatBytes(-bytes, decimals);

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unitIndex = Math.min(i, sizes.length - 1);

  const value = parseFloat((bytes / Math.pow(k, unitIndex)).toFixed(dm));
  return `${value.toLocaleString('en-US', { minimumFractionDigits: dm, maximumFractionDigits: dm })} ${sizes[unitIndex]}`;
}

/**
 * Returns numeric value and unit separately for tabular layouts
 */
export function splitBytes(bytes: number, decimals: number = 2): { value: string; unit: string } {
  if (bytes === 0) return { value: '0', unit: 'B' };

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const value = (bytes / Math.pow(k, i)).toFixed(decimals);

  return { value, unit: sizes[i] };
}

/**
 * Formats a fraction as a percentage string
 */
export function formatPercentage(part: number, total: number): string {
  if (total <= 0) return '0%';
  const pct = (part / total) * 100;
  if (pct < 0.1 && pct > 0) return '< 0.1%';
  return `${pct.toFixed(1)}%`;
}

/**
 * Category color mappings for visualizer & treemaps
 */
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; hex: string }> = {
  developer: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', hex: '#10b981' },
  caches: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', hex: '#f59e0b' },
  media: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', hex: '#a855f7' },
  archives: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', hex: '#f43f5e' },
  system: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', hex: '#3b82f6' },
  games: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30', hex: '#6366f1' },
  logs: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', hex: '#f97316' },
  documents: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', hex: '#06b6d4' },
  other: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', hex: '#64748b' },
};

export const SAFETY_CONFIG: Record<string, { label: string; text: string; border: string; bg: string }> = {
  safe: {
    label: 'Safe to Clean',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
  },
  caution: {
    label: 'Review Carefully',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
  },
  'system-critical': {
    label: 'Protected (OS Core)',
    text: 'text-rose-400',
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/10',
  },
};
